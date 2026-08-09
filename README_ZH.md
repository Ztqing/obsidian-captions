<div align="center">
  <h1>Captions</h1>
  <p><strong>一个用于在 Obsidian 阅读模式和实时预览中显示本地图片与 pipe table 题注的插件。</strong></p>
  <p><a href="README.md">English</a> | 中文 | <a href="CHANGELOG.md">更新日志</a></p>
</div>

## 支持的语法

### Wiki 图片嵌入

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

### 标准 Markdown 图片

标准 Markdown 图片必须独占一行，alt 文本作为题注；行内图片保持原样。

```markdown
![系统架构](assets/architecture.png)
```

启用文件名兜底后，空 alt 的独占行图片会使用解码后的文件名。Obsidian 自动生成的文件名 alt、单独的图片扩展名和纯尺寸不会被当作显式题注。

### Pipe table 题注

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

## 设置与行为

设置页面提供共享的对齐、字体样式、相对字号、上下间距、图片/表格题注位置和可选文件名兜底。字号和题注上下间距均使用数字输入框，并以占位符显示默认值 85% 和 12px；清空输入框会使用对应默认值，上下间距同时应用于题注上方和下方。设置页面跟随 Obsidian 的英文或简体中文界面。

题注在本地渲染，不会修改笔记源文档。阅读模式和实时预览使用相同的题注规则与外观。Source mode、普通链接、行内 Markdown 图片、未匹配的表格和交叉引用样式的文本都会保持原样。

## 兼容性与限制

Captions 支持桌面端和移动端 Obsidian，最低支持版本为 1.10.3。所有处理均在本地完成，不会发起网络请求。

## 开发与验证

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

## 致谢

感谢 [wk-image-caption](https://github.com/bcs1037/wk-image-caption) 项目提供的前期实践与启发。
