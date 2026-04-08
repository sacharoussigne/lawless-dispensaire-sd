import OpenAI from 'openai';
import { payrollReportResultSchema, type PayrollReportResult } from './schema';

const SYSTEM_PROMPT = `Tu dois analyser un tableau de planning médical.

Le tableau est structuré ainsi :

1. Chaque ligne principale correspond à une personne avec :
   - Nom complet
   - Rôle (Médecin ou Infirmière)
   - Identifiant entre parenthèses

2. Les colonnes représentent les jours de la semaine :
   - Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche

3. Pour chaque jour, il y a DEUX colonnes :
   - "Caisse" → indique la présence en caisse
   - "Présence soin" → indique la présence en soin

4. Valeurs possibles dans les cellules :
   - "X" = présent
   - "P" = présent en soin
   - cellule vide = null

5. Sous chaque personne, il peut y avoir des lignes de statistiques :
   - "Nombre de shérifs soignés"
   - "Nombre de palefreniers soignés"

Ces valeurs doivent être associées à la bonne personne.

---

RÈGLES IMPORTANTES :

- Tu dois extraire TOUTES les personnes visibles
- Tu dois respecter l'alignement des colonnes (jours corrects)
- Tu ne dois rien inventer
- Si une valeur est absente → null
- Si une stat est absente → null
- Le tableau peut être réparti sur plusieurs images → considère-les comme un seul tableau

---

FORMAT DE SORTIE (JSON STRICT) :

{
  "employees": [
    {
      "name": "string",
      "role": "string (e.g. Médecin, Infirmière)",
      "id": number or null (in-game id if visible),
      "schedule": {
        "lundi": { "caisse": "X" or null, "presence": "P" or null },
        "mardi": { "caisse": "X" or null, "presence": "P" or null },
        "mercredi": { "caisse": "X" or null, "presence": "P" or null },
        "jeudi": { "caisse": "X" or null, "presence": "P" or null },
        "vendredi": { "caisse": "X" or null, "presence": "P" or null },
        "samedi": { "caisse": "X" or null, "presence": "P" or null },
        "dimanche": { "caisse": "X" or null, "presence": "P" or null }
      },
      "stats": {
        "sherifs": number or null,
        "palefreniers": number or null,
        "nombre_caisses": number,
        "nombre_presences": number
      }
    }
  ],
  "global_stats": {
    "total_employees": number,
    "total_caisses": number,
    "total_sherifs": number
  }
}

---

CONSIGNES FINALES :

- Retourne UNIQUEMENT le JSON
- Aucun texte autour
- Aucun commentaire
- JSON valide et parsable directement


Use null where a value is missing or unreadable. Count one "caisse" per day marked with X (or equivalent).`;

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) {
    return JSON.parse(fence[1].trim());
  }
  return JSON.parse(trimmed);
}

export async function analyzePayrollScreenshots(
  base64Images: { mime: string; data: string }[],
): Promise<PayrollReportResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [
    { type: 'text', text: SYSTEM_PROMPT },
    ...base64Images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: `data:${img.mime};base64,${img.data}` },
    })),
  ];

  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: userContent }],
    response_format: { type: 'json_object' },
  });

  const text = res.choices[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenAI');
  }

  const parsed = parseJsonContent(text);
  return payrollReportResultSchema.parse(parsed);
}
