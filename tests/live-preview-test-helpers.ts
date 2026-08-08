import {
	type EditorState,
	StateEffect,
	StateField,
} from "@codemirror/state";
import {
	type Decoration,
	type DecorationSet,
	type EditorView,
	type WidgetType,
} from "@codemirror/view";

export const setLivePreview = StateEffect.define<boolean>();

export function createLivePreviewField(
	initialValue = false,
): StateField<boolean> {
	return StateField.define({
		create: () => initialValue,
		update: (value, transaction) => {
			for (const effect of transaction.effects) {
				if (effect.is(setLivePreview)) {
					return effect.value;
				}
			}
			return value;
		},
	});
}

export interface RenderedDecoration {
	from: number;
	to: number;
	block: boolean;
	side: number;
	className: string | null;
	textContent: string | null;
}

interface TestDecorationSpec {
	block?: boolean;
	side?: number;
	widget?: WidgetType;
}

export function renderDecorations(
	state: EditorState,
	field: StateField<DecorationSet>,
	document: Document,
): RenderedDecoration[] {
	const decorations: RenderedDecoration[] = [];
	const fakeView = {
		dom: document.createElement("div"),
	} as unknown as EditorView;

	state.field(field).between(0, state.doc.length, (from, to, decoration) => {
		decorations.push(renderDecoration(
			from,
			to,
			decoration,
			fakeView,
		));
	});
	return decorations;
}

function renderDecoration(
	from: number,
	to: number,
	decoration: Decoration,
	view: EditorView,
): RenderedDecoration {
	const spec = decoration.spec as TestDecorationSpec;
	const widget = spec.widget;
	const element = widget === undefined ? null : widget.toDOM(view);
	return {
		from,
		to,
		block: spec.block === true,
		side: spec.side ?? 0,
		className: element?.className || null,
		textContent: element?.textContent ?? null,
	};
}
