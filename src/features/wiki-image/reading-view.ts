import { MarkdownRenderChild } from "obsidian";

import type { WikiImageCaptionSettings } from "./caption";
import { renderWikiImageCaptions } from "./dom";

type SettingsProvider = () => WikiImageCaptionSettings;

export class WikiImageCaptionRenderChild extends MarkdownRenderChild {
	private observer: MutationObserver | null = null;
	private scheduled = false;
	private destroyed = false;

	constructor(
		containerEl: HTMLElement,
		private readonly getSettings: SettingsProvider,
	) {
		super(containerEl);
	}

	onload(): void {
		this.observer = new MutationObserver(() => this.scheduleRender());
		this.observer.observe(this.containerEl, {
			attributeFilter: ["alt", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		this.render();
	}

	onunload(): void {
		this.destroyed = true;
		this.observer?.disconnect();
		this.observer = null;
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
		renderWikiImageCaptions(this.containerEl, this.getSettings());
	}
}
