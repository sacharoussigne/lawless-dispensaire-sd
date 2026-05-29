# API HTTP — Activité hebdomadaire (bot Discord)

Cette API permet au bot Discord de lire et de modifier les lignes d’activité hebdomadaire **d’un dispensaire donné**. Elle est **distincte** de l’authentification utilisateur (cookies / Better Auth) : une **clé secrète** partagée + l’identifiant du dispensaire cible.

En mode multi-dispensaire, chaque requête doit cibler **un seul tenant** : les données (liste, récap, création, caisse, présence) sont isolées par `dispensaryId`.

## URL de base

Utilise l’URL publique de l’application Next.js, la même que `NEXT_PUBLIC_API_URL` (ex. `https://dispensaire.example.com` en prod, `http://localhost:3000` en local).

Tous les chemins ci-dessous sont relatifs à cette base.

## Authentification

| En-tête / paramètre | Obligatoire | Description |
|---------------------|-------------|-------------|
| `Authorization` | Oui | `Bearer <secret>` où `<secret>` est la valeur de **`DISPENSARY_BOT_API_SECRET`** côté serveur. |
| `X-Dispensary-Id` | Oui (toutes les routes) | UUID du dispensaire cible (ex. `00000000-0000-4000-8000-000000000001` pour le dispensaire migré par défaut). Alternative : query `?dispensaryId=<uuid>` sur la même URL. |
| `X-Discord-User-Id` | Oui sauf `GET …/recap` (là optionnel) | ID Discord (snowflake) de l’utilisateur dont le bot agit **au nom**. Les écritures ne sont autorisées que pour les lignes dont `discordUserId` est égal à cet ID. |

**Erreurs liées au dispensaire :**

| Code | Cas |
|------|-----|
| **400** | `X-Dispensary-Id` / `dispensaryId` absent |
| **401** | Secret invalide |
| **403** | Feature « activité hebdomadaire » désactivée pour ce dispensaire (`AppSettings.featureWeeklyDispensaryActivityEnabled`) |
| **404** | `dispensaryId` inconnu |

En cas d’échec d’authentification par clé : **401** avec `{ "status": 401, "error": "Non autorisé" }`.

Si `X-Discord-User-Id` est absent alors qu’il est requis : **400** (sauf `GET …/recap` où l’en-tête reste optionnel pour filtrer un médecin).

### Obtenir le `dispensaryId`

- Après migration : dispensaire par défaut = UUID fixe `00000000-0000-4000-8000-000000000001` (slug intranet `saint-denis`).
- Super-admin : liste dans l’intranet `/platform/dispensaries`, ou table `dispensary` en base.
- Le bot peut stocker **un `dispensaryId` par serveur Discord** (guild) si plusieurs dispensaires RP partagent la même instance.

## Format des réponses

En succès, le corps est en général :

```json
{ "status": 200, "data": … }
```

En erreur :

```json
{ "status": <code_http>, "error": "Message en français" }
```

Le code HTTP reprend le même ordre de grandeur que `status` dans le JSON.

## Dates et JSON

Les champs `periodStart` et `periodEnd` acceptent des **chaînes ISO 8601** dans le corps JSON (ex. `"2026-04-14T00:00:00.000Z"` ou `"2026-04-14"` selon ce que le parseur interprète). Les réponses renvoient des dates en **ISO string** (`toISOString()`).

**Semaine canonique (Europe/Paris, lundi → dimanche)** : à chaque création ou mise à jour qui touche la période, le serveur **normalise** les deux dates vers la semaine paie du calendrier **Europe/Paris** contenant l’instant `periodStart` (ou `periodEnd` seul en mise à jour) : `periodStart` = lundi **00:00** (Paris), `periodEnd` = dimanche **fin de journée** (Paris, même règle que la banque). Tu peux envoyer un instant au milieu de la semaine ; la ligne stockée utilisera toujours ces bornes.

Les compteurs (patients, infusions, etc.) sont des **entiers ≥ 0**.

### Caisses et présences par jour (Europe/Paris)

Chaque ligne d’activité porte deux objets JSON à clés fixes **`lundi`** … **`dimanche`** (booléens) :

- **`chestDays`** : caisse effectuée ce jour-là ou non.
- **`presenceDays`** : présence enregistrée pour ce jour-là ou non.

Les réponses exposent aussi :

- **`chestTotal`** / **`presenceTotal`** : nombre de jours à `true`.
- **`chestDaysSummary`** / **`presenceDaysSummary`** : chaîne de 7 caractères (`✓` = jour coché, `·` = non), ordre **lundi → dimanche** (affichage compact pour le récap bot).

La migration a supprimé l’ancien champ entier **`chestCount`** : l’information par jour ne peut pas être reconstituée à partir des anciennes données ; les lignes migrées ont tous les jours à `false` pour les caisses.

