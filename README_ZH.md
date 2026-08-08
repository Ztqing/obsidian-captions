# Captions

一个用于在 Obsidian 阅读模式和实时预览中显示本地图片与 pipe table 题注的插件。

## 0.0.9

Captions 现在使用一条自动识别的统一题注管线，不再提供语法引擎开关。Wiki 图片嵌入、独占一行的标准 Markdown 图片和支持的 pipe table 题注会在本地自动识别，不会修改笔记源文档。

设置页面保留共享的对齐、字体样式、相对字号、上下间距、图片/表格题注位置和可选文件名兜底，并继续跟随 Obsidian 的英文或简体中文界面。`0.0.9` 使用新的默认设置，不迁移旧版本保存的配置。

交叉引用预览、自动编号和自动生成的 ID 锚点已经移除。`[@fig:diagram]`、`[@tbl:results]`、`@fig-diagram` 和 `@tbl-results` 等文本会保持原样。

### Wiki 图片

Wiki 图片别名作为题注。最后一个纯数字或 `宽x高` 参数仍由 Obsidian 作为图片尺寸处理，并从题注中排除；题注中的其他 `|` 会保留。

```markdown
![[landscape.png|瑞士雪山]]
![[landscape.png|瑞士雪山|300]]
![[map.png|北方 | 南方|300x200]]
```

只有尺寸时不会生成题注，除非启用文件名兜底：

```markdown
![[landscape.png|400]]
```

### Markdown 图片

标准 Markdown 图片必须独占一行，alt 文本作为题注；行内图片保持原样。

```markdown
![系统架构](assets/architecture.png)
```

启用文件名兜底后，空 alt 的独占行图片会使用解码后的文件名。Obsidian 自动生成的文件名 alt、单独的图片扩展名和纯尺寸不会被当作显式题注。

### Pipe table

Pipe table 题注可以位于表格之前或之后，并支持 `:` 或 `Table:` 前缀。题注不显示标签或编号。

```markdown
: 模型评测结果

| 模型 | 准确率 |
| --- | ---: |
| A | 92% |
```

```markdown
| 模型 | 准确率 |
| --- | ---: |
| A | 92% |

Table: 模型评测结果
```

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

发布资产为 `main.js`、`manifest.json` 和 `styles.css`。`main.js` 由本地或 CI 构建生成，不纳入 Git 跟踪。
