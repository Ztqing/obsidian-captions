# Changelog

## 0.0.9

- Replace the Wiki, Pandoc, and Quarto execution paths with one automatic caption pipeline for Wiki images, standalone Markdown images, and pipe tables.
- Share image-caption resolution, appearance rendering, Reading view coordination, and Live Preview model caching across supported image syntax.
- Parse Live Preview source only when the document changes and coalesce Reading view and Wiki DOM refreshes.
- Remove cross-reference replacement, automatic numbering, generated ID anchors, syntax-engine switches, and numbered-label settings.
- Keep cross-reference-looking text unchanged and preserve table captions before or after pipe tables.
- Reset pre-0.0.9 settings to the new appearance and file-name-fallback defaults.
- Preserve mobile support, local-only processing, generated release assets, and the Obsidian 1.10.3 baseline.

## 0.0.8

- Localize the settings UI to follow Obsidian's language, with English and Simplified Chinese translations.
- Keep numeric values visible beside their sliders and allow precise keyboard entry with range and step validation.
- Change font-size controls to 1% increments so typed values are preserved instead of rounded to 5% increments.
- Set the default spacing above and below captions to 12px.

## 0.0.7

- Fix Live Preview initialization by providing Pandoc and Quarto block decorations from CodeMirror state fields.
- Refresh Live Preview captions when the document, selection, editor mode, or extension configuration changes.
- Preserve existing caption spacing controls, settings data, mobile support, and the Obsidian 1.10.3 baseline.

## 0.0.6

- Add shared caption font-size and spacing controls for Wiki, Pandoc, and Quarto captions.
- Apply the same appearance in Reading view and Live Preview without styling cross-reference links.
- Separate caption labels, appearance, and behavior in the settings UI while preserving existing stored keys.
- Add bold as a caption font-style option and use it as the default for new or incomplete settings.
- Add independent above/below position controls for figure and table captions.
- Use cross-platform defaults of 85% font size, 8px spacing above, and 8px spacing below.

## 0.0.5

- Consolidate figure labels, table labels, alignment, font style, and file-name fallback into shared caption defaults.
- Apply shared labels and caption appearance consistently across Wiki, Pandoc, and Quarto in Reading view and Live Preview.
- Extend decoded file-name fallback to standalone Pandoc and Quarto images without explicit alt text.
- Preserve numbered figure labels when fallback is disabled and leave ordinary empty-alt images unchanged.
- Migrate validated `0.0.2` through `0.0.4` settings into the shared `captions` configuration.

## 0.0.4

- Add an independent Quarto engine for standard Markdown figures, pipe tables, and cross-references.
- Support Quarto `fig-` and `tbl-` identifiers with bare `@fig-...` and `@tbl-...` references in Reading view and Live Preview.
- Replace independent standard-engine toggles with a mutually exclusive `None`, `Pandoc`, or `Quarto` selection while keeping Wiki image captions independently configurable.
- Cleanly remove the previous standard engine's captions, references, anchors, decorations, observers, and cached render state when switching engines.
- Migrate `0.0.3` settings to the new engine selection without changing the active Pandoc or Wiki behavior.

## 0.0.3

- Add independent enable/disable controls for the Wiki image and Pandoc engines.
- Apply engine changes immediately in Reading view and Live Preview without restarting Obsidian.
- Remove engine-owned captions, references, anchors, observers, decorations, and cached render state when an engine is disabled.
- Migrate `0.0.2` settings with both existing engines enabled and validate persisted settings at runtime.

## 0.0.2

- Add Pandoc captions for standalone standard Markdown figures and pipe tables with or without IDs.
- Treat native IDs as anchors without numbering.
- Number only matching `fig:` and `tbl:` targets with independent counters in each note.
- Render canonical `[@fig:label]` and `[@tbl:label]` references only for crossref targets.
- Support Pandoc-crossref captions and references in Reading view and Live Preview.
- Preserve the 0.0.1 Wiki image caption behavior as an independent feature.
- Handle Wiki image embeds that finish rendering asynchronously in Reading view.

## 0.0.1

- Display captions for Obsidian Wiki image embeds in Reading view and Live Preview.
- Support caption aliases followed by `width` or `widthxheight` size parameters.
- Add optional file-name fallback, alignment, and font-style settings.
- Keep standard Markdown images and tables outside the 0.0.1 feature scope.
