# Archlyze — Feature Documentation

This document describes the features of Archlyze as implemented in the codebase.

---

## Code Analysis

### Static Analysis

- **Location:** `utils/gemini.ts` → `analyzeRustCode()`
- **Model:** User-selected (default `gemini-2.5-flash`)
- **Output:** Structured JSON via `responseSchema` matching `AnalysisResult`

The analysis extracts:

1. **Language detection** — Automatically detects the programming language
2. **Summary** — Detailed summary of purpose, architecture, and quality
3. **Components** — Functions, classes, structs, modules, methods, interfaces, hooks, event handlers, etc. Each has:
   - `id`, `type`, `name`, `startLine`, `endLine`, `description`
   - `dependencies` (internal component references)
   - `issues` (component-level issues)
4. **Overall issues** — Security vulnerabilities, performance problems, anti-patterns, code style issues, potential bugs
5. **Dependencies** — External libraries (Crates, NPM, PyPI) with descriptions

**Severity levels:** `INFO`, `WARNING`, `ERROR` (from `types.ts` → `IssueSeverity`)

**Max lines:** Configurable in Settings (500–20,000). Code is truncated before sending to the AI.

**Timeouts:** Scaled by file size — 60s (<100 lines), 120s (<500 lines), 180s (500+ lines).

---

## Project Import

### File Upload

- Single file upload via header
- Content read via `FileReader` API

### Folder Import

- **Location:** `components/FolderImportModal.tsx`
- **Mechanism:** Uses `webkitdirectory` attribute (browser folder picker)
- **Filtering:** Parses `.gitignore` rules via the `ignore` npm package
- **Extension filter:** Configurable by file extension
- **Stats:** Shows total files, ignored count, to-import count
- **Actions:** Select all / Clear selection

---

## Code Viewer & Editor

### CodePanel

- **Location:** `components/CodePanel.tsx`
- **Features:**
  - Line numbers
  - Component range highlighting (click component in analysis panel)
  - Issue underlines (wavy decoration by severity)
  - Deep-linking: clicking a component scrolls and highlights in code
- **Syntax highlighting:** Custom regex-based keyword matching (not AST)
  - Languages: Rust, JS/TS, Python, Vue, common keywords
  - Sub-component: `SyntaxHighlight`
- **Edit mode:** Toggle between view and textarea for inline editing before re-analysis

---

## Issue Actions

### Auto-Fix (Wand)

- **Location:** `utils/gemini.ts` → `generateFix()`
- **Trigger:** Wand icon on issue cards (WARNING/ERROR severity)
- **Output:** Plain text code snippet
- **Display:** `CodeResultModal` with copy-to-clipboard
- **Timeout:** 30 seconds

### Unit Test Generation (Test Tube)

- **Location:** `utils/gemini.ts` → `generateUnitTests()`
- **Trigger:** Test tube icon on component cards
- **Output:** Plain text unit test code
- **Display:** `CodeResultModal` with copy-to-clipboard
- **Timeout:** 45 seconds

---

## Architecture Diagrams

### Visual Panel

- **Location:** `components/VisualPanel.tsx`
- **Diagram types:** Flowchart, UML, Data Flow (from `DiagramType` enum in `types.ts`)
- **Model:** `gemini-2.5-flash-image` (hardcoded, not user-selectable)
- **Location:** `utils/gemini.ts` → `generateArchitectureDiagram()`
- **Output:** Base64 data URL (inline image)
- **Actions:** Generate, Regenerate, Download as PNG
- **Note:** Limited free-tier quota; warning banner shown in UI
- **Timeout:** 45 seconds

---

## Executive Briefing

### Overview

- **Trigger:** "Generate Briefing" button in Analysis Panel (when analysis is complete)
- **Pipeline:** On-demand, separate from standard analysis — does not affect analysis latency

### Generation Pipeline

Three Gemini calls run in parallel via `Promise.allSettled`:

1. **`generateExecutiveBriefing()`** — Plain Markdown briefing in plain English
2. **`generateMermaidDiagram()`** — Raw Mermaid syntax for architecture
3. **`generateCodeWalkthrough()`** — Structured JSON `WalkthroughBlock[]` (line ranges + explanations)

### Briefing Content

- **Location:** `utils/briefing.ts` → `buildSlideMarkdown()`
- **Slides:** Title, Executive Summary, Mermaid diagram, Code Walkthrough (two-column), Security Scorecard, Dependencies, Recommendations

### Security Scorecard

- **Location:** `utils/briefing.ts` → `computeSecurityScore()`, `computeComponentHealth()`
- **Formula:** `score = max(0, 100 - errors×10 - warnings×3 - infos×1)`
- **Thresholds:** 90–100 Excellent, 70–89 Good, 50–69 Moderate, 30–49 Concerning, 0–29 Critical

### Briefing Panel

- **Location:** `components/BriefingPanel.tsx`
- **Features:**
  - Full-screen presentation overlay
  - Slide-by-slide navigation (keyboard + click)
  - Progress bar
  - Mermaid rendering (lazy-loaded)
  - Edit mode for Markdown source
  - Two-column walkthrough layout (code left, explanation right) via `:::walkthrough` directive

### Export Options

- **Markdown:** `downloadBriefingMarkdown()` in `utils/briefing.ts`
- **PowerPoint:** `exportToPptx()` via pptxgenjs (lazy-loaded)
- **PDF:** Browser print from preview

### Briefing Language

- **Setting:** `briefingLanguage` in `AppSettings` (Settings Modal)
- **Presets:** 15+ languages (English, Norwegian, Japanese, etc.) + Custom
- **Persisted:** `localStorage` under `rustflow_settings`

---

## File Explorer & Session History

### File Explorer

- **Location:** `components/FileExplorer.tsx`
- **Features:** Hierarchical tree view from flat file list, collapsible folders
- **Toggle:** Header button to show/hide sidebar

### Session History

- **Data:** `analyzedFiles` — files with cached `analysis`, sorted by `timestamp`
- **Display:** History sidebar with timestamps
- **Caching:** Each `ProjectFile` caches `analysis`, `diagramUrl`, `briefingMarkdown`, `mermaidDiagram`, `walkthroughBlocks`

---

## Export & Share

### Markdown Report

- **Location:** `utils/export.ts` → `downloadMarkdownReport()`
- **Content:** Summary, global issues, component analysis, dependencies
- **Filename:** `rustflow-report.md` (legacy naming)

### Share

- Copies text summary (language, components, issues, dependencies) to clipboard

---

## Settings

- **Location:** `components/SettingsModal.tsx`
- **Fields:**
  - API key (user-provided)
  - Model selection (Flash, Pro, Flash-Lite, Pro Preview, Gemini 3 Flash/Pro, Custom)
  - Max lines (500–20,000)
  - Briefing language (15 presets + custom)
- **Persistence:** `localStorage` → `rustflow_settings`
- **API key resolution:** `settings.apiKey` > `process.env.API_KEY` (from `GEMINI_API_KEY` env var)

---

## Theming & Layout

- **Dark/Light mode:** Toggle in header, persisted to `localStorage` (`rustflow_theme`)
- **Custom colors:** `rust` (#CE422B), `graphite` (#2A2C31) in Tailwind config (index.html)
- **Resizable panels:** Drag-to-resize split (20–80% range)
- **Mobile:** Tab navigation (Code / Analysis / Visual)

---

## Example Code Snippets

- **Location:** `constants.ts`
- **Presets:** `EXAMPLE_RUST_CLI`, `EXAMPLE_PYTHON_DATA`, `EXAMPLE_JS_EXPRESS`
- **Load:** Dropdown in header; loads with correct filename and language metadata
