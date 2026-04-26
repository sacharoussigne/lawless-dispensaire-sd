# API HTTP — Activité hebdomadaire (bot Discord)

Cette API permet au bot Discord de lire et de modifier les lignes d’activité hebdomadaire du dispensaire. Elle est **distincte** de l’authentification utilisateur (cookies / Better Auth) : seule une **clé secrète** partagée est utilisée.

## URL de base

Utilise l’URL publique de l’application Next.js, la même que `NEXT_PUBLIC_API_URL` (ex. `https://dispensaire.example.com` en prod, `http://localhost:3000` en local).

Tous les chemins ci-dessous sont relatifs à cette base.

## Authentification

| En-tête | Obligatoire | Description |
|--------|-------------|-------------|
| `Authorization` | Oui | `Bearer <secret>` où `<secret>` est la valeur de la variable d’environnement **`DISPENSARY_BOT_API_SECRET`** côté serveur. |
| `X-Discord-User-Id` | Oui sauf `GET …/recap` (là il est optionnel) | ID Discord (snowflake) de l’utilisateur dont le bot agit **au nom**. Les écritures ne sont autorisées que pour les lignes dont le champ `discordUserId` est égal à cet ID. |

En cas d’échec d’authentification par clé : réponse **401** avec un corps JSON `{ "status": 401, "error": "Non autorisé" }`.

Si `X-Discord-User-Id` est absent alors qu’il est requis par la route : **400** (sauf `GET …/recap` où l’en-tête est optionnel).

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

**En-têtes :** `Authorization`, `X-Discord-User-Id`

**Corps :** aucun

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
  -H "X-Discord-User-Id: 123456789012345678" \
  "https://votre-domaine/api/dispensary/weekly-activity"
```

---

## `GET /api/dispensary/weekly-activity/recap?date=YYYY-MM-DD`

Récapitulatif pour la **semaine Europe/Paris** (lundi → dimanche, voir section *Dates et JSON*) qui contient le jour `date` (interprété comme jour calendaire **Europe/Paris**).

Les lignes renvoyées sont celles dont la période **chevauche** cette semaine (inclut d’éventuelles anciennes lignes aux bornes UTC si elles intersectent encore la fenêtre Paris demandée).

**En-têtes :** `Authorization` obligatoire ; **`X-Discord-User-Id` optionnel** — s’il est présent, seules les lignes de ce médecin qui chevauchent la semaine sont renvoyées ; s’il est absent, **toutes** les lignes concernées sont renvoyées (récap équipe).

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
  "/api/dispensary/weekly-activity/recap?date=2026-04-15"
```

---

## `POST /api/dispensary/weekly-activity`

Crée une nouvelle ligne pour le médecin identifié par le **Discord ID** (corps + en-tête doivent coïncider).

**En-têtes :** `Authorization`, `X-Discord-User-Id`

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
- **409** — une ligne existe déjà pour la même combinaison `(discordUserId, periodStart, periodEnd)`
- **422** — validation Zod (dates, types, etc.)

**Exemple :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
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

**Règle d’accès :** la ligne doit avoir `discordUserId` égal à `X-Discord-User-Id`, sinon **403**.

**Réponse 200 — `data` :** même structure qu’un élément de liste.

**404** — id inconnu.

---

## `POST /api/dispensary/weekly-activity/bot/caisse`

Enregistre la **caisse pour le jour calendaire actuel en Europe/Paris** pour le médecin identifié par `X-Discord-User-Id`.

**En-têtes :** `Authorization`, `X-Discord-User-Id`

**Corps :** JSON optionnel (corps vide autorisé, ou `{}`).

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `displayName` | Non | Pseudo / nom RP du médecin (ex. depuis Discord). Si présent, **non vide** après trim, et **différent** du `displayName` stocké sur la ligne, le serveur met à jour le champ `displayName` (même règle que le reste de l’API : 1–200 caractères) avant d’enregistrer la caisse. Si identique au stocké, aucune mise à jour du nom. |

**Réponse 200 — `data` :**

- Si la caisse était déjà enregistrée pour ce jour : `{ "alreadyDone": true, "message": "…" }` (message en français).
- Sinon : `{ "alreadyDone": false, "activity": { … } }` où `activity` a la même forme qu’un élément de liste (GET).

Si aucune ligne ne couvre encore ce jour, le serveur **crée d’abord** une entrée d’activité pour la **semaine Europe/Paris** concernée (compteurs à 0, caisses/présences vides). Le `displayName` initial est : valeur de **`displayName`** dans le corps si fournie, sinon nom du compte intranet lié à ce Discord si disponible, sinon `Médecin <discordUserId>`, puis enregistrement de la caisse du jour.

