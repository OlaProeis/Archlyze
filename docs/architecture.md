# Archlyze — Architecture Documentation

This document describes the technical architecture of Archlyze as implemented in the codebase.

---

## Overview

Archlyze is a **browser-only SPA** (Single Page Application). There is **no backend** — API calls go directly from the browser to Google's Gemini API. The stack is React 18, TypeScript, Tailwind CSS (CDN), and Vite.

---

## Project Structure

```
├── index.html           Entry point. Tailwind CDN, custom colors, importmap, scrollbar CSS
├── index.tsx            React root mount (StrictMode)
├── App.tsx              Main app. Owns ALL top-level state. Orchestrates analysis, panels, theme
├── types.ts             TypeScript interfaces: AnalysisResult, CodeIssue, CodeComponent, etc.
├── constants.ts         Example code snippets (Rust, Python, JS Express)
├── vite.config.ts       Vite config. Exposes GEMINI_API_KEY as process.env.API_KEY
├── utils/
│   ├── gemini.ts        AI integration — 7 async functions (analyze, diagram, fix, tests, briefing, mermaid, walkthrough)
│   ├── export.ts        downloadMarkdownReport()
│   └── briefing.ts      Executive Briefing: buildSlideMarkdown, computeSecurityScore, parseSlides, exportToPptx
└── components/
    ├── CodePanel.tsx        Code viewer, syntax highlight, component highlighting, edit mode
    ├── AnalysisPanel.tsx   Analysis results, ComponentCard, IssueCard, Export, Generate Briefing
    ├── VisualPanel.tsx     Diagram type selector, generate/regenerate, image display
    ├── SettingsModal.tsx   API key, model, max lines, briefing language
    ├── BriefingPanel.tsx   Full-screen presentation overlay, slide navigation, Mermaid, export
    ├── FolderImportModal.tsx  Folder upload, .gitignore parsing, extension filter
    ├── FileExplorer.tsx   Sidebar tree view, collapsible folders
    ├── CodeResultModal.tsx  Fix/test code display, copy-to-clipboard
    └── LoadingOverlay.tsx  Step-by-step loading during analysis
```

---

## State Management

**Pattern:** Single `useState<AppState>` in `App.tsx`. No Context, no Redux.

### Key State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `files` | `ProjectFile[]` | All loaded files. Each caches `content`, `analysis`, `diagramUrl`, `briefingMarkdown`, `mermaidDiagram`, `walkthroughBlocks` |
| `currentFile` | `ProjectFile \| null` | Actively viewed/edited file |
| `status` | `AnalysisStatus` | IDLE, ANALYZING, GENERATING_IMAGE, FIXING, GENERATING_TESTS, COMPLETE, ERROR |
| `activePanel` | `'code' \| 'analysis' \| 'visual'` | Mobile tab and panel visibility |
| `selectedComponentId` | `string \| null` | Highlighted component in code and analysis |
| `isDarkMode` | `boolean` | Theme. Persisted to `rustflow_theme` |
| `settings` | `AppSettings` | apiKey, model, maxLines, briefingLanguage. Persisted to `rustflow_settings` |
| `sidebarWidth` | `number` | Panel split (20–80) |
| `showBriefing` | `boolean` | BriefingPanel overlay visibility |
| `briefingLoading` | `boolean` | Briefing generation in progress |
| `briefingError` | `string \| null` | Briefing generation error |

### Update Pattern

`setState(s => ({ ...s, ... }))` spread. When a file's analysis/diagram changes, both `currentFile` and the matching entry in `files[]` are updated together.

---

## AI Integration (`utils/gemini.ts`)

### Models

| Function | Model | Output |
|----------|-------|--------|
| `analyzeRustCode` | User-selected (default `gemini-2.5-flash`) | Structured JSON via `responseSchema` |
| `generateArchitectureDiagram` | `gemini-2.5-flash-image` (hardcoded) | Base64 image data URL |
| `generateFix` | User-selected | Plain text |
| `generateUnitTests` | User-selected | Plain text |
| `generateExecutiveBriefing` | User-selected | Plain Markdown |
| `generateMermaidDiagram` | User-selected | Raw Mermaid text |
| `generateCodeWalkthrough` | User-selected | Structured JSON `WalkthroughBlock[]` |

### API Key Resolution

1. `settings.apiKey` (user input in Settings)
2. `process.env.API_KEY` (Vite injects from `GEMINI_API_KEY` env var)

### Response Schema

`analyzeRustCode` uses strict `responseSchema` with `required` arrays and `description` at every level. Without `required`, Gemini 2.5 returns minimal/empty data. Schema is split into `issueSchema`, `componentSchema`, `dependencySchema`, `analysisSchema` for readability.

### Timeouts

| Operation | Timeout |
|-----------|---------|
| Analysis | 60s / 120s / 180s (by line count) |
| Diagram | 45s |
| Fix | 30s |
| Tests | 45s |
| Executive briefing | 90s |
| Mermaid | 45s |
| Walkthrough | 90s |

---

## Styling & Theming

- **Tailwind:** CDN (`https://cdn.tailwindcss.com`) with inline config in `index.html`
- **No Tailwind CLI/PostCSS** — CDN only
- **Custom colors:** `rust` (#CE422B), `graphite` (#2A2C31) in `tailwind.config`
- **Dark mode:** `document.documentElement.classList.add/remove('dark')`
- **Icons:** `lucide-react`

---

## LocalStorage Keys

| Key | Content |
|-----|---------|
| `rustflow_settings` | JSON: `{ apiKey, model, maxLines, briefingLanguage }` |
| `rustflow_theme` | `'dark'` or `'light'` |

---

## Build & Dev Server

- **Build:** Vite 6 with `@vitejs/plugin-react`
- **Port:** From `PORT` env var, default `3847` (from `vite.config.ts`)
- **Host:** `0.0.0.0` (network access)
- **Env:** `loadEnv(mode, '.', '')` — loads `.env` files. `GEMINI_API_KEY` exposed as `process.env.API_KEY`

---

## Dependencies

| Package | Purpose |
|---------|---------|
| react, react-dom | 18.2.0 |
| @google/genai | Google Gemini SDK |
| lucide-react | Icons |
| mermaid | Diagram rendering in briefing (lazy-loaded) |
| pptxgenjs | PowerPoint export (lazy-loaded) |
| ignore | .gitignore parsing for folder import |
| vite | Build tool |
| typescript | ~5.8.2 |

---

## Conventions

1. **File identity:** By `path` string. Updates must sync `currentFile` and `files[]`.
2. **Analysis caching:** Per-file cache. Switching files restores cached results.
3. **Component IDs:** AI-generated (e.g. `comp-0`). Fallback: `comp-${index}` in `gemini.ts`.
4. **No routing:** Single-page, state-driven panel switching.
5. **No tests:** No test config.
6. **No CI/CD:** No pipeline config.
