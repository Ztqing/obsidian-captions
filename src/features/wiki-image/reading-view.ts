import { MarkdownRenderChild } from "obsidian";

import type { WikiImageCaptionSettings } from "./caption";
import { cleanupWikiImageCaptions } from "./dom";
import { WikiImageCaptionObserver } from "./observer";

type SettingsProvider = () => WikiImageCaptionSettings;

export class WikiImageCaptionRenderChild extends MarkdownRenderChild {
	private readonly observer: WikiImageCaptionObserver;

	constructor(
		containerEl: HTMLElement,
		getSettings: SettingsProvider,
	) {
		super(containerEl);
		this.observer = new WikiImageCaptionObserver(containerEl, getSettings);
	}

	onload(): void {
		this.observer.start();
	}

	onunload(): void {
		this.observer.stop();
		cleanupWikiImageCaptions(this.containerEl);
	}
}
