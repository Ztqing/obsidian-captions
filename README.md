<div align="center">
  <h1>Captions</h1>
  <p><strong>An Obsidian plugin for previewing local image and pipe-table captions in Reading view and Live Preview.</strong></p>
  <p>English | <a href="README_ZH.md">中文</a> | <a href="CHANGELOG.md">Changelog</a></p>
</div>

## Supported syntax

### Wiki image embeds

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

### Standard Markdown images

A standard Markdown image must occupy its own line. Its alt text is the caption; inline images remain unchanged.

```markdown
![System architecture](assets/architecture.png)
```

When file-name fallback is enabled, an empty-alt standalone image uses its decoded file name. Obsidian-generated file-name alt text, a bare image extension, and pure dimensions are not treated as explicit captions.

### Pipe-table captions

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

## Settings and behavior

The settings page provides shared alignment, font style, relative font size, spacing, figure/table positions, and an optional file-name fallback. Font size and caption spacing use direct numeric entry, with their 85% and 12px defaults shown as placeholders. Clearing either field uses its default; caption spacing separates captions from their images or tables without replacing the surrounding theme spacing. Settings follow Obsidian's configured language in English and Simplified Chinese.

Captions are rendered locally without changing note source. Reading view and Live Preview use the same caption rules and appearance. Captioned figures and tables keep the same surrounding paragraph spacing as other Reading view blocks. Source mode, ordinary links, inline Markdown images, unmatched tables, and cross-reference-looking text remain unchanged.

## Compatibility and limitations

Captions supports desktop and mobile Obsidian installations using the Obsidian 1.10.3 baseline. Processing is local-only and does not make network requests.

## Development and verification

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

## Acknowledgements

Thanks to [wk-image-caption](https://github.com/bcs1037/wk-image-caption) for its prior work and inspiration.
