
## Goal
Rename "Website Analysis" → "Website Intelligence" and rebuild as a 2-tab module: **Brand Summary** (existing + 5 new sections) and **Dynamic SEO Keyword Tracker** (new).

## Important substitutions from your spec
- **AI provider:** Your spec calls Anthropic Claude directly. This project already uses Lovable AI Gateway (no API key required, you're billed via workspace credits). I will route all AI calls through the gateway using `google/gemini-3-flash-preview` (default) — same JSON-output contracts, server-side. Calling Anthropic directly from the browser would also leak the key. Confirm if you want me to instead add a Claude provider (requires an Anthropic API key secret).
- **Scraping:** Firecrawl is now connected — I'll use it for real page data (title, meta, colors, fonts, links, contact info, social, summary) and use AI only for sections that genuinely need inference (Health Score, Competitors, Tech Stack, SEO keywords, AI Insight). This matches "real-time AI-powered analysis" while keeping factual data accurate instead of hallucinated.
- **SEO data:** Pure AI-simulated as you specified (no real SERP API). Cached per-URL+range in component state.

## Scope kept from current implementation
Existing server functions in `src/lib/website-analysis.functions.ts` (analyze, history, latest, by-id, remove, resolve brand) and DB tables stay. New AI sub-analyses (`health`, `competitors`, `contact`, `social`, `techStack`, `seoKeywords`, `seoInsight`) added as new server functions, called in parallel from the page after the main analysis completes (or in the same handler — see Technical).

## UI structure
```
/dashboard/website-intelligence  (renamed route; old path 301-style redirect via new route file)
├── Header (badge "Website Intelligence", H1, subtext)
├── Tabs: [Brand Summary] [SEO Keyword Tracker]
├── Brand Summary tab
│   ├── Input panel (URL + Brand Name w/ AI autocomplete, debounced 300ms)
│   ├── Progress checklist (5 steps, animated)
│   ├── Recent Analyses (existing history, restyled)
│   └── Results: R1 Summary, R2 Colors, R3 Typography, R4 Links,
│                R5 Brand Health (SVG gauge + 5 bars + tips),
│                R6 Competitors, R7 Contact, R8 Social, R9 Tech Stack
└── SEO Tracker tab
    ├── URL input (auto-synced from Brand tab)
    ├── Quick Stats (4 chips) + Export CSV
    ├── Date filter (3d/7d/30d/3m/Custom)
    ├── Sortable keyword table (10 + Load More to 50)
    ├── Recharts sparkline (Volume/Position/CTR toggle)
    └── AI Insight box
```

## Technical
- **Route:** rename `dashboard.website-analysis.tsx` → `dashboard.website-intelligence.tsx`. Keep old route as a redirect to avoid breaking sidebar/links until updated.
- **Sidebar:** update label + path in `src/components/app/Sidebar.tsx`.
- **Server functions** (new, in `src/lib/website-intelligence.functions.ts`, all using AI gateway with `Output.object` schemas):
  - `suggestBrands({ query })` — autocomplete
  - `analyzeBrandHealth({ url, summary })`
  - `findCompetitors({ url, summary })`
  - `extractContactAndSocial({ url, scrapedMarkdown })` — uses Firecrawl markdown if available
  - `detectTechStack({ url })`
  - `generateSeoKeywords({ url, range })`
  - `generateSeoInsight({ url, keywords, range })`
- **Reuse:** `analyzeWebsite` already covers R1–R4 + brand colors/fonts/links via Firecrawl + summary.
- **Design tokens:** add the spec's palette to `src/styles.css` as oklch semantic tokens (`--bg-card`, `--accent-purple`, etc.) and use Tailwind utilities; no hardcoded hex in components.
- **State:** TanStack Query for all AI calls (parallel via independent queries), localStorage handled by existing history table (already persisted server-side per user).
- **CSV export:** client-side blob download.
- **Crisis Radar / Ask Mr. Zarvis:** noted as global elements — Zarvis chat already exists (`ZarvisChat.tsx`); I'll ensure the FAB is visible on this page. Crisis Radar will be a no-op placeholder (hidden when no alerts) unless you tell me where alerts come from.

## Out of scope / will not do
- Migrating off Lovable AI to Anthropic direct (unless you confirm).
- Real SERP/SEO API integration (data is AI-simulated per spec).
- Crisis Radar data source (banner is hidden until you define alerts).

## Confirm before I build
1. **AI provider:** Use Lovable AI Gateway (recommended, no extra setup) — OK?
2. **Route rename:** Move to `/dashboard/website-intelligence` with redirect from `/dashboard/website-analysis`?

I'll proceed as soon as you approve (or answer the two questions).
