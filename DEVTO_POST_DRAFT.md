# DEV Education Track: Build Apps with Google AI Studio — Post Draft

*This post is my submission for [DEV Education Track: Build Apps with Google AI Studio](https://dev.to/deved/build-apps-with-google-ai-studio).*

---

## What I Built

**Archlyze** is a browser-only SPA that uses Google Gemini to analyze source code (Rust, Python, JS/TS, Go, and more): it extracts components and dependencies, flags issues with severity, suggests fixes and unit tests, and generates flowcharts/UML/data-flow diagrams via `gemini-2.5-flash-image`. We started from a detailed prompt in AI Studio (refined with Perplexity and Gemini), then finished and extended the app in Cursor with folder import, `.gitignore` parsing, session history, model selection, and Markdown export.

---

## Demo

<!-- TODO: Add 1–2 screenshots of the app (e.g. code panel + analysis, or visual panel with a diagram) and replace the placeholder below. -->

![Archlyze](https://placehold.co/800x400/ce422b/white?text=Archlyze)

<!-- TODO: Add link to your applet (Google AI Studio) or deployed URL (e.g. Vercel/Netlify) when available. -->

- **Live app:** [Add your deployed URL or AI Studio applet link here]
- **Repo:** [Add your GitHub repo URL here]

---

## My Experience

**Starting in AI Studio.** We began by drafting the concept and prompt with different models (Perplexity and Gemini), then took it into Google AI Studio to build the first version. We hit a recurring issue early on: **React and tooling versions**. The generated app kept failing to run or build, and we had to iterate many times (10+ attempts) before we got a working setup — that taught me how important it is to pin or align React, Vite, and any AI-generated dependencies when bringing an AI Studio project into a local or different environment.

**Evolving the idea.** Once the base was stable, we shifted from Rust-only to multi-language support and added a lot of features: folder import, `.gitignore`-aware filtering, session history, dependency detection, issue severity, auto-fix, unit test generation, and diagram types. Doing this in Cursor (with the same codebase) felt natural: AI Studio gave us the initial structure and Gemini integration; Cursor helped us refactor, extend, and keep the code consistent.

**Structured output and “thinking” models.** The biggest technical takeaway was **relying on a strict JSON schema** for analysis. Without explicit `required` fields and clear descriptions in the `responseSchema`, Gemini 2.5 sometimes returned minimal or inconsistent JSON. Once we defined the schema properly, the analysis results became reliable enough to drive the UI (components, issues, dependencies). I also learned that Gemini 2.5’s “thinking” phase means longer response times, so we added **scaled timeouts** (e.g. 60s for small files, 180s for large ones) and loading states so the app doesn’t feel broken while the model is reasoning.

**Surprises.** (1) How much the app could do **without a backend** — API key in the browser, direct calls to Gemini, and LocalStorage for settings and theme made the architecture simple. (2) Image generation (`gemini-2.5-flash-image`) has a limited free-tier quota, so we added a small warning in the UI and made diagrams an optional, best-effort feature. (3) Naming and UX details (e.g. “RustFlow” in a few legacy labels and keys) stuck around as we pivoted to Archlyze; it was a good reminder to do a quick branding pass when the product scope changes.

Overall, the track was a solid way to go from “idea + prompt” to a real SPA: AI Studio for fast prototyping and Gemini integration, then Cursor to harden and extend it into something we’d actually use and submit.

---

<!-- Don't forget to add a cover image to your post (if you want). -->

<!-- Thanks for participating! -->
