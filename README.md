# Captions

An Obsidian plugin for previewing image and table captions and cross-references.

## 0.0.7

This release contains three syntax-specific engines:

- Obsidian Wiki image captions
- Pandoc captions and pandoc-crossref previews for standard images, pipe tables, and references
- Quarto captions and cross-reference previews for standard images, pipe tables, and references

Open **Settings > Captions** to configure them. Wiki image captions have an independent toggle. Standard Markdown images and tables use one mutually exclusive engine: `None`, `Pandoc and pandoc-crossref`, or `Quarto`. Pandoc remains the default for compatibility. Switching engines immediately removes the previous engine's Reading view output and Live Preview decorations without changing the Markdown source or restarting Obsidian.

Settings are grouped into **Caption labels**, **Caption appearance**, and **Caption behavior**. Figure and table labels are shared by Pandoc and Quarto captions and references. Alignment, font style, relative font size, spacing, and figure/table caption positions apply to every caption created by this plugin in Reading view and Live Preview. Font size ranges from 50% to 200% of the current theme text size and defaults to 85%; spacing ranges from 0px to 32px and defaults to 8px above and below. Font style defaults to bold. Figure captions default below images; table captions default above tables. File-name fallback remains a shared caption behavior. Existing settings from `0.0.2` through `0.0.6` are validated and migrated without changing their stored keys.

Version `0.0.7` fixes Live Preview initialization for the Pandoc and Quarto engines.

### Wiki images

Wiki images continue to use their alias as the caption. A final numeric or `widthxheight` parameter is treated as the image size:

```markdown
![[landscape.png|Swiss Alps]]
![[landscape.png|Swiss Alps|300]]
![[landscape.png|Swiss Alps|300x200]]
```

A size by itself does not create a caption unless file-name fallback is enabled:

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

The first form displays a caption only. A native ID such as `#architecture` also creates an anchor without numbering. Only a matching `fig:` ID enables automatic numbering and pandoc-crossref references. When file-name fallback is enabled, a standalone image with empty alt text uses its decoded file name; explicit alt text always takes precedence.

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

Unlabelled captions and native IDs are not numbered and do not consume a counter. Only matching `fig:` and `tbl:` targets are numbered; figures and tables use independent counters starting from 1 in each note. The shared settings can customize the `Figure` and `Table` labels for both standard Markdown engines.

Native anchors can be linked with normal Markdown links such as `[details](#results)`. The Pandoc engine does not interpret Quarto `fig-` or `tbl-` identifiers as crossrefs.

### Quarto figures

Select the Quarto engine to use `fig-` identifiers and bare Quarto references:

```markdown
![Architecture](assets/architecture.png)

![Architecture](assets/architecture.png){#architecture}

![Architecture](assets/architecture.png){#fig-architecture}

See @fig-architecture.
```

As with the Pandoc engine, the first form displays an unnumbered caption, a native ID creates an unnumbered anchor, and only a matching `fig-` ID participates in numbering and cross-references.

### Quarto tables

Quarto pipe table captions can appear before or after the table:

```markdown
| Model | Accuracy |
| --- | ---: |
| A | 92% |

: Model results {#tbl-results}

See @tbl-results.
```

Quarto figures and tables use independent counters starting from 1 in each note and use the same customizable labels as Pandoc. The Quarto engine does not interpret Pandoc `fig:` or `tbl:` identifiers as crossrefs.

Version `0.0.7` supports standalone standard Markdown images, pipe tables, direct bare Quarto references, and shared caption labels, appearance, and behavior. Cross-note references, chapter numbering, subfigures, executable-cell labels, and complex reference groups are not yet supported.

Wiki image behavior is based on [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption). Pandoc-crossref syntax follows [pandoc-crossref](https://lierdakil.github.io/pandoc-crossref/). Quarto cross-reference syntax follows the [Quarto cross-references guide](https://quarto.org/docs/authoring/cross-references.html).

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
