# Finance Dashboard

A personal finance dashboard for tracking cashflow, balance sheet, debts, and investments. Plain HTML, CSS, and JavaScript — no build tools, no framework, no backend required.

## Project structure

```
finance-dashboard/
├── index.html
├── styles.css
├── app.js
├── package.json
└── README.md
```

## Running locally

No build step is needed since this is static HTML/CSS/JS. Two options:

**Option A — just open the file**
Double-click `index.html`, or open it in your browser directly. This works for everything except the Chart.js charts may need a local server in some browsers due to CORS restrictions on local file access — if charts don't render, use Option B.

**Option B — local server (recommended)**
```bash
npm install
npm start
```
Then open the printed local URL (typically `http://localhost:3000`).

## Deployment

This is a static site, so it deploys to any static host with zero configuration.

**Netlify**
1. Drag the project folder onto the Netlify dashboard, or connect a Git repo.
2. Build command: none. Publish directory: `/` (root).

**Vercel**
```bash
npm i -g vercel
vercel
```
Framework preset: "Other". No build command needed.

**GitHub Pages**
1. Push this folder to a GitHub repo.
2. In repo Settings → Pages, set source to the branch and root folder.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

## Data storage

Data is stored in the browser's `localStorage` under the key `finance-dashboard-state`. This means:
- Data persists across visits on the same browser/device.
- Data is **not** synced across devices or shared between users.
- Clearing browser data/cache will erase it. Consider adding an export/import (JSON) feature if you need backups.
- Each person who opens the deployed link gets their own separate local data — nothing is shared between visitors.

## Customizing

- **Currency**: change the `CURRENCY` constant near the top of `app.js` (defaults to `₱`).
- **Expense categories**: edit the `EXPENSE_CATEGORIES` array in `app.js`.
- **Colors**: edit the CSS variables at the top of `styles.css` (`--accent`, `--accent-dark`, `--accent-light`).

## Dependencies

Loaded via CDN in `index.html`, no npm install required for these:
- [Chart.js 4.4.1](https://www.chartjs.org/) — charts
- [Tabler Icons](https://tabler.io/icons) — icon font

The `package.json` only includes a dev dependency (`serve`) for convenience local testing — it is not required for deployment.
