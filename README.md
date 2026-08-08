# Captions

An Obsidian plugin for previewing local image and pipe-table captions in Reading view and Live Preview.

## 0.0.9

Captions now uses one automatic caption pipeline. There are no syntax-engine switches: Wiki image embeds, standalone standard Markdown images, and supported pipe-table captions are detected locally without changing note source.

The settings page provides shared alignment, font style, relative font size, spacing, figure/table positions, and an optional file-name fallback. Settings follow Obsidian's configured language in English and Simplified Chinese. Version `0.0.9` starts from new defaults and does not migrate settings saved by earlier releases.

Cross-reference preview, automatic numbering, and generated ID anchors have been removed. Text such as `[@fig:diagram]`, `[@tbl:results]`, `@fig-diagram`, and `@tbl-results` remains unchanged.

### Wiki images

A Wiki image alias is its caption. A final numeric or `widthxheight` value remains an Obsidian image size and is excluded from the caption; other pipes are preserved.

```markdown
![[landscape.png|Swiss Alps]]
![[landscape.png|Swiss Alps|300]]
![[map.png|North | South|300x200]]
```

A size by itself does not create a caption unless file-name fallback is enabled:

```markdown
![[landscape.png|400]]
```

### Markdown images

A standard Markdown image must occupy its own line. Its alt text is the caption. Inline images remain unchanged.

```markdown
![System architecture](assets/architecture.png)
```

When file-name fallback is enabled, an empty-alt standalone image uses its decoded file name. Obsidian-generated file-name alt text, a bare image extension, and pure dimensions are not treated as explicit captions.

### Pipe tables

Pipe-table captions can appear before or after the table and can use `:` or `Table:`. Captions are displayed without labels or numbering.

```markdown
: Model results

| Model | Accuracy |
| --- | ---: |
| A | 92% |
```

```markdown
| Model | Accuracy |
| --- | ---: |
| A | 92% |

Table: Model results
```

## Development

```bash
npm ci
npm run dev
```

Before release, run:

```bash
npm run test:unit
npm run lint
npm run build
npm run release:check
```

Release assets are `main.js`, `manifest.json`, and `styles.css`. `main.js` is generated locally or in CI and is not tracked by Git.
