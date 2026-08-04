# Changelog

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