### Données déjà en base (optionnel)

Si d’anciennes lignes ont un `periodEnd` égal au **lundi suivant minuit** (borne « exclusive » : exactement 7 jours après le lundi `periodStart`), recalcule la fin canonique ainsi :

```sql
UPDATE dispensary_weekly_activity
SET "periodEnd" = "periodStart" + interval '7 days' - interval '1 millisecond'
WHERE "periodEnd" = "periodStart" + interval '7 days';
```

---

## `GET /api/dispensary/weekly-activity`

Liste **toutes** les activités dont `discordUserId` correspond à `X-Discord-User-Id` (tri par `periodStart` décroissant).

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

**Corps :** aucun

Ne retourne que les activités du dispensaire indiqué par `X-Dispensary-Id`.

**Réponse 200 — `data` :** tableau d’objets :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Identifiant de la ligne |
| `periodStart`, `periodEnd` | string ISO | Début / fin de période |
| `displayName` | string | Nom stocké sur la ligne |
| `resolvedDisplayName` | string | Nom affiché : `User.name` si compte intranet lié à ce Discord, sinon `displayName` |
| `discordUserId` | string | ID Discord propriétaire de la ligne |
| `userId` | string \| null | Lien utilisateur intranet si présent |
| `chestDays` | object | Clés `lundi` … `dimanche`, booléens |
| `presenceDays` | object | Idem |
| `chestTotal` | number | Nombre de jours avec caisse |
| `presenceTotal` | number | Nombre de jours avec présence |
| `chestDaysSummary` | string | Résumé 7 caractères (lundi → dimanche) |
| `presenceDaysSummary` | string | Idem |
| `sherifCount` | number | Soins shérifs |
| `palefrenierCount` | number | Palefreniers |
| `patientsCount` | number | Patients |
| `infusionsCount` | number | Infusions |
| `poppyMilkCount` | number | Lait de pavot |
| `createdAt`, `updatedAt` | string ISO | Horodatages |

**Exemple (curl) :**

```bash
curl -sS \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  "https://votre-domaine/api/dispensary/weekly-activity"
```

---

## `GET /api/dispensary/weekly-activity/recap?date=YYYY-MM-DD`

Récapitulatif pour la **semaine Europe/Paris** (lundi → dimanche, voir section *Dates et JSON*) qui contient le jour `date` (interprété comme jour calendaire **Europe/Paris**).

Les lignes renvoyées sont celles dont la période **chevauche** cette semaine (inclut d’éventuelles anciennes lignes aux bornes UTC si elles intersectent encore la fenêtre Paris demandée).

**En-têtes :** `Authorization`, **`X-Dispensary-Id`** obligatoires ; **`X-Discord-User-Id` optionnel** — s’il est présent, seules les lignes de ce médecin (dans ce dispensaire) qui chevauchent la semaine sont renvoyées ; s’il est absent, **toutes** les lignes du dispensaire pour cette semaine sont renvoyées (récap équipe).

**Query :**

| Paramètre | Obligatoire | Description |
|-----------|-------------|-------------|
| `date` | Oui | `YYYY-MM-DD` interprété en **Europe/Paris** (minuit local ce jour-là). |

**Réponse 200 — `data` :**

| Champ | Type | Description |
|-------|------|-------------|
| `periodStart`, `periodEnd` | string ISO | Bornes canoniques de la semaine (Paris) pour la requête |
| `rows` | array | Même forme d’objets que le `GET` liste (tri par `resolvedDisplayName`, locale `fr`) |

**Erreurs :** **400** — `date` manquant ou format invalide ; **401** — secret invalide.

**Exemple (récap toute l’équipe) :**

```bash
curl -sS \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  "https://votre-domaine/api/dispensary/weekly-activity/recap?date=2026-04-15"
```

---

## `POST /api/dispensary/weekly-activity`

Crée une nouvelle ligne pour le médecin identifié par le **Discord ID** (corps + en-tête doivent coïncider).

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

La ligne créée est rattachée au dispensaire `X-Dispensary-Id`.

**Corps JSON (tous les champs sont requis sauf `userId`, `chestDays`, `presenceDays`) :**

| Champ | Type | Description |
|-------|------|-------------|
| `periodStart` | string / date | Début de période |
| `periodEnd` | string / date | Fin (≥ début) |
| `displayName` | string | Nom affiché côté stockage (souvent le pseudo / nom RP Discord) |
| `discordUserId` | string | **Doit être identique** à `X-Discord-User-Id` |
| `userId` | string \| null | Optionnel ; laisser absent en usage bot normal |
| `chestDays` | object | Optionnel ; si absent, tous les jours à `false` |
| `presenceDays` | object | Optionnel ; si absent, tous les jours à `false` |
| `sherifCount` | number | |
| `palefrenierCount` | number | |
| `patientsCount` | number | |
| `infusionsCount` | number | |
| `poppyMilkCount` | number | |

