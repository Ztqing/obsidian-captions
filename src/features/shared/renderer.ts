import {
	applyCaptionAppearance,
	getCaptionAppearance,
	type CaptionKind,
	type CaptionSettings,
} from "../../caption-settings";

export const FIGURE_CAPTION_CLASS = "captions-figure-caption";
export const TABLE_CAPTION_CLASS = "captions-table-caption";
export const SOURCE_MARKER_CLASS = "captions-source-marker";
export const SOURCE_CAPTION_CLASS = "captions-source-caption";
export const FIGURE_CONTAINER_CLASS = "captions-figure";
export const TABLE_CONTAINER_CLASS = "captions-table";
export const CAPTION_KEY = "captionsKey";

export function updateCaptionElement(
	element: HTMLElement,
	text: string,
	settings: CaptionSettings,
	kind: CaptionKind,
	editor = false,
): void {
	const appearance = getCaptionAppearance(settings, kind);
	const className = [
		editor ? "captions-editor-caption" : getCaptionElementClass(kind),
		editor ? `captions-editor-caption--${kind}` : "",
		...appearance.classNames,
	].filter((className) => className.length > 0).join(" ");
	if (element.className !== className) {
		element.className = className;
	}
	applyCaptionAppearance(element, appearance);
	if (element.textContent !== text) {
		element.textContent = text;
	}
}

export function getCaptionElementClass(kind: CaptionKind): string {
	return kind === "figure" ? FIGURE_CAPTION_CLASS : TABLE_CAPTION_CLASS;
}
