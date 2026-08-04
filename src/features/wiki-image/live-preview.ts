import type { Extension } from "@codemirror/state";
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

type SettingsProvider = () => WikiImageCaptionSettings;

export function createWikiImageCaptionEditorExtension(
	getSettings: SettingsProvider,
): Extension {
	return ViewPlugin.define(
		(view) => new WikiImageCaptionViewPlugin(view, getSettings),
	);
}

class WikiImageCaptionViewPlugin implements PluginValue {
	private readonly observer: MutationObserver;
	private scheduled = false;
	private destroyed = false;

	constructor(
		private readonly view: EditorView,
		private readonly getSettings: SettingsProvider,
	) {
		this.observer = new MutationObserver(() => this.scheduleRender());
		this.observer.observe(view.dom, {
			attributeFilter: ["alt", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		this.render();
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.viewportChanged) {
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
		renderWikiImageCaptions(this.view.dom, this.getSettings());
	}
}
