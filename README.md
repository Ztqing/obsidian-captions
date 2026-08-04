# Captions

An Obsidian plugin for displaying captions for images and tables.

## 0.0.1

This release only captions Obsidian Wiki image embeds in Reading view and Live Preview. Standard Markdown images, tables, numbering, and cross-references are reserved for later engine releases.

### Wiki image syntax

Use a Wiki image alias as its caption:

```markdown
![[landscape.png|Swiss Alps]]
```

A final numeric or `widthxheight` parameter is treated as an image size and excluded from the caption:

```markdown
![[landscape.png|Swiss Alps|300]]
![[landscape.png|Swiss Alps|300x200]]
```

A size by itself does not create a caption:

```markdown
![[landscape.png|400]]
```

The settings tab can enable file-name fallback and customize caption alignment and font style.

Wiki image caption behavior is based on [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption).

## Roadmap

- `0.0.2`: Pandoc-crossref engine
- `0.0.3`: Engine management
- `0.0.4`: Quarto engine

## Development

```bash
npm ci
npm run dev
```

Run the complete local gate before release:

```bash
npm run test:unit
npm run lint
npm run build
npm run release:check
```

The release assets are `main.js`, `manifest.json`, and `styles.css`. `main.js` is generated and is not tracked by Git.
