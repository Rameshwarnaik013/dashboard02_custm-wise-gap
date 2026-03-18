# Sales Trend Dashboard

A Next.js dashboard for analyzing Projection KG, SO KG, and Gap trends across channels and customers.

## Features
- 📊 Monthly trend charts (Projection vs SO vs Gap)
- 📉 Gap % trend visualization
- 🔍 Channel dropdown filter
- 🔎 Customer search with multi-select
- 📋 Customer summary table with Gap %
- 🎛️ Metric toggles

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: GitHub + Vercel Dashboard
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Vercel auto-detects Next.js — click **Deploy**

No environment variables needed. Data is served from `public/data.json`.

## Project Structure

```
dashboard/
├── app/
│   ├── layout.js          # Root layout with fonts
│   ├── page.js            # Main dashboard component
│   ├── globals.css        # Global styles & CSS variables
│   └── dashboard.module.css  # Component styles
├── public/
│   └── data.json          # Pre-processed sales data
├── package.json
├── next.config.js
└── vercel.json
```
