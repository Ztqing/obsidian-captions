# Captions

一个用于在 Obsidian 中预览图片、表格题注和交叉引用的插件。

## 0.0.2

当前版本包含两个相互独立的功能：

- Obsidian Wiki 图片题注
- Pandoc 标准图片、pipe table 题注及 pandoc-crossref 引用预览

### Wiki 图片

Wiki 图片继续使用别名作为题注，最后一个数字或 `宽x高` 参数作为尺寸：

```markdown
![[landscape.png|瑞士雪山]]
![[landscape.png|瑞士雪山|300]]
![[landscape.png|瑞士雪山|300x200]]
```

只有尺寸时不显示题注：

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

第一种写法只显示题注；`#architecture` 这样的原生 ID 会额外建立锚点，但不编号。只有匹配的 `fig:` ID 才会启用自动编号和 pandoc-crossref 引用。

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

无标签题注和普通 ID 不编号，也不占用计数器。只有匹配的 `fig:` 和 `tbl:` 对象参与编号；图片和表格在每篇笔记中使用独立计数器并分别从 1 开始。设置中可以自定义 `Figure` 和 `Table` 标签。

普通锚点可以使用 `[详情](#results)` 这样的 Markdown 链接。`0.0.2` 不会把 Quarto 的 `fig-`、`tbl-` ID 解释为 crossref，也暂不支持跨笔记引用、章节编号、子图和复杂引用组。

Wiki 图片题注行为参考 [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption)。Pandoc-crossref 语法参考 [pandoc-crossref](https://lierdakil.github.io/pandoc-crossref/)。

## 路线图

- `0.0.3`：引擎管理
- `0.0.4`：Quarto 引擎

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
