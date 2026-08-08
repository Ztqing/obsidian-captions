import type { StandardMarkdownEngine } from "./engine-manager";

export type SettingsLocale = "en" | "zh";

export interface SettingsStrings {
	engines: {
		heading: string;
		wikiImageName: string;
		wikiImageDesc: string;
		standardMarkdownName: string;
		standardMarkdownDesc: string;
		options: Record<StandardMarkdownEngine, string>;
	};
	labels: {
		heading: string;
		figureName: string;
		figureDesc: string;
		tableName: string;
		tableDesc: string;
	};
	appearance: {
		heading: string;
		alignmentName: string;
		alignmentDesc: string;
		alignmentOptions: {
			left: string;
			center: string;
			right: string;
		};
		styleName: string;
		styleDesc: string;
		styleOptions: {
			italic: string;
			normal: string;
			bold: string;
		};
		fontSizeName: string;
		fontSizeDesc: string;
		spacingAboveName: string;
		spacingAboveDesc: string;
		spacingBelowName: string;
		spacingBelowDesc: string;
		figurePositionName: string;
		figurePositionDesc: string;
		tablePositionName: string;
		tablePositionDesc: string;
		positionOptions: {
			above: string;
			below: string;
		};
	};
	behavior: {
		heading: string;
		fileNameFallbackName: string;
		fileNameFallbackDesc: string;
	};
}

const SETTINGS_TRANSLATIONS: Record<SettingsLocale, SettingsStrings> = {
	en: {
		engines: {
			heading: "Engines",
			wikiImageName: "Wiki image captions",
			wikiImageDesc: "Render aliases for wiki image embeds.",
			standardMarkdownName: "Standard Markdown engine",
			standardMarkdownDesc: "Choose one caption and cross-reference syntax for standard images and tables.",
			options: {
				none: "None",
				pandocCrossref: "Pandoc and pandoc-crossref",
				quarto: "Quarto",
			},
		},
		labels: {
			heading: "Caption labels",
			figureName: "Figure label",
			figureDesc: "Used by both standard Markdown engines for numbered figure captions and references.",
			tableName: "Table label",
			tableDesc: "Used by both standard Markdown engines for numbered table captions and references.",
		},
		appearance: {
			heading: "Caption appearance",
			alignmentName: "Caption alignment",
			alignmentDesc: "Align captions generated for wiki images, figures, and tables.",
			alignmentOptions: {
				left: "Left",
				center: "Center",
				right: "Right",
			},
			styleName: "Font style",
			styleDesc: "Display generated captions using italic, normal, or bold text.",
			styleOptions: {
				italic: "Italic",
				normal: "Normal",
				bold: "Bold",
			},
			fontSizeName: "Font size",
			fontSizeDesc: "Set caption text size relative to the current Obsidian theme.",
			spacingAboveName: "Spacing above",
			spacingAboveDesc: "Set the space before generated captions.",
			spacingBelowName: "Spacing below",
			spacingBelowDesc: "Set the space after generated captions.",
			figurePositionName: "Figure caption position",
			figurePositionDesc: "Place figure captions above or below images.",
			tablePositionName: "Table caption position",
			tablePositionDesc: "Place table captions above or below tables.",
			positionOptions: {
				above: "Above",
				below: "Below",
			},
		},
		behavior: {
			heading: "Caption behavior",
			fileNameFallbackName: "Use file name as fallback",
			fileNameFallbackDesc: "Use the decoded image file name when an image has no explicit caption.",
		},
	},
	zh: {
		engines: {
			heading: "引擎",
			wikiImageName: "Wiki 图片题注",
			wikiImageDesc: "为 Wiki 图片嵌入渲染别名题注。",
			standardMarkdownName: "标准 Markdown 引擎",
			standardMarkdownDesc: "为标准图片和表格选择一种题注与交叉引用语法。",
			options: {
				none: "无",
				pandocCrossref: "Pandoc 与 pandoc-crossref",
				quarto: "Quarto",
			},
		},
		labels: {
			heading: "题注标签",
			figureName: "图片标签",
			figureDesc: "由两个标准 Markdown 引擎用于带编号的图片题注和引用。",
			tableName: "表格标签",
			tableDesc: "由两个标准 Markdown 引擎用于带编号的表格题注和引用。",
		},
		appearance: {
			heading: "题注外观",
			alignmentName: "题注对齐",
			alignmentDesc: "设置 Wiki 图片、标准图片和表格题注的对齐方式。",
			alignmentOptions: {
				left: "左对齐",
				center: "居中",
				right: "右对齐",
			},
			styleName: "字体样式",
			styleDesc: "以斜体、常规或粗体显示生成的题注。",
			styleOptions: {
				italic: "斜体",
				normal: "常规",
				bold: "粗体",
			},
			fontSizeName: "字号",
			fontSizeDesc: "设置相对于当前 Obsidian 主题的题注文字大小。",
			spacingAboveName: "上方间距",
			spacingAboveDesc: "设置生成的题注上方的间距。",
			spacingBelowName: "下方间距",
			spacingBelowDesc: "设置生成的题注下方的间距。",
			figurePositionName: "图片题注位置",
			figurePositionDesc: "将图片题注置于图片上方或下方。",
			tablePositionName: "表格题注位置",
			tablePositionDesc: "将表格题注置于表格上方或下方。",
			positionOptions: {
				above: "上方",
				below: "下方",
			},
		},
		behavior: {
			heading: "题注行为",
			fileNameFallbackName: "使用文件名作为兜底",
			fileNameFallbackDesc: "图片没有显式题注时，使用解码后的图片文件名。",
		},
	},
};

export function resolveSettingsLocale(
	languageCode: string | null | undefined,
): SettingsLocale {
	const normalizedCode = languageCode?.trim().toLowerCase().replace(/_/g, "-");
	return normalizedCode === "zh" || normalizedCode?.startsWith("zh-") === true
		? "zh"
		: "en";
}

export function getSettingsStrings(
	languageCode: string | null | undefined,
): SettingsStrings {
	return SETTINGS_TRANSLATIONS[resolveSettingsLocale(languageCode)];
}
