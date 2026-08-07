import {
	getCaptionLabel,
	type CaptionSettings,
} from "../../caption-settings";

export type QuartoSettings = CaptionSettings;

export function getQuartoTargetLabel(
	kind: "figure" | "table",
	settings: QuartoSettings,
): string {
	return getCaptionLabel(kind, settings);
}
