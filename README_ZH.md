# Captions

一个用于在 Obsidian 中预览图片、表格题注和交叉引用的插件。

## 0.0.6

当前版本包含三个相互独立的语法引擎：

- Obsidian Wiki 图片题注
- Pandoc 标准图片、pipe table 题注及 pandoc-crossref 引用预览
- Quarto 标准图片、pipe table 题注及交叉引用预览

可以在 **设置 > Captions** 中进行配置。Wiki 图片题注使用独立开关；标准 Markdown 图片和表格使用互斥的 `None`、`Pandoc and pandoc-crossref` 或 `Quarto` 选项。为保持兼容，默认选择 Pandoc。切换后会立即移除旧引擎在阅读模式中的渲染结果和实时预览装饰，不会修改 Markdown 源文档，也不需要重启 Obsidian。

设置分为 **Caption labels（题注标签）**、**Caption appearance（题注外观）** 和 **Caption behavior（题注行为）**。Pandoc 与 Quarto 共用图片和表格标签；对齐、字体样式、相对字号、上下间距以及图表题注位置同时作用于阅读模式与实时预览中由本插件生成的全部题注。字号范围为当前主题文字大小的 50% 至 200%，默认 85%；上下间距范围为 0px 至 32px，默认上方和下方均为 8px。字体样式默认为粗体。图片题注默认位于图片下方，表格题注默认位于表格上方。文件名兜底继续作为共享题注行为。已有 `0.0.2` 至 `0.0.5` 设置会经过校验后迁移，并保持原有持久化 key 不变。

### Wiki 图片

Wiki 图片继续使用别名作为题注，最后一个数字或 `宽x高` 参数作为尺寸：

```markdown
![[landscape.png|瑞士雪山]]
![[landscape.png|瑞士雪山|300]]
![[landscape.png|瑞士雪山|300x200]]
```

只有尺寸时默认不显示题注；启用文件名兜底后会显示解码后的文件名：

```markdown
![[landscape.png|400]]
```

### Pandoc 图片

图片必须独占一行，才会把 alt 文本作为 Pandoc 题注。ID 可以省略：

```markdown
![系统架构](assets/architecture.png)

![系统架构](assets/architecture.png){#architecture}

![系统架构](assets/architecture.png){#fig:architecture}

如 [@fig:architecture] 所示。
```

第一种写法只显示题注；`#architecture` 这样的原生 ID 会额外建立锚点，但不编号。只有匹配的 `fig:` ID 才会启用自动编号和 pandoc-crossref 引用。启用文件名兜底后，空 alt 的独占行图片会使用解码后的文件名；显式 alt 始终优先。

### Pandoc 表格

当前支持 Markdown pipe table，题注可以放在表格之前或之后，ID 同样可以省略：

```markdown
| 模型 | 准确率 |
| --- | ---: |
| A | 92% |

: 模型评测结果
```

使用普通 ID 建立不编号的锚点：

```markdown
: 模型评测结果 {#results}
```

使用 `tbl:` ID 启用编号和引用：

```markdown
: 模型评测结果 {#tbl:results}
结果见 [@tbl:results]。
```

无标签题注和普通 ID 不编号，也不占用计数器。只有匹配的 `fig:` 和 `tbl:` 对象参与编号；图片和表格在每篇笔记中使用独立计数器并分别从 1 开始。通用设置可以同时自定义两个标准 Markdown 引擎使用的 `Figure` 和 `Table` 标签。

普通锚点可以使用 `[详情](#results)` 这样的 Markdown 链接。Pandoc 引擎不会把 Quarto 的 `fig-`、`tbl-` ID 解释为 crossref。

### Quarto 图片

选择 Quarto 引擎后，使用 `fig-` ID 和不带方括号的 Quarto 引用：

```markdown
![系统架构](assets/architecture.png)

![系统架构](assets/architecture.png){#architecture}

![系统架构](assets/architecture.png){#fig-architecture}

如 @fig-architecture 所示。
```

与 Pandoc 引擎一样，第一种写法仅显示不编号的题注；普通 ID 建立不编号的锚点；只有匹配的 `fig-` ID 才参与编号和交叉引用。

### Quarto 表格

Quarto pipe table 的题注可以位于表格之前或之后：

```markdown
| 模型 | 准确率 |
| --- | ---: |
| A | 92% |

: 模型评测结果 {#tbl-results}

结果见 @tbl-results。
```

Quarto 图片和表格分别从 1 开始编号，并与 Pandoc 共用可自定义标签。Quarto 引擎不会把 Pandoc 的 `fig:`、`tbl:` ID 解释为 crossref。

`0.0.6` 支持独占一行的标准 Markdown 图片、pipe table、直接裸 Quarto 引用，以及统一的题注标签、外观和行为设置。暂不支持跨笔记引用、章节编号、子图、可执行单元格标签和复杂引用组。

Wiki 图片题注行为参考 [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption)。Pandoc-crossref 语法参考 [pandoc-crossref](https://lierdakil.github.io/pandoc-crossref/)。Quarto 交叉引用语法参考 [Quarto cross-references 文档](https://quarto.org/docs/authoring/cross-references.html)。

## 开发

```bash
npm ci
npm run dev
```

发布前依次运行：

```bash
npm run test:unit
npm run lint
npm run build
npm run release:check
```

发布资产为 `main.js`、`manifest.json` 和 `styles.css`。`main.js` 由构建生成，不纳入 Git 跟踪。
