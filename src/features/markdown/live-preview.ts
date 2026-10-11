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
	getCaptionAppearance,
	resolveImageCaption,
	type CaptionSettings,
} from "../../caption-settings";
import {
	isCaptionRefreshTransaction,
} from "../shared/editor-refresh";
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
	appearanceSignature: string;
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
		if (this.target.kind === "table") {
			caption.addEventListener("mousedown", (event) => {
				event.preventDefault();
				event.stopPropagation();
				view.focus();
				view.dispatch({
					selection: { anchor: getTableCaptionSourcePosition(this.target as Extract<CaptionTarget, { kind: "table" }>) },
					scrollIntoView: true,
				});
			});
		}
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
		return {
			document: null,
			decorations: Decoration.none,
			appearanceSignature: getDocumentAppearanceSignature(settings),
		};
	}
	const document = parseDocument(state.doc.toString());
	return {
		document,
		decorations: buildDecorations(state, document, settings),
		appearanceSignature: getDocumentAppearanceSignature(settings),
	};
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
		return value.document === null
			&& value.decorations === Decoration.none
			&& value.appearanceSignature === getDocumentAppearanceSignature(settings)
			? value
			: {
				document: null,
				decorations: Decoration.none,
				appearanceSignature: getDocumentAppearanceSignature(settings),
			};
	}

	const shouldParse = transaction.docChanged || !wasLivePreview || value.document === null;
	const document = shouldParse
		? parseDocument(transaction.state.doc.toString())
		: value.document;
	const appearanceSignature = getDocumentAppearanceSignature(settings);
	const shouldBuild = shouldParse
		|| transaction.selection !== undefined
		|| transaction.reconfigured
		|| isCaptionRefreshTransaction(transaction)
		|| !wasLivePreview
		|| value.appearanceSignature !== appearanceSignature;
	return shouldBuild
		? {
			document,
			decorations: buildDecorations(
				transaction.state,
				document as CaptionDocument,
				settings,
			),
			appearanceSignature,
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
		const isEditingMarker = target.marker !== null
			&& selectionOverlaps(state, target.marker.from, target.marker.to);
		const isEditingTarget = target.kind === "figure"
			&& selectionOverlaps(state, target.target.from, target.target.to);

		if (
			target.marker !== null
			&& !isEditingMarker
		) {
			const hiddenTo = target.kind === "table" && target.marker.to < state.doc.length
				? target.marker.to + 1
				: target.marker.to;
			ranges.push(Decoration.replace({ block: target.kind === "table" }).range(
				target.marker.from,
				hiddenTo,
			));
		}

		if (
			captionText === null
			|| (target.kind === "table" && isEditingMarker)
			|| isEditingTarget
		) {
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

function getTableCaptionSourcePosition(	target: Extract<CaptionTarget, { kind: "table" }>,
): number {
	const markerPrefix = /^Table:\\s*|^:\\s*/iu.exec(target.markerText)?.[0] ?? "";
	return target.marker.from + markerPrefix.length;
}

function selectionOverlaps(state: EditorState, from: number, to: number): boolean {
	return state.selection.ranges.some((range) => {
		if (range.from === range.to) {
			return range.from > from && range.from < to;
		}
		return range.from < to && range.to > from;
	});
}

function getAppearanceSignature(settings: CaptionSettings, kind: CaptionTarget["kind"]): string {
	return getCaptionAppearance(settings, kind).signature;
}

function getDocumentAppearanceSignature(settings: CaptionSettings): string {
	return [
		getAppearanceSignature(settings, "figure"),
		getAppearanceSignature(settings, "table"),
		settings.showFileNameAsCaption,
	].join("|");
}
