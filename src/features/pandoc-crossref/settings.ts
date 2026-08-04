export interface PandocCrossrefSettings {
	figureLabel: string;
	tableLabel: string;
}

export function getPandocTargetLabel(
	kind: "figure" | "table",
	settings: PandocCrossrefSettings,
): string {
	return kind === "figure" ? settings.figureLabel : settings.tableLabel;
}
