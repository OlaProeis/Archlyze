# AI Context — Archlyze

> Use this document when working with an AI agent on this project. It contains architecture details, file responsibilities, state management patterns, API integration specifics, and known conventions.

---

## Project Overview

**Archlyze** is a browser-based (SPA) AI-powered code analysis tool. Users upload or paste source code files, and the app uses Google Gemini 3 models to perform static analysis, detect issues, extract components/dependencies, generate fixes, write unit tests, and create architecture diagrams.

- **Stack**: React 18, TypeScript, Tailwind CSS (CDN), Vite
- **AI SDK**: `@google/genai` (Google Gemini)
- **No backend** — runs entirely in the browser. API calls go directly from browser to Google's API.

---

## File Map & Responsibilities

```
├── index.html           → Entry point. Contains Tailwind CDN config, custom colors (rust, graphite), 
│                           importmap for ESM dependencies, custom scrollbar CSS.
├── index.tsx            → React root mount (StrictMode).
├── App.tsx              → Main application component. Owns ALL top-level state (AppState).
│                           Handles file upload, folder import, analysis orchestration, 
│                           panel resizing, theme toggle, settings persistence.
├── types.ts             → All TypeScript interfaces and enums:
│                           AnalysisStatus, IssueSeverity, CodeIssue, CodeComponent,
│                           Dependency, AnalysisResult, AppSettings, ProjectFile, AppState, DiagramType
├── constants.ts         → Example code snippets (Rust CLI, Python Data, JS Express).
├── vite.config.ts       → Vite config. Exposes GEMINI_API_KEY env var as process.env.API_KEY.
│                           Dev server on port 3000, host 0.0.0.0.
├── utils/
│   ├── gemini.ts        → All AI integration logic. Four exported async functions:
│   │                       - analyzeRustCode(): Structured JSON analysis with responseSchema
│   │                       - generateArchitectureDiagram(): Image generation via gemini-2.5-flash-image
│   │                       - generateFix(): Text generation for issue fixes
│   │                       - generateUnitTests(): Text generation for unit tests
│   │                       Also: getAiClient(), cleanJson(), withTimeout() helpers.
│   └── export.ts        → downloadMarkdownReport(): Generates and downloads a .md report file.
├── components/
│   ├── CodePanel.tsx     → Code viewer with line numbers, component highlighting, issue underlines.
│   │                       Includes SyntaxHighlight sub-component (keyword-based, multi-language).
│   │                       Togglable edit mode (textarea).
│   ├── AnalysisPanel.tsx → Displays analysis results: summary, dependencies, issues, components.
│   │                       Sub-components: ComponentCard, IssueCard.
│   │                       Has export report button, fix issue (Wand), generate test (TestTube) actions.
│   ├── VisualPanel.tsx   → Diagram type selector (Flowchart/UML/Data Flow), generate/regenerate button,
│   │                       displays generated image, download link.
│   ├── SettingsModal.tsx → API key input, model selection (Flash/Pro), max lines slider.
│   │                       Settings persisted to localStorage under 'rustflow_settings'.
│   ├── FolderImportModal.tsx → Folder upload with .gitignore parsing (via `ignore` npm package),
│   │                       extension filtering, stats (total/ignored/to-import), select all/clear.
│   ├── FileExplorer.tsx  → Sidebar tree view. Builds tree from flat file list. Collapsible folders.
│   │                       Mutates tree node directly for toggle (forces re-render via spread).
│   ├── CodeResultModal.tsx → Modal for displaying generated fix/test code with copy-to-clipboard.
│   └── LoadingOverlay.tsx → Animated step-by-step loading screen during analysis.
```

---

## State Management

All state lives in `App.tsx` as a single `useState<AppState>` object. There is no Context, no Redux.

