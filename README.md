<!-- Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT -->
# Macro & Market Shock Risk Monitor (v2.0.1)

Standalone GitHub Pages dashboard powered by FRED data cached via GitHub Actions.

## Fresh GitHub Repo Setup
1. **Upload all files** to your new GitHub repository, preserving the folder structure:
   - `index.html`
   - `package.json` (enables ES module imports in Node 20 for `js/config.js`)
   - `js/` (`app.js`, `charts.js`, `config.js`, `fred-api.js`, `risk-engine.js`)
   - `scripts/update-fred.mjs`
   - `data/fred_cache.json`
   - `.github/workflows/update-fred.yml` *(Note: `.github` is a hidden folder on many phones/OSes. A visible copy is also included at `workflow_backup/update-fred.yml` — if your file manager hides `.github`, create `.github/workflows/update-fred.yml` in GitHub's web UI and paste the contents.)*
2. **Add your FRED API Key secret:**
   - Go to **Settings -> Secrets and variables -> Actions -> New repository secret**
   - Name: `FRED_API_KEY`
   - Secret: your 32-character FRED API key
3. **Enable GitHub Pages:**
   - Go to **Settings -> Pages -> Build and deployment -> Deploy from a branch** (`main` / `root`).
4. **Run the initial data sync:**
   - Go to the **Actions** tab -> **Update FRED Data Cache** -> **Run workflow**.
