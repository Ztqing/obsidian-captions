# Captions

An Obsidian plugin for previewing image and table captions and cross-references.

## 0.0.3

This release contains two independently managed engines:

- Obsidian Wiki image captions
- Pandoc captions and pandoc-crossref previews for standard images, pipe tables, and references

Both engines are enabled by default. Open **Settings > Captions > Engines** to enable or disable either engine without restarting Obsidian. Disabling an engine immediately removes its Reading view output and Live Preview decorations without changing the Markdown source. Existing `0.0.2` settings are migrated with both engines enabled.

### Wiki images

Wiki images continue to use their alias as the caption. A final numeric or `widthxheight` parameter is treated as the image size:

```markdown
![[landscape.png|Swiss Alps]]
![[landscape.png|Swiss Alps|300]]
![[landscape.png|Swiss Alps|300x200]]
```

A size by itself does not create a caption:

```markdown
![[landscape.png|400]]
```

### Pandoc figures

An image must occupy its own line to use its alt text as a Pandoc caption. An ID is optional:

```markdown
![Architecture](assets/architecture.png)

![Architecture](assets/architecture.png){#architecture}

![Architecture](assets/architecture.png){#fig:architecture}

See [@fig:architecture].
```

The first form displays a caption only. A native ID such as `#architecture` also creates an anchor without numbering. Only a matching `fig:` ID enables automatic numbering and pandoc-crossref references.

### Pandoc tables

This release supports Markdown pipe tables with a caption before or after the table. Table IDs are also optional:

```markdown
| Model | Accuracy |
| --- | ---: |
| A | 92% |

: Model results
```

Use a native ID to create an unnumbered anchor:

```markdown
: Model results {#results}
```

Use a `tbl:` ID to enable numbering and references:

```markdown
: Model results {#tbl:results}
See [@tbl:results].
```

Unlabelled captions and native IDs are not numbered and do not consume a counter. Only matching `fig:` and `tbl:` targets are numbered; figures and tables use independent counters starting from 1 in each note. The settings tab can customize the `Figure` and `Table` labels.

Native anchors can be linked with normal Markdown links such as `[details](#results)`. Version 0.0.3 does not interpret Quarto `fig-` or `tbl-` identifiers as crossrefs. Cross-note references, chapter numbering, subfigures, and complex citation groups are not yet supported.

Wiki image behavior is based on [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption). Pandoc-crossref syntax follows [pandoc-crossref](https://lierdakil.github.io/pandoc-crossref/).

## Roadmap

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
