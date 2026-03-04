
# Development Guide

This document is intended for developers who want to contribute to or maintain **Archlyze**.

## 📂 Project Structure

```
/
├── index.html          # Entry point
├── index.tsx           # React Root
├── App.tsx             # Main Layout & State Management
├── types.ts            # TypeScript Interfaces (Data Models)
├── constants.ts        # Example code snippets
├── utils/
│   ├── gemini.ts       # AI Integration logic (Prompt Engineering)
│   └── export.ts       # Markdown generation logic
└── components/
    ├── CodePanel.tsx       # Syntax highlighter & Code display
    ├── AnalysisPanel.tsx   # Left/Right panel for issues & components
    ├── VisualPanel.tsx     # Image display logic
    ├── SettingsModal.tsx   # Config & API Key management
    ├── FolderImportModal.tsx # File filtering & gitignore parsing
    ├── FileExplorer.tsx    # Sidebar tree view
    └── LoadingOverlay.tsx  # Analysis progress state
```

## 🧠 State Management

The application uses a central state object in `App.tsx` defined by the `AppState` interface in `types.ts`.

*   **`files`**: Array of `ProjectFile` objects.
    *   Each `ProjectFile` contains its own `content` and cached `analysis` result.
*   **`currentFile`**: Reference to the currently active file in the editor/viewer.
*   **`status`**: An enum (`IDLE`, `ANALYZING`, `FIXING`, etc.) that drives UI loading states.
*   **`settings`**: Persisted in `localStorage`, contains the API Key and Model selection.

## 🤖 AI Integration (`utils/gemini.ts`)

We use the `@google/genai` SDK.

1.  **`analyzeRustCode`**: (Legacy name, now supports multi-lang).
    *   It sends a system prompt asking for a JSON response.
    *   It uses `responseSchema` to strictly enforce the output format matching `AnalysisResult`.
2.  **`generateArchitectureDiagram`**:
    *   It uses the `gemini-2.5-flash-image` model.
    *   It creates a text prompt describing the code structure and requests a diagram.
3.  **`generateFix` / `generateUnitTests`**:
    *   These use standard text generation to return code snippets.

## ➕ Adding a New Language

To improve support for a specific language (e.g., Swift):

1.  **Update `constants.ts`**: Add an example snippet `EXAMPLE_SWIFT_APP`.
2.  **Update `App.tsx`**: Add the option to the dropdown menu.
3.  **Update `components/CodePanel.tsx`**: Add Swift-specific keywords to the `SyntaxHighlight` component array.
4.  **Update `utils/gemini.ts`**: The prompt is already generic ("Detect the programming language"), but you can tune the prompt to ask for specific frameworks (e.g., "Identify CocoaPods/SPM dependencies").

## 🎨 Styling

*   **Tailwind CSS**: Used for all styling.
*   **Dark Mode**: Implemented via a `dark` class on the root `<html>` element. Colors are defined with `dark:` variants (e.g., `bg-white dark:bg-zinc-900`).
*   **Rust Color**: Custom color defined in `tailwind.config` within `index.html`.

## 📦 Deployment

This is a static Single Page Application (SPA).

1.  **Build**: Run your bundler's build command (e.g., `vite build`).
2.  **Host**: Upload the `dist/` or `build/` folder to any static host:
    *   Vercel
    *   Netlify
    *   GitHub Pages
    *   AWS S3

No backend server is required.
