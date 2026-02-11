
# Archlyze

**Archlyze** is a modern, AI-powered web application for comprehensive code analysis. It leverages **Google Gemini** models (2.5 Flash, 2.5 Pro, and more) to perform deep static analysis, detect bugs/anti-patterns, identify dependencies, and generate professional architecture diagrams from your source code.

Designed for multiple languages (Rust, Python, JavaScript/TypeScript, Go, Java, C++), it runs entirely in the browser (SPA).

![Archlyze](assets/Archlyze.png)

## 🚀 Key Features

*   **Multi-Language Support**: Automatically detects and analyzes Rust, Python, JS/TS, and more.
*   **Smart Project Import**: 
    *   Parse `.gitignore` rules to filter irrelevant files (node_modules, target, etc.).
    *   Bulk filter by file extension with a visual import modal (stats, select all/clear).
*   **Deep Static Analysis**: Extracts functions, classes, structs, modules, interfaces, hooks, event handlers, and more. Uses a strict JSON response schema with required fields for reliable structured output.
*   **Session History**: Caches analysis results per file. A history sidebar lets you switch between recently analyzed files with timestamps.
*   **Dependency Explorer**: Identifies external libraries (Crates, NPM packages, Pypi) and explains their usage.
*   **Intelligent Issue Detection**:
    *   Finds security vulnerabilities.
    *   Highlights performance bottlenecks.
    *   Flags anti-patterns and code style issues.
    *   Issues are categorized by severity (INFO / WARNING / ERROR) with actionable suggestions.
*   **Auto-Fix & Unit Tests**:
    *   **Wand Tool**: Generates AI-powered fixes for detected issues (WARNING/ERROR severity).
    *   **Test Tube**: Automatically writes unit tests for specific components.
    *   Generated code is shown in a modal with **copy-to-clipboard** support.
*   **Interactive Code Viewer**: Custom syntax highlighter with line numbers, component range highlighting, issue underlines (wavy decoration), and deep-linking to analysis results.
*   **Inline Code Editing**: Toggle edit mode to modify code directly in a textarea before re-analyzing.
*   **AI Architecture Visualization**: Generates diagrams using `gemini-2.5-flash-image`:
    *   **Flowcharts**: Logic flow.
    *   **UML**: Class relationships.
    *   **Data Flow**: Data movement.
    *   Diagrams can be downloaded as PNG.
    *   Note: Image generation has limited free-tier quota. A warning banner is shown in the UI.
*   **File Explorer**: Hierarchical tree view sidebar with collapsible folders, toggleable from the header.
*   **Dark / Light Theme**: Full dark mode support with persistent theme preference.
*   **Model Selection**: Choose from multiple Gemini models in settings:
    *   **Free Tier**: Gemini 2.5 Flash (default), Gemini 2.5 Pro, Gemini 2.5 Flash-Lite.
    *   **Paid / Preview**: Gemini 2.5 Pro Preview, Gemini 3 Flash, Gemini 3 Pro.
    *   **Custom**: Enter any model ID for paid API tiers with access to newer models.
*   **Max Lines Configuration**: Configurable analysis size limit (500–20,000 lines) via settings. Code is truncated before sending to the AI to prevent token limit errors.
*   **Share**: Copy a text summary of the current analysis (language, components, issues, dependencies) to clipboard.
*   **Example Code Snippets**: Pre-loaded examples for Rust (CLI tool), Python (data analysis), and Node.js (Express server) — each loads with the correct filename and language metadata.
*   **Resizable Panels**: Drag-to-resize split between code and analysis panels (desktop).
*   **Mobile Responsive**: Dedicated mobile tab navigation (Code / Analysis / Visual).
*   **Export**: Download full analysis reports as Markdown.

![Key Features](assets/archlyze-features.png)

## 🛠️ Getting Started

### Prerequisites

You need a **Google Gemini API Key** (free tier works for analysis).
1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Create a free API key.

**Model choice**: The app defaults to **Gemini 2.5 Flash** for analysis, fixes, and tests. If you have **billing enabled** on your Google Cloud / Gemini API, you can switch to **Gemini 3.0** (e.g. Gemini 3 Flash or Pro) in **Settings → Model** for analysis and generation.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/archlyze.git
    cd archlyze
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application**:
    ```bash
    npm run dev
    ```

4.  **Open in Browser**:
    Navigate to `http://localhost:3000`. Click the **Settings** icon and paste your API Key.

### Optional: Environment Variable

You can also provide your API key via environment variable instead of the Settings UI. Create a `.env` file in the project root:
```
GEMINI_API_KEY=your_key_here
```

## 📝 Usage Notes

**Model compatibility**:
*   **Default**: The app uses **Gemini 2.5 Flash** by default for code analysis, fix generation, and unit tests. Diagram generation uses `gemini-2.5-flash-image`.
*   **Gemini 3.0**: If you have **billing enabled** on your Google API (Google AI Studio or Cloud), you can select **Gemini 3 Flash** or **Gemini 3 Pro** in **Settings → Model** for analysis and generation.
*   Diagram image generation uses `gemini-2.5-flash-image` (fixed) and has limited free-tier quota. If you hit the limit, wait a few minutes or upgrade your API plan.
*   Gemini 3.x models require a paid API tier.

![Analysis Workflow](assets/archlyze-analysis-workflow.png)

**Analysis Timeouts**:
*   Small files (<100 lines): 60 second timeout.
*   Medium files (<500 lines): 120 second timeout.
*   Large files (500+ lines): 180 second timeout.
*   Gemini 2.5 models are "thinking" models — they reason internally before generating output, which takes longer than older models.

**Folder Upload Warning**: 
When importing large folders (e.g., an entire project root), your browser may display a security warning asking *"Upload 500 files to this site?"*. 
*   This is a standard browser security feature. 
*   It is safe to proceed — files are processed in-memory and sent directly to the Gemini API; they are not stored on any intermediate server.

## 🏗️ Architecture

![Architecture](assets/archlyze-architecture.png)

-   **Frontend**: React 18, TypeScript, Tailwind CSS (CDN).
-   **AI Engine**: `@google/genai` SDK communicating directly with Gemini models.
    -   Analysis: User-selected model (default `gemini-2.5-flash`) with structured JSON `responseSchema`.
    -   Diagram generation: `gemini-2.5-flash-image` (hardcoded).
    -   Fix / Test generation: User-selected model with plain text output.
-   **Build Tool**: Vite 6 with React plugin. Dev server on port 3000.
-   **State Management**: React local state with a central `AppState` object (no Redux required).
-   **Persistence**: LocalStorage for user settings (API key, model, max lines) and theme preference.
-   **Icons**: Lucide React icon library.
-   **Gitignore Parsing**: `ignore` npm package for `.gitignore` rule processing during folder import.

## 🔒 Security Note

Your API Key is stored **locally in your browser's LocalStorage**. It is never sent to our servers. It is transmitted directly from your browser to Google's API endpoints.

## 🤝 Contributing

See [DEVELOPMENT.md](DEVELOPMENT.md) for technical details on how to extend the project.

## 📄 License

MIT