### Key State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `files` | `ProjectFile[]` | All loaded files. Each has `content`, `analysis`, `diagramUrl`. |
| `currentFile` | `ProjectFile \| null` | The actively viewed/edited file. |
| `status` | `AnalysisStatus` enum | Drives loading states: IDLE, ANALYZING, GENERATING_IMAGE, FIXING, GENERATING_TESTS, COMPLETE, ERROR |
| `activePanel` | `'code' \| 'analysis' \| 'visual'` | Controls mobile tab navigation and panel visibility. |
| `selectedComponentId` | `string \| null` | Which component is highlighted in both code viewer and analysis panel. |
| `isDarkMode` | `boolean` | Theme toggle. Persisted to localStorage (`rustflow_theme`). |
| `isEditing` | `boolean` | Code editor toggle (view vs edit mode). |
| `settings` | `AppSettings` | API key, model name, maxLines. Persisted to localStorage (`rustflow_settings`). |
| `sidebarWidth` | `number` | Panel split percentage (20-80 range). |
| `modalContent` | `object` | Controls CodeResultModal (fix/test results). |
| `showSettings` | `boolean` | Settings modal visibility. |
| `showHistory` | `boolean` | History sidebar visibility. |

### State Update Pattern

State is updated via `setState(s => ({ ...s, ... }))` spread pattern everywhere. When a file's analysis or diagram changes, both `currentFile` and the matching entry in `files[]` array are updated together.

---

## AI Integration Details (`utils/gemini.ts`)

### Models Used

| Function | Model | Output Type |
|----------|-------|-------------|
| `analyzeRustCode` | User-selected (default `gemini-2.5-flash`) | Structured JSON via `responseSchema` |
| `generateArchitectureDiagram` | `gemini-2.5-flash-image` (hardcoded) | Inline image (base64 data URL) |
| `generateFix` | User-selected (default `gemini-2.5-flash`) | Plain text |
| `generateUnitTests` | User-selected (default `gemini-2.5-flash`) | Plain text |

### Available Models (configured in SettingsModal.tsx)

**Free Tier**: `gemini-2.5-flash` (default), `gemini-2.5-pro`, `gemini-2.5-flash-lite`
**Paid / Preview**: `gemini-2.5-pro-preview-05-06`, `gemini-3-flash-preview`, `gemini-3-pro-preview`
**Custom**: Users can enter any model ID string.

### Timeouts (dynamic for analysis)

- Analysis: 60s (<100 lines), 120s (<500 lines), 180s (500+ lines) — scaled via `getAnalysisTimeout()`
- Diagram generation: 45 seconds
- Fix generation: 30 seconds
- Test generation: 45 seconds

Gemini 2.5 models are "thinking" models with an internal reasoning phase before output, requiring longer timeouts than older models.

### API Key Resolution

Priority: `settings.apiKey` (user-provided) > `process.env.API_KEY` (env var from Vite config, sourced from `GEMINI_API_KEY`). The `process.env` access is wrapped in try/catch for safe usage outside Vite.

### Response Schema

`analyzeRustCode` uses a strict JSON `responseSchema` with `required` fields and `description` annotations at every level to enforce output structure matching `AnalysisResult`. Without `required` arrays, Gemini 2.5 models return minimal/empty data — this is critical. The schema is defined as separate objects (`issueSchema`, `componentSchema`, `dependencySchema`, `analysisSchema`) for readability.

---

## Styling & Theming

- **Tailwind CSS via CDN** (`<script src="https://cdn.tailwindcss.com">` in index.html).
- **NOT using Tailwind CLI/PostCSS build** — the CDN version with inline config.
- **Custom colors** defined in `tailwind.config` inside `index.html`:
  - `rust`: `#CE422B` (primary accent), `rust-dark`: `#A63321`, `rust-light`: `#E65D45`
  - `graphite`: `#2A2C31`, `graphite-dark`: `#1E1F22`, `graphite-light`: `#3E4148`
- **Dark mode**: Controlled via `class` strategy. `document.documentElement.classList.add/remove('dark')`.
- **Custom scrollbar** styles in `index.html` `<style>` block.

---

## LocalStorage Keys

