import type { Extension, Range } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	type PluginValue,
	type ViewUpdate,
	ViewPlugin,
	WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import {
	applyCaptionAppearance,
	getCaptionAppearance,
	resolveImageCaption,
	type CaptionAppearance,
} from "../../caption-settings";

import {
	getPandocTargetId,
	isPandocCrossrefTarget,
	parsePandocCrossrefDocument,
	type PandocCaptionTarget,
	type PandocCrossrefCaptionTarget,
} from "./parser";
import {
	getPandocTargetLabel,
	type PandocCrossrefSettings,
} from "./settings";

type SettingsProvider = () => PandocCrossrefSettings;

export function createPandocCrossrefEditorExtension(
	getSettings: SettingsProvider,
): Extension {
	return ViewPlugin.define(
		(view) => new PandocCrossrefViewPlugin(view, getSettings),
		{ decorations: (plugin) => plugin.decorations },
	);
}

class PandocCrossrefViewPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(
		private readonly view: EditorView,
		private readonly getSettings: SettingsProvider,
	) {
		this.decorations = buildDecorations(view, getSettings());
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.selectionSet || update.viewportChanged) {
			this.decorations = buildDecorations(update.view, this.getSettings());
		}
	}
}

class PandocCaptionWidget extends WidgetType {
	private readonly labelText: string | null;
	private readonly captionText: string | null;
	private readonly className: string;
	private readonly appearance: CaptionAppearance;

	constructor(
		private readonly target: PandocCaptionTarget,
		settings: PandocCrossrefSettings,
	) {
		super();
		this.captionText = target.kind === "figure"
			? resolveImageCaption(
				target.caption,
				[target.imageSource],
				settings.showFileNameAsCaption,
			)
			: target.caption;
		this.labelText = isPandocCrossrefTarget(target)
			? `${getPandocTargetLabel(target.kind, settings)} ${target.identity.number}`
			: null;
		this.appearance = getCaptionAppearance(settings, target.kind);
		this.className = [
			"captions-pandoc-editor-caption",
			`captions-pandoc-editor-caption--${this.target.kind}`,
			...this.appearance.classNames,
		].join(" ");
	}

	eq(other: PandocCaptionWidget): boolean {
		return this.target.key === other.target.key
			&& this.target.caption === other.target.caption
			&& this.target.identity.mode === other.target.identity.mode
			&& getPandocTargetId(this.target) === getPandocTargetId(other.target)
			&& this.labelText === other.labelText
			&& this.captionText === other.captionText
			&& this.className === other.className
			&& this.appearance.signature === other.appearance.signature;
	}

	toDOM(view: EditorView): HTMLElement {
		const caption = view.dom.ownerDocument.createElement("div");
		caption.className = this.className;
		applyCaptionAppearance(caption, this.appearance);
		caption.dataset.captionKey = this.target.key;
		const id = getPandocTargetId(this.target);
		if (id !== null) {
			caption.id = id;
			caption.dataset.captionId = id;
		}

		if (this.labelText !== null) {
			const label = view.dom.ownerDocument.createElement("span");
			label.className = "captions-pandoc-label";
			label.textContent = this.labelText;
			caption.appendChild(label);
			if (this.captionText !== null && this.captionText.length > 0) {
				caption.append(": ", this.captionText);
			}
		} else {
			caption.textContent = this.captionText ?? "";
		}
		return caption;
	}
}

class PandocReferenceWidget extends WidgetType {
	private readonly labelText: string;

	constructor(
		private readonly target: PandocCrossrefCaptionTarget,
		settings: PandocCrossrefSettings,
	) {
		super();
		this.labelText = `${getPandocTargetLabel(target.kind, settings)} ${target.identity.number}`;
	}

	eq(other: PandocReferenceWidget): boolean {
		return this.target.identity.id === other.target.identity.id
			&& this.target.identity.number === other.target.identity.number
			&& this.labelText === other.labelText;
	}

	toDOM(view: EditorView): HTMLElement {
		const anchor = view.dom.ownerDocument.createElement("a");
		anchor.className = "captions-pandoc-editor-reference";
		anchor.setAttribute("href", `#${this.target.identity.id}`);
		anchor.textContent = this.labelText;
		anchor.addEventListener("click", (event) => {
			event.preventDefault();
			const targets = view.dom.querySelectorAll<HTMLElement>("[data-caption-id]");
			const target = Array.from(targets)
				.find((element) => (
					element.dataset.captionId === this.target.identity.id
				));
			target?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		return anchor;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function buildDecorations(
	view: EditorView,
	settings: PandocCrossrefSettings,
): DecorationSet {
	if (view.state.field(editorLivePreviewField, false) !== true) {
		return Decoration.none;
	}

	const document = parsePandocCrossrefDocument(view.state.doc.toString());
	const targetsById = new Map<string, PandocCrossrefCaptionTarget>();
	const ranges: Array<Range<Decoration>> = [];

	for (const target of document.targets) {
		if (
			isPandocCrossrefTarget(target)
			&& !targetsById.has(target.identity.id)
		) {
			targetsById.set(target.identity.id, target);
		}
		if (
			target.kind === "figure"
			&& target.identity.mode === "caption"
			&& resolveImageCaption(
				target.caption,
				[target.imageSource],
				settings.showFileNameAsCaption,
			) === null
		) {
			continue;
		}

		const markerFrom = target.markerFrom;
		const markerTo = target.markerTo;
		if (
			markerFrom !== null
			&& markerTo !== null
			&& selectionOverlaps(view, markerFrom, markerTo)
		) {
			continue;
		}

		if (target.kind === "figure") {
			if (markerFrom !== null && markerTo !== null) {
				ranges.push(Decoration.replace({}).range(
					markerFrom,
					markerTo,
				));
			}
		} else {
			if (markerFrom !== null && markerTo !== null) {
				const hiddenLineTo = markerTo < view.state.doc.length
					? markerTo + 1
					: markerTo;
				ranges.push(Decoration.replace({ block: true }).range(
					markerFrom,
					hiddenLineTo,
				));
			}
		}

		const position = target.kind === "figure"
			? settings.figurePosition
			: settings.tablePosition;
		ranges.push(Decoration.widget({
			block: true,
			side: position === "above" ? -1 : 1,
			widget: new PandocCaptionWidget(target, settings),
		}).range(position === "above" ? target.targetFrom : target.targetTo));
	}

	for (const reference of document.references) {
		const target = targetsById.get(reference.id);
		if (
			target === undefined
			|| selectionOverlaps(view, reference.from, reference.to)
		) {
			continue;
		}

		ranges.push(Decoration.replace({
			widget: new PandocReferenceWidget(target, settings),
		}).range(reference.from, reference.to));
	}

	return Decoration.set(ranges, true);
}

function selectionOverlaps(view: EditorView, from: number, to: number): boolean {
	return view.state.selection.ranges.some((range) =>
		range.from <= to && range.to >= from);
}