Chaque objet `chestDays` / `presenceDays` doit contenir **exactement** les sept clés `lundi` … `dimanche` avec des booléens si tu l’envoies.

**Réponse 200 — `data` :** un seul objet de la même forme qu’un élément de liste (voir GET).

**Erreurs fréquentes :**

- **403** — `discordUserId` dans le corps ≠ `X-Discord-User-Id`
- **409** — une ligne existe déjà pour la même combinaison `(dispensaryId, discordUserId, periodStart, periodEnd)`
- **422** — validation Zod (dates, types, etc.)

**Exemple :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{
    "periodStart": "2026-04-13T00:00:00.000+02:00",
    "periodEnd": "2026-04-19T23:59:59.999+02:00",
    "displayName": "Dr. Dupont",
    "discordUserId": "123456789012345678",
    "sherifCount": 1,
    "palefrenierCount": 0,
    "patientsCount": 5,
    "infusionsCount": 0,
    "poppyMilkCount": 0
  }' \
  "https://votre-domaine/api/dispensary/weekly-activity"
```

---

## `GET /api/dispensary/weekly-activity/{id}`

Récupère **une** ligne par son `id` (UUID).

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

**Règle d’accès :** la ligne doit appartenir au dispensaire `X-Dispensary-Id` et avoir `discordUserId` égal à `X-Discord-User-Id`, sinon **403**.

**Réponse 200 — `data` :** même structure qu’un élément de liste.

**404** — id inconnu ou ligne d’un autre dispensaire.

---

## `POST /api/dispensary/weekly-activity/bot/caisse`

Met à jour la **caisse** (`chestDays`) du médecin identifié par `X-Discord-User-Id`. Deux modes selon le corps JSON.

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

### Mode legacy (raccourci)

Corps vide, `{}`, ou `{ "displayName": "…" }` uniquement : enregistre la caisse **aujourd’hui** (Paris) à `true` (comportement historique).

### Mode édition (semaine courante)

Corps avec **`value`** (booléen) et **exactement un** de **`weekday`** ou **`date`** :

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `value` | Oui (mode édition) | `true` pour cocher la caisse ce jour-là, `false` pour décocher |
| `weekday` | Un de `weekday` / `date` | `lundi` … `dimanche` — jour de la **semaine courante** (Paris) |
| `date` | Un de `weekday` / `date` | `YYYY-MM-DD` interprété en minuit **Europe/Paris** |
| `displayName` | Non | Même sémantique qu’avant (mise à jour du nom stocké si différent) |

**Règles :**

- Uniquement la **semaine courante** (lundi → dimanche, Paris).
- Jours **éditables** : aujourd’hui et les jours déjà passés de cette semaine (pas les jours futurs).
- Uniquement les données du `X-Discord-User-Id` (pas d’édition pour un autre médecin).

**Réponse 200 — `data` :**

- Valeur déjà identique : `{ "alreadyDone": true, "message": "…", "activity": { … } }` (aucune entrée d’historique ; le bot peut s’appuyer sur `alreadyDone` pour afficher un retour utilisateur).
- Changement effectué : `{ "alreadyDone": false, "activity": { … } }`.

**Historique :** action `UPDATE_CHEST_DAYS`, source `DISCORD_BOT`, avec `previousValues` / `nextValues` du type `{ "day": "mercredi", "date": "2026-05-14", "chest": false }` → `{ …, "chest": true }`.

**Erreurs :** **400** — jour futur ou hors semaine courante ; **422** — combinaison de champs invalide.

**Exemple legacy :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Dr. H. Morgan"}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/caisse"
```

**Exemple édition (décocher le jeudi de la semaine courante) :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"weekday": "jeudi", "value": false}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/caisse"
```

**Exemple édition par date :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-05-14", "value": true}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/caisse"
```

---

## `POST /api/dispensary/weekly-activity/bot/presence`

Met à jour la **présence** (`presenceDays`). Deux modes selon le corps JSON.

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

### Mode legacy (raccourci)

`{ "day": "today" }` ou `{ "day": "yesterday" }` **sans** `value`, `weekday` ni `date` : enregistre la présence à `true` pour ce jour relatif (Paris). « Hier » peut encore tomber sur la **semaine précédente** (ex. dimanche si on est lundi).

Corps vide ou sans `day` : équivalent à `{ "day": "today" }`.

### Mode édition (semaine courante)