| Key | Content |
|-----|---------|
| `rustflow_settings` | JSON: `{ apiKey, model, maxLines }` |
| `rustflow_theme` | String: `'dark'` or `'light'` |

> Note: Legacy naming (`rustflow_*`) from when the app was Rust-focused.

---

## Important Conventions & Patterns

1. **File identity**: Files are identified by `path` (string). When updating a file's analysis/diagram, both `currentFile` and the matching entry in `state.files` must be updated.
2. **Analysis caching**: Each `ProjectFile` caches its `analysis` and `diagramUrl`. Switching files restores cached results instantly.
3. **Component IDs**: AI-generated component IDs (e.g., `comp-0`). If AI omits IDs, `gemini.ts` assigns them as `comp-${index}`.
4. **Syntax highlighting**: Custom regex-based keyword matching (not AST-based). Covers Rust, JS/TS, Python, Vue, and common keywords. Located in `CodePanel.tsx` `SyntaxHighlight` component.
5. **Folder upload**: Uses `webkitdirectory` attribute (non-standard but widely supported). Files go through `FolderImportModal` for filtering before being loaded.
6. **No routing**: Single-page app with no router. Panel switching is state-driven.
7. **No tests**: No test files or test configuration exist.
8. **No CI/CD**: No pipeline configuration.
9. **Icon library**: `lucide-react` for all icons.

---

## Common Tasks for AI Agents

### Adding a new AI feature
1. Add the async function in `utils/gemini.ts` following the existing pattern (use `getAiClient`, `withTimeout`).
2. Add a new `AnalysisStatus` enum value in `types.ts` if it needs a loading state.
3. Wire the handler in `App.tsx` and pass it down to the relevant component.

### Adding a new language example
1. Add the code string in `constants.ts`.
2. Add the option to the `<select>` dropdown in `App.tsx` header.

### Adding a new diagram type
1. Add value to `DiagramType` enum in `types.ts`.
2. The `VisualPanel` renders all `DiagramType` values dynamically.

### Modifying settings
1. Update `AppSettings` interface in `types.ts`.
2. Update `DEFAULT_SETTINGS` in `App.tsx`.
3. Add UI controls in `SettingsModal.tsx`.
4. Settings auto-persist via `updateSettings()` in `App.tsx`.

### Adding a new component type for analysis
1. Add the type string to the `CodeComponent.type` union in `types.ts`.
2. Add the same string to the `enum` array in the `responseSchema` in `gemini.ts`.
3. Add an icon mapping in `AnalysisPanel.tsx` `ComponentCard` `iconMap`.
4. Optionally add keywords to `SyntaxHighlight` in `CodePanel.tsx`.

---

## Dependency Versions

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI framework |
| react-dom | 18.2.0 | DOM rendering |
| lucide-react | 0.344.0 | Icon library |
| @google/genai | latest | Google Gemini AI SDK (note: `latest` is risky, should be pinned) |
| ignore | 5.3.1 | .gitignore rule parsing |
| vite | ^6.2.0 | Build tool / dev server (port 3000) |
| @vitejs/plugin-react | ^5.0.0 | React JSX transform |
| typescript | ~5.8.2 | Type checking |

---

## Known Quirks

- The `analyzeRustCode` function name is a legacy artifact — it analyzes any language.
- `export.ts` report title says "RustFlow" (legacy branding). LocalStorage keys use `rustflow_*` prefix (legacy).
- `index.html` has an importmap for ESM dependencies (used by Google AI Studio's runtime). When running via Vite, the importmap is ignored in favor of `node_modules`.
- `index.html` references `<link rel="stylesheet" href="/index.css">` but no `index.css` file exists (harmless 404).
- `FileExplorer` toggles folders by directly mutating the tree node, then forcing re-render with a spread copy of root.
- Diagram generation uses `gemini-2.5-flash-image` (hardcoded, not user-selectable) which has limited free-tier quota. A warning banner is shown in the VisualPanel UI.
- The `export.ts` WARNING icon is `'Vk'` instead of a proper emoji (typo).
