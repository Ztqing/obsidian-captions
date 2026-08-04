# Captions

一个用于在 Obsidian 中显示图片和表格题注的插件。

## 0.0.1

当前版本只处理 Obsidian Wiki 嵌入图片，在阅读视图和实时预览中显示题注。标准 Markdown 图片、表格、编号和交叉引用将在后续引擎版本中实现。

### Wiki 图片语法

使用 Wiki 图片的别名作为题注：

```markdown
![[landscape.png|瑞士雪山]]
```

题注和图片尺寸可以同时使用，最后一个纯数字或 `宽x高` 参数会被识别为尺寸：

```markdown
![[landscape.png|瑞士雪山|300]]
![[landscape.png|瑞士雪山|300x200]]
```

只有尺寸时不显示题注：

```markdown
![[landscape.png|400]]
```

设置中可以启用文件名兜底，并调整题注的对齐方式和字体样式。

Wiki 图片题注行为参考 [bcs1037/wk-image-caption](https://github.com/bcs1037/wk-image-caption)。

## 路线图

- `0.0.2`：Pandoc-crossref 引擎
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