Mêmes champs que **`bot/caisse`** (`value`, `weekday` ou `date`, `displayName` optionnel), mais pour `presenceDays`. **Ne pas mélanger** `day` (today/yesterday) avec `value` / `weekday` / `date` dans la même requête.

**Règles mode édition :** identiques à la caisse (semaine courante, jours ≤ aujourd’hui, propre utilisateur Discord).

**Historique :** action `UPDATE_PRESENCE_DAYS`, payloads `{ "day", "date", "presence": … }`.

**Erreurs :** **400**, **422** — voir `bot/caisse`.

**Exemple legacy :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"day": "yesterday"}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/presence"
```

**Exemple édition :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"weekday": "mardi", "value": true}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/presence"
```

---

## `PATCH /api/dispensary/weekly-activity/{id}`

Met à jour une ligne existante. Tous les champs du corps sont **optionnels** ; seuls ceux fournis sont modifiés.

Champs possibles (tous optionnels) :

- `periodStart`, `periodEnd`, `displayName`
- `sherifCount`, `palefrenierCount`, `patientsCount`, `infusionsCount`, `poppyMilkCount`

Les caisses et présences **par jour** ne sont pas modifiables via ce `PATCH` côté bot : utiliser **`POST …/bot/caisse`** et **`POST …/bot/presence`**. (L’intranet utilise les actions serveur dédiées.)

**Comportement côté historique (bot) :** pour chaque compteur dont la valeur change, une entrée d’historique de type **incrément** ou **décrément** est enregistrée (shérifs, palefreniers, patients, infusions, lait de pavot) ; si la période ou le `displayName` change, une entrée **UPDATE** est aussi enregistrée. Les valeurs envoyées sont des **absolus** (pas des deltas) : l’API calcule la différence pour classer incrément / décrément.

**En-têtes :** `Authorization`, `X-Dispensary-Id`, `X-Discord-User-Id`

**403** — la ligne n’appartient pas au dispensaire ou au `X-Discord-User-Id`.

**409** — conflit d’unicité sur la période (changement de dates qui entre en collision avec une autre ligne du même dispensaire).

**Exemple (modifier seulement les compteurs) :**

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"sherifCount": 3, "palefrenierCount": 1, "patientsCount": 8}' \
  "https://votre-domaine/api/dispensary/weekly-activity/<UUID>"
```

---

## `DELETE /api/dispensary/weekly-activity/{id}`

Supprime la ligne. L’historique est conservé en base (référence vers l’activité mise à `null` après suppression).

**Réponse 200 — `data` :** `{ "ok": true }`

**403 / 404** — même logique que pour GET/PATCH.

**Exemple :**

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Dispensary-Id: 00000000-0000-4000-8000-000000000001" \
  -H "X-Discord-User-Id: 123456789012345678" \
  "https://votre-domaine/api/dispensary/weekly-activity/<UUID>"
```

---

## Checklist bot Discord

1. Stocker **`DISPENSARY_BOT_API_SECRET`** côté Next.js et côté bot (chiffré).
2. Configurer **`DISPENSARY_ID`** (ou équivalent) par instance / guild Discord — UUID du dispensaire cible.
3. À **chaque** requête :
   - **`Authorization: Bearer …`**
   - **`X-Dispensary-Id: <uuid>`** (ou `?dispensaryId=` sur l’URL)
   - **`X-Discord-User-Id`** (sauf `GET …/recap` sans filtre médecin)
4. Pour **POST** création, aligner **`discordUserId`** du JSON sur `X-Discord-User-Id`.
5. Vérifier que l’activité hebdo est activée pour ce dispensaire dans l’intranet (sinon **403**).
6. URL **HTTPS** de prod ; ne jamais committer le secret.

---

## Fichiers de référence (code)

- Routes : `src/app/api/dispensary/weekly-activity/route.ts`, `src/app/api/dispensary/weekly-activity/recap/route.ts`, `src/app/api/dispensary/weekly-activity/[id]/route.ts`, `src/app/api/dispensary/weekly-activity/bot/caisse/route.ts`, `src/app/api/dispensary/weekly-activity/bot/presence/route.ts`
- Validation : `src/lib/dispensaryWeeklyActivity/schemas.ts` (dont schémas corps `bot/caisse` et `bot/presence`), `src/lib/dispensaryWeeklyActivity/weekdayFlags.ts`, `src/lib/dispensaryWeeklyActivity/botDayEdit.ts`
- Sérialisation : `src/lib/dispensaryWeeklyActivity/apiRow.ts`, `src/lib/dispensaryWeeklyActivity/loadSerializedRow.ts`
- Vérification du secret et du dispensaire : `src/lib/dispensaryWeeklyActivityApiAuth.ts`, `src/lib/dispensaryWeeklyActivity/botRequestContext.ts`
