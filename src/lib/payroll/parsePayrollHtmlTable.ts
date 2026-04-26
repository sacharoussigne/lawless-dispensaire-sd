import { load } from 'cheerio';
import { payrollReportResultSchema, type PayrollReportResult } from './schema';

export const PAYROLL_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

export type PayrollDay = (typeof PAYROLL_DAYS)[number];

export function cleanText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEmployeeCell(text: string): { name: string | null; role: string | null; id: number | null } {
  const normalized = cleanText(text.replace(/\r?\n/g, ' '));
  const nameMatch = normalized.match(
    /^(.+?)\s*(Médecin|Apprenti|Infirmière|Infirmier|Directeur|Co-Directeur|Co-Directrice)/i,
  );
  const idMatch = normalized.match(/\((\d+)\)/);

  return {
    name: nameMatch ? cleanText(nameMatch[1]) : null,
    role: nameMatch ? nameMatch[2] : null,
    id: idMatch ? Number(idMatch[1]) : null,
  };
}

function parseSchedule(rawCells: string[]): {
  schedule: Record<PayrollDay, { caisse: string | null; presence: string | null }>;
  caisseCount: number;
  presenceCount: number;
} {
  const schedule = {} as Record<PayrollDay, { caisse: string | null; presence: string | null }>;
  let caisseCount = 0;
  let presenceCount = 0;

  for (let i = 0; i < 7; i++) {
    const caisse = cleanText(rawCells[i * 2] ?? '').toUpperCase();
    const presence = cleanText(rawCells[i * 2 + 1] ?? '').toUpperCase();

    const caisseVal = caisse.includes('X') ? 'X' : null;
    const presenceVal = presence.includes('P') ? 'P' : null;

    if (caisseVal) caisseCount++;
    if (presenceVal) presenceCount++;

    schedule[PAYROLL_DAYS[i]] = {
      caisse: caisseVal,
      presence: presenceVal,
    };
  }

  return { schedule, caisseCount, presenceCount };
}

function parseStatsRow(cells: string[]): {
  sherifs: number | null;
  palefreniers: number | null;
  patients_soignes: number | null;
} {
  let sherifs: number | null = null;
  let palefreniers: number | null = null;
  let patients_soignes: number | null = null;

  const texts = cells.map((c) => cleanText(c));

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].toLowerCase();
    if (t.includes('shérif') || t.includes('sherif')) {
      const next = texts[i + 1];
      if (next) {
        const val = parseInt(next.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(val)) sherifs = val;
      }
    }

    if (t.includes('palefren')) {
      const next = texts[i + 1];
      if (next) {
        const val = parseInt(next.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(val)) palefreniers = val;
      }
    }

    const patientsLabel = t.includes('patient') && (t.includes('soign') || t.includes('soigné') || t.includes('soigne'));
    if (patientsLabel) {
      const next = texts[i + 1];
      if (next) {
        const val = parseInt(next.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(val)) patients_soignes = val;
      }
    }
  }

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].trim();
    if (/^\d+$/.test(t)) {
      const val = parseInt(t, 10);
      const prev = texts[i - 1]?.toLowerCase() ?? '';
      if (prev.includes('palefren') && palefreniers === null && !Number.isNaN(val)) {
        palefreniers = val;
      }
      if ((prev.includes('shérif') || prev.includes('sherif')) && sherifs === null && !Number.isNaN(val)) {
        sherifs = val;
      }
      if (prev.includes('patient') && (prev.includes('soign') || prev.includes('soigné') || prev.includes('soigne'))) {
        if (patients_soignes === null && !Number.isNaN(val)) {
          patients_soignes = val;
        }
      }
    }
  }

  return { sherifs, palefreniers, patients_soignes };
}

export type ParsedPayrollTable = {
  employees: Array<{
    name: string | null;
    role: string | null;
    id: number | null;
    schedule: Record<PayrollDay, { caisse: string | null; presence: string | null }>;
    stats: {
      sherifs: number | null;
      palefreniers: number | null;
      patients_soignes: number | null;
      nombre_caisses: number;
      nombre_presences: number;
    };
  }>;
  global_stats: {
    total_employees: number;
    total_caisses: number;
    total_sherifs: number;
    total_palefreniers: number;
  };
};

export function parsePayrollHtmlTable(html: string): ParsedPayrollTable {
  const $ = load(html);
  const rows = $('table tr');

  const employees: ParsedPayrollTable['employees'] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = $(rows[i]).find('td');

    if (cells.length < 2) continue;

    const firstCellText = cleanText($(cells[0]).text());

    if (firstCellText.match(/(Médecin|Apprenti|Infirmière|Infirmier|Directeur|Co-Directeur|Co-Directrice)/i)) {
      const employeeInfo = parseEmployeeCell(firstCellText);

      const rawCells: string[] = [];
      for (let j = 1; j < cells.length; j++) {
        rawCells.push($(cells[j]).text());
      }

      const { schedule, caisseCount, presenceCount } = parseSchedule(rawCells);

      const nextRow = $(rows[i + 1]);
      const statCells = nextRow
        .find('td')
        .map((_, el) => $(el).text())
        .get() as string[];
      const statsParsed = parseStatsRow(statCells);

      employees.push({
        ...employeeInfo,
        schedule,
        stats: {
          sherifs: statsParsed.sherifs,
          palefreniers: statsParsed.palefreniers,
          patients_soignes: statsParsed.patients_soignes,
          nombre_caisses: caisseCount,
          nombre_presences: presenceCount,
        },
      });

      i++;
    }
  }

  const global_stats = {
    total_employees: employees.length,
    total_caisses: employees.reduce((sum, e) => sum + e.stats.nombre_caisses, 0),
    total_sherifs: employees.reduce((sum, e) => sum + (e.stats.sherifs ?? 0), 0),
    total_palefreniers: employees.reduce((sum, e) => sum + (e.stats.palefreniers ?? 0), 0),
  };

  return { employees, global_stats };
}

export function parsedToPayrollReportResult(parsed: ParsedPayrollTable): PayrollReportResult {
  const employees = parsed.employees.map((e) => ({
    name: cleanText(e.name ?? ''),
    role: cleanText(e.role ?? ''),
    id: e.id,
    schedule: e.schedule,
    stats: {
      sherifs: e.stats.sherifs,
      palefreniers: e.stats.palefreniers,
      nombre_caisses: e.stats.nombre_caisses,
      nombre_presences: e.stats.nombre_presences,
      patients_soignes: e.stats.patients_soignes ?? 0,
      poppy_milk_offertes: 0,
      infusions_ginseng_offertes: 0,
    },
  }));

  return payrollReportResultSchema.parse({
    employees,
    global_stats: parsed.global_stats,
  });
}
