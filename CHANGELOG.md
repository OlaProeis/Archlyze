# Changelog

## [0.2.0] - 2025-03-04

### Added

- **Executive Briefing**: Generate management-ready presentations from code analysis.
  - "Generate Briefing" in the analysis panel.
  - Executive translation in plain language for non-technical stakeholders.
  - Code walkthrough: side-by-side source and plain-English explanations.
  - Auto-generated Mermaid flowchart in the presentation.
  - Security scorecard (0–100) and per-component health table.
  - Briefing language configurable in Settings (English, Norwegian, Japanese, custom).
  - Export as Markdown, PowerPoint (.pptx), or PDF (browser print).
  - Editable Markdown before export.

### Changed

- Model selection expanded (Gemini 2.5 Flash/Pro, 2.5 Flash-Lite, 3.x previews, custom model ID).
- Max lines setting (500–20,000) for analysis size limit.
- Architecture and docs updated for briefing pipeline and lazy-loaded Mermaid/pptxgenjs.