**Exemple (corps avec nom RP) :**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer VOTRE_SECRET" \
  -H "X-Discord-User-Id: 123456789012345678" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Dr. H. Morgan"}' \
  "https://votre-domaine/api/dispensary/weekly-activity/bot/caisse"
```

---

## `POST /api/dispensary/weekly-activity/bot/presence`

Enregistre la **présence** pour **aujourd’hui** ou **hier** (calendrier **Europe/Paris**). Le serveur choisit la ligne dont la période **chevauche** ce jour (ex. le lundi matin, « hier » = dimanche peut correspondre à la **semaine précédente**).

**En-têtes :** `Authorization`, `X-Discord-User-Id`

**Corps JSON :**

| Champ | Type | Description |
|-------|------|-------------|
| `day` | `"today"` \| `"yesterday"` | Jour cible (Paris) |
| `displayName` | string | Optionnel ; même sémantique que pour **`POST …/bot/caisse`** (mise à jour du `displayName` stocké uniquement si fourni, non vide, et différent de la valeur actuelle). |

**Réponse 200 — `data` :** même forme que pour `bot/caisse` (`alreadyDone` + `message` ou `activity`).

Même logique de **création automatique** de la ligne de semaine si elle n’existait pas (voir `bot/caisse`).

**422** — `day` invalide ou absent.

---

## `PATCH /api/dispensary/weekly-activity/{id}`

Met à jour une ligne existante. Tous les champs du corps sont **optionnels** ; seuls ceux fournis sont modifiés.

Champs possibles (tous optionnels) :

- `periodStart`, `periodEnd`, `displayName`
- `sherifCount`, `palefrenierCount`, `patientsCount`, `infusionsCount`, `poppyMilkCount`

Les caisses et présences **par jour** ne sont pas modifiables via ce `PATCH` côté bot : utiliser **`POST …/bot/caisse`** et **`POST …/bot/presence`**. (L’intranet utilise les actions serveur dédiées.)

**Comportement côté historique (bot) :** pour chaque compteur dont la valeur change, une entrée d’historique de type **incrément** ou **décrément** est enregistrée (shérifs, palefreniers, patients, infusions, lait de pavot) ; si la période ou le `displayName` change, une entrée **UPDATE** est aussi enregistrée. Les valeurs envoyées sont des **absolus** (pas des deltas) : l’API calcule la différence pour classer incrément / décrément.

**403** — la ligne n’appartient pas au `X-Discord-User-Id`.

**409** — conflit d’unicité sur la période (changement de dates qui entre en collision avec une autre ligne).

**Exemple (modifier seulement les compteurs) :**

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer VOTRE_SECRET" \
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
  -H "X-Discord-User-Id: 123456789012345678" \
  "https://votre-domaine/api/dispensary/weekly-activity/<UUID>"
```

---

## Checklist bot Discord

1. Stocker **`DISPENSARY_BOT_API_SECRET`** dans l’environnement du serveur qui héberge Next.js (et une copie chiffrée côté bot si besoin).
2. À chaque requête : envoyer **`Authorization: Bearer …`**. Ajouter **`X-Discord-User-Id`** (sauf pour **`GET …/recap`** sans filtre médecin) = l’ID Discord de l’utilisateur qui déclenche l’action dans Discord.
3. Pour **POST**, aligner **`discordUserId`** du JSON sur cet en-tête.
4. Utiliser l’**URL HTTPS** de prod dans le bot ; ne pas exposer le secret dans le dépôt ou le client web.

---

## Fichiers de référence (code)

- Routes : `src/app/api/dispensary/weekly-activity/route.ts`, `src/app/api/dispensary/weekly-activity/recap/route.ts`, `src/app/api/dispensary/weekly-activity/[id]/route.ts`, `src/app/api/dispensary/weekly-activity/bot/caisse/route.ts`, `src/app/api/dispensary/weekly-activity/bot/presence/route.ts`
- Validation : `src/lib/dispensaryWeeklyActivity/schemas.ts` (dont schémas corps `bot/caisse` et `bot/presence`), `src/lib/dispensaryWeeklyActivity/weekdayFlags.ts`
- Sérialisation : `src/lib/dispensaryWeeklyActivity/apiRow.ts`, `src/lib/dispensaryWeeklyActivity/loadSerializedRow.ts`
- Vérification du secret : `src/lib/dispensaryWeeklyActivityApiAuth.ts`
