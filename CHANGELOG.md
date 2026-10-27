# Jurnal de modificări

## 2.2.0 — 2026-10-27

### Adăugat
- **Categorii opționale pentru „Prompturile mele”**: câmp „Categorie” (etichetă liberă, max. 40 de caractere, normalizată), listă de sugestii din categoriile existente, **filtru pe categorie** deasupra listei (apare când există cel puțin o categorie; un prompt nou creat sub un filtru primește categoria filtrului; filtrul se resetează când categoria dispare). Exportul păstrează categoria (`cat`); importul simplu acceptă `category` sau `cat`. Datele vechi (fără categorie) se încarcă fără modificări.
- Texte în română și engleză (celelalte limbi afișează engleza, ca restul secțiunii).
- Test nou `tests/categories.test.mjs` (18 verificări): date vechi, normalizare, sugestii, limită, filtru, export/import, ștergere, persistență, RO, 360 px, 0 cereri de rețea. `own-prompts` (20) și `templates` (37, cu axe-core) rămân verzi.
- `sizeBytes`/`sha256` din `app.json` și `fff-info` regenerate.

### Neimplementat
- Etichete multiple per prompt (doar o categorie); sortare după categorie.
- Criptarea cheilor: nu se aplică (PromptVault nu stochează chei API).

## 2.1.0 — 2026-10-27

Recenzie 2026-10-27.

### Adăugat
- Buton vizibil „＋ Adaugă propriul prompt” în bara laterală; secțiunea existentă „Șabloanele mele” (adăugare / editare cu versiuni / ștergere / export-import JSON, din 2.0.0) este redenumită „Prompturile mele și șabloane”, cu textele de ajutor reformulate (en/ro).
- Import în format simplu, scris de mână: `[{"name","text"}]` sau `{"prompts":[…]}` (alias `title`/`prompt`), cu sărirea duplicatelor la reimport. Formatul propriu de export/import rămâne neschimbat.
- Test nou `tests/own-prompts.test.mjs` (20 de verificări); `tests/templates.test.mjs` actualizat la noile denumiri (37 de verificări, toate trecute).
- Linii „Stare” și „Offline” în README și metadate (`app-status`, `app-offline`).

### Modificat
- Etichetele de export/import: „Exportă prompturile mele (JSON)” / „Importă prompturi (JSON)”. Hash-urile CSP ale scripturilor inline au fost recalculate.

### Neschimbat
- Nimic șters; fără dependențe noi, fără cereri de rețea. PromptVault nu stochează chei API, deci nu a primit criptarea cu parolă.

Istoricul anterior (până la 2.0.0, 2026-10-26) este în secțiunea „Istoric / Changelog” din README.md.
