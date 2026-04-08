import OpenAI from 'openai';
import { payrollReportResultSchema, type PayrollReportResult } from './schema';
import type { ParsedPayrollTable } from './parsePayrollHtmlTable';

const USER_PROMPT = `Tu reçois le JSON produit par un parseur automatique d'un tableau HTML (planning dispensaire : employés, caisse X / présence P par jour, stats shérifs / palefreniers).

Tâche : valider, corriger les incohérences mineures si nécessaire, compléter les champs manquants avec null, et retourner UNIQUEMENT un JSON valide selon le schéma attendu. Ne pas inventer de noms, IDs ou données non présentes dans l'entrée.

Schéma de sortie :
- employees[] : name, role, id (nombre ou null), schedule pour chaque jour (lundi → dimanche) avec caisse "X" ou null, presence "P" ou null
- stats par employé : sherifs, palefreniers (nombres ou null), nombre_caisses, nombre_presences
- global_stats : total_employees, total_caisses, total_sherifs

Réponds par un seul objet JSON, sans markdown ni texte autour.`;

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) {
    return JSON.parse(fence[1].trim());
  }
  return JSON.parse(trimmed);
}

export async function refinePayrollReportWithGpt(parsed: ParsedPayrollTable): Promise<PayrollReportResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const content = `${USER_PROMPT}

JSON en entrée :
${JSON.stringify(parsed)}`;

  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
  });

  const text = res.choices[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenAI');
  }

  const out = parseJsonContent(text);
  return payrollReportResultSchema.parse(out);
}
