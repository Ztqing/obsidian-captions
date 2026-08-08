import {
	type EditorState,
	type Extension,
	type Range,
	StateField,
	type Transaction,
} from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	WidgetType,
} from "@codemirror/view";

import {
	resolveImageCaption,
	type CaptionSettings,
} from "../../caption-settings";
import {
	CAPTION_KEY,
	updateCaptionElement,
} from "../shared/renderer";
import {
	parseCaptionDocument,
	type CaptionDocument,
	type CaptionTarget,
} from "./parser";

type SettingsProvider = () => CaptionSettings;
type DocumentParser = (source: string) => CaptionDocument;

interface LivePreviewCaptions {
	document: CaptionDocument | null;
	decorations: DecorationSet;
}

export function createMarkdownCaptionEditorExtension(
	getSettings: SettingsProvider,
	livePreviewField: StateField<boolean>,
	parseDocument: DocumentParser = parseCaptionDocument,
): Extension {
	return StateField.define<LivePreviewCaptions>({
		create: (state) => createLivePreviewCaptions(
			state,
			getSettings(),
			livePreviewField,
			parseDocument,
		),
		update: (value, transaction) => updateLivePreviewCaptions(
			value,
			transaction,
			getSettings(),
			livePreviewField,
			parseDocument,
		),
		provide: (field) => EditorView.decorations.from(
			field,
			(value) => value.decorations,
		),
	});
}

class CaptionWidget extends WidgetType {
	constructor(
		private readonly target: CaptionTarget,
		private readonly captionText: string,
		private readonly settings: CaptionSettings,
	) {
		super();
	}

	eq(other: CaptionWidget): boolean {
		return this.target.key === other.target.key
			&& this.captionText === other.captionText
			&& this.target.kind === other.target.kind
			&& getAppearanceSignature(this.settings, this.target.kind)
				=== getAppearanceSignature(other.settings, other.target.kind);
	}

	toDOM(view: EditorView): HTMLElement {
		const caption = view.dom.ownerDocument.createElement("div");
		caption.dataset[CAPTION_KEY] = this.target.key;
		updateCaptionElement(caption, this.captionText, this.settings, this.target.kind, true);
		return caption;
	}
}

function createLivePreviewCaptions(
	state: EditorState,
	settings: CaptionSettings,
	livePreviewField: StateField<boolean>,
	parseDocument: DocumentParser,
): LivePreviewCaptions {
	if (state.field(livePreviewField, false) !== true) {
		return { document: null, decorations: Decoration.none };
	}
	const document = parseDocument(state.doc.toString());
	return { document, decorations: buildDecorations(state, document, settings) };
}

function updateLivePreviewCaptions(
	value: LivePreviewCaptions,
	transaction: Transaction,
	settings: CaptionSettings,
	livePreviewField: StateField<boolean>,
	parseDocument: DocumentParser,
): LivePreviewCaptions {
	const isLivePreview = transaction.state.field(livePreviewField, false) === true;
	const wasLivePreview = transaction.startState.field(livePreviewField, false) === true;
	if (!isLivePreview) {
		return value.document === null && value.decorations === Decoration.none
			? value
			: { document: null, decorations: Decoration.none };
	}

	const shouldParse = transaction.docChanged || !wasLivePreview || value.document === null;
	const document = shouldParse
		? parseDocument(transaction.state.doc.toString())
		: value.document;
	const shouldBuild = shouldParse
		|| transaction.selection !== undefined
		|| transaction.reconfigured
		|| !wasLivePreview;
	return shouldBuild
		? {
			document,
			decorations: buildDecorations(
				transaction.state,
				document as CaptionDocument,
				settings,
			),
		}
		: value;
}

function buildDecorations(
	state: EditorState,
	document: CaptionDocument,
	settings: CaptionSettings,
): DecorationSet {
	const ranges: Array<Range<Decoration>> = [];
	for (const target of document.targets) {
		const captionText = target.kind === "figure"
			? resolveImageCaption(
				target.caption,
				[target.imageSource],
				settings.showFileNameAsCaption,
			)
			: target.caption;

		if (
			target.marker !== null
			&& !selectionOverlaps(state, target.marker.from, target.marker.to)
		) {
			const hiddenTo = target.kind === "table" && target.marker.to < state.doc.length
				? target.marker.to + 1
				: target.marker.to;
			ranges.push(Decoration.replace({ block: target.kind === "table" }).range(
				target.marker.from,
				hiddenTo,
			));
		}

		if (captionText === null) {
			continue;
		}
		const position = target.kind === "figure"
			? settings.figurePosition
			: settings.tablePosition;
		ranges.push(Decoration.widget({
			block: true,
			side: position === "above" ? -1 : 1,
			widget: new CaptionWidget(target, captionText, settings),
		}).range(position === "above" ? target.target.from : target.target.to));
	}
	return Decoration.set(ranges, true);
}

function selectionOverlaps(state: EditorState, from: number, to: number): boolean {
	return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function getAppearanceSignature(settings: CaptionSettings, kind: CaptionTarget["kind"]): string {
	const position = kind === "figure" ? settings.figurePosition : settings.tablePosition;
	return [
		settings.alignment,
		settings.style,
		settings.fontSizePercent,
		settings.spacingAbovePx,
		settings.spacingBelowPx,
		position,
	].join("|");
}
