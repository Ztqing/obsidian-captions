import {
	StateEffect,
	type Extension,
	type Transaction,
} from "@codemirror/state";
import {
	EditorView,
	ViewPlugin,
	type PluginValue,
} from "@codemirror/view";

const refreshEffect = StateEffect.define<null>();
const editorViews = new Set<EditorView>();

export function createCaptionRefreshEffect(): StateEffect<null> {
	return refreshEffect.of(null);
}

export function createEditorRefreshExtension(): Extension {
	return ViewPlugin.define((view) => new EditorRefreshPlugin(view));
}

export function refreshCaptionEditorViews(): void {
	for (const view of editorViews) {
		if (view.dom.isConnected) {
			view.dispatch({ effects: refreshEffect.of(null) });
		} else {
			editorViews.delete(view);
		}
	}
}

export function isCaptionRefreshTransaction(
	transaction: Transaction,
): boolean {
	return transaction.effects.some((effect) => effect.is(refreshEffect));
}

class EditorRefreshPlugin implements PluginValue {
	constructor(private readonly view: EditorView) {
		editorViews.add(view);
	}

	destroy(): void {
		editorViews.delete(this.view);
	}
}
