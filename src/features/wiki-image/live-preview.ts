import {
	type EditorState,
	type Extension,
	type StateField,
} from "@codemirror/state";
import {
	type EditorView,
	type PluginValue,
	type ViewUpdate,
	ViewPlugin,
} from "@codemirror/view";

import type { WikiImageCaptionSettings } from "./caption";
import {
	cleanupWikiImageCaptions,
	renderWikiImageCaptions,
} from "./dom";
import { isRelevantWikiImageMutation } from "./observer";

type SettingsProvider = () => WikiImageCaptionSettings;

export function shouldRenderWikiImageCaptions(
	state: EditorState,
	livePreviewField: StateField<boolean>,
): boolean {
	return state.field(livePreviewField, false) === true;
}

export function createWikiImageCaptionEditorExtension(
	getSettings: SettingsProvider,
	livePreviewField: StateField<boolean>,
): Extension {
	return ViewPlugin.define(
		(view) => new WikiImageCaptionViewPlugin(view, getSettings, livePreviewField),
	);
}

class WikiImageCaptionViewPlugin implements PluginValue {
	private readonly observer: MutationObserver;
	private scheduled = false;
	private destroyed = false;

	constructor(
		private readonly view: EditorView,
		private readonly getSettings: SettingsProvider,
		private readonly livePreviewField: StateField<boolean>,
	) {
		this.observer = new MutationObserver((mutations) => {
			if (mutations.some(isRelevantWikiImageMutation)) {
				this.scheduleRender();
			}
		});
		this.observer.observe(view.dom, {
			attributeFilter: ["alt", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		this.render();
	}

	update(update: ViewUpdate): void {
		if (
			update.docChanged
			|| update.viewportChanged
			|| update.transactions.some((transaction) => (
				transaction.reconfigured
				|| transaction.startState.field(this.livePreviewField, false)
					!== transaction.state.field(this.livePreviewField, false)
			))
		) {
			this.scheduleRender();
		}
	}

	destroy(): void {
		this.destroyed = true;
		this.observer.disconnect();
		cleanupWikiImageCaptions(this.view.dom);
	}

	private scheduleRender(): void {
		if (this.scheduled || this.destroyed) {
			return;
		}

		this.scheduled = true;
		void Promise.resolve().then(() => {
			this.scheduled = false;
			if (!this.destroyed) {
				this.render();
			}
		});
	}

	private render(): void {
		if (!shouldRenderWikiImageCaptions(this.view.state, this.livePreviewField)) {
			cleanupWikiImageCaptions(this.view.dom);
			return;
		}
		renderWikiImageCaptions(this.view.dom, this.getSettings());
	}
}
