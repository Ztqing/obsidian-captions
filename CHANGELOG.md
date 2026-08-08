# Changelog

All notable user-facing changes to Captions are documented here. This English changelog is the canonical source for GitHub Release notes.

## 0.0.9

### Improvements

- Automatically detect supported Wiki images, standalone Markdown images, and pipe-table captions without requiring syntax-engine selection.
- Use consistent caption text and appearance across supported image syntax in Reading view and Live Preview.
- Improve responsiveness when captions update in larger or frequently edited notes.
- Preserve table captions before or after pipe tables while leaving cross-reference-looking text unchanged.

### Breaking Changes

- Remove cross-reference previews, automatic numbering, generated anchors, syntax-engine switches, and numbered-label settings. Notes remain unchanged, but these features are no longer rendered by Captions.
- Reset settings saved before 0.0.9 to the new appearance and file-name-fallback defaults. Reconfigure any customized caption settings after upgrading.

## 0.0.8

### New Features

- Display the settings interface in English or Simplified Chinese according to Obsidian's language.
- Allow precise keyboard entry for numeric settings while preventing out-of-range values.

### Improvements

- Show the current numeric value beside each slider.
- Adjust caption font size in 1% increments without rounding typed values to 5% steps.
- Use 12px as the default spacing above and below captions.

## 0.0.7

### Fixes

- Ensure Pandoc and Quarto captions appear when Live Preview is first opened.
- Refresh Live Preview captions correctly after note edits, selection changes, editor-mode changes, or caption setting changes.

## 0.0.6

### New Features

- Add shared relative font-size and spacing controls for Wiki, Pandoc, and Quarto captions.
- Add bold as a caption font-style option.
- Allow figure and table captions to be positioned independently above or below their content.

### Improvements

- Apply the same caption appearance in Reading view and Live Preview without changing cross-reference styling.
- Organize settings into caption labels, appearance, and behavior while preserving existing saved values.
- Use bold text, 85% font size, and 8px spacing above and below as the defaults for new or incomplete settings.

## 0.0.5

### Improvements

- Use shared figure labels, table labels, alignment, font style, and file-name fallback across Wiki, Pandoc, and Quarto captions.
- Apply the same caption labels and appearance in Reading view and Live Preview.
- Use decoded file names as fallback captions for standalone Pandoc and Quarto images without explicit alt text.
- Keep numbered figure labels visible when file-name fallback is disabled, while leaving ordinary empty-alt images unchanged.
- Preserve compatible caption settings when upgrading from versions 0.0.2 through 0.0.4.

## 0.0.4

### New Features

- Add Quarto captions for standard Markdown figures and pipe tables in Reading view and Live Preview.
- Support Quarto `fig-` and `tbl-` identifiers with `@fig-...` and `@tbl-...` references.

### Improvements

- Allow the standard Markdown caption syntax to be set to `None`, `Pandoc`, or `Quarto` while keeping Wiki image captions independently configurable.
- Remove captions and references from the previous standard syntax immediately when switching to another option.
- Preserve the active Pandoc and Wiki behavior when upgrading from 0.0.3.

## 0.0.3

### New Features

- Add independent enable and disable controls for Wiki image captions and Pandoc captions.

### Improvements

- Apply changes to caption feature toggles immediately in Reading view and Live Preview without restarting Obsidian.
- Remove captions and references belonging to a feature when it is disabled without changing note content.
- Keep both existing caption features enabled when upgrading from 0.0.2.

## 0.0.2

### New Features

- Add Pandoc captions for standalone standard Markdown figures and pipe tables with or without IDs.
- Use native IDs as anchors without numbering them.
- Number matching `fig:` and `tbl:` targets independently within each note.
- Preview `[@fig:label]` and `[@tbl:label]` references for matching targets in Reading view and Live Preview.
- Keep Wiki image captions available as an independent feature.

### Fixes

- Display Wiki image captions when embedded images finish loading after Reading view has rendered.

## 0.0.1

### New Features

- Display captions for Obsidian Wiki image embeds in Reading view and Live Preview.
- Use Wiki image aliases as captions while allowing a final `width` or `widthxheight` size parameter.
- Add optional file-name fallback, caption alignment, and font-style settings.
- Leave standard Markdown images and tables unchanged.
