export type SettingsLocale = "en" | "zh";

export interface SettingsStrings {
	appearance: {
		heading: string;
		alignmentName: string;
		alignmentDesc: string;
		alignmentOptions: { left: string; center: string; right: string };
		styleName: string;
		styleDesc: string;
		styleOptions: { italic: string; normal: string; bold: string };
		fontSizeName: string;
		fontSizeDesc: string;
		spacingName: string;
		spacingDesc: string;
		figurePositionName: string;
		figurePositionDesc: string;
		tablePositionName: string;
		tablePositionDesc: string;
		positionOptions: { above: string; below: string };
	};
	behavior: {
		heading: string;
		fileNameFallbackName: string;
		fileNameFallbackDesc: string;
	};
}

const SETTINGS_TRANSLATIONS: Record<SettingsLocale, SettingsStrings> = {
	en: {
		appearance: {
			heading: "Caption appearance",
			alignmentName: "Caption alignment",
			alignmentDesc: "Align captions generated for wiki images, Markdown images, and tables.",
			alignmentOptions: { left: "Left", center: "Center", right: "Right" },
			styleName: "Font style",
			styleDesc: "Display generated captions using italic, normal, or bold text.",
			styleOptions: { italic: "Italic", normal: "Normal", bold: "Bold" },
			fontSizeName: "Font size",
			fontSizeDesc: "Set caption text size relative to the current Obsidian theme.",
			spacingName: "Caption spacing",
			spacingDesc: "Set the space above and below generated captions.",
			figurePositionName: "Figure caption position",
			figurePositionDesc: "Place figure captions above or below images.",
			tablePositionName: "Table caption position",
			tablePositionDesc: "Place table captions above or below tables.",
			positionOptions: { above: "Above", below: "Below" },
		},
		behavior: {
			heading: "Caption behavior",
			fileNameFallbackName: "Use file name as fallback",
			fileNameFallbackDesc: "Use the decoded image file name when an image has no explicit caption.",
		},
	},
	zh: {
		appearance: {
			heading: "题注外观",
			alignmentName: "题注对齐",
			alignmentDesc: "设置 Wiki 图片、Markdown 图片和表格题注的对齐方式。",
			alignmentOptions: { left: "左对齐", center: "居中", right: "右对齐" },
			styleName: "字体样式",
			styleDesc: "以斜体、常规或粗体显示生成的题注。",
			styleOptions: { italic: "斜体", normal: "常规", bold: "粗体" },
			fontSizeName: "字号",
			fontSizeDesc: "设置相对于当前 Obsidian 主题的题注文字大小。",
			spacingName: "上下间距",
			spacingDesc: "设置生成的题注上下间距。",
			figurePositionName: "图片题注位置",
			figurePositionDesc: "将图片题注置于图片上方或下方。",
			tablePositionName: "表格题注位置",
			tablePositionDesc: "将表格题注置于表格上方或下方。",
			positionOptions: { above: "上方", below: "下方" },
		},
		behavior: {
			heading: "题注行为",
			fileNameFallbackName: "使用文件名作为兜底",
			fileNameFallbackDesc: "图片没有显式题注时，使用解码后的图片文件名。",
		},
	},
};

export function resolveSettingsLocale(languageCode: string | null | undefined): SettingsLocale {
	const normalizedCode = languageCode?.trim().toLowerCase().replace(/_/g, "-");
	return normalizedCode === "zh" || normalizedCode?.startsWith("zh-") === true ? "zh" : "en";
}

export function getSettingsStrings(languageCode: string | null | undefined): SettingsStrings {
	return SETTINGS_TRANSLATIONS[resolveSettingsLocale(languageCode)];
}
