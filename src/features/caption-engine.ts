import type { Extension } from "@codemirror/state";
import type { App, MarkdownPostProcessorContext } from "obsidian";

import type { CaptionSettings } from "../caption-settings";
import { MarkdownCaptionEngine } from "./markdown/engine";
import { WikiImageCaptionEngine } from "./wiki-image/engine";

type SettingsProvider = () => CaptionSettings;
type ReadingRootsProvider = () => HTMLElement[];

/** The single 0.0.9 feature entry point for all locally rendered captions. */
export class CaptionEngine {
	private readonly wikiImages: WikiImageCaptionEngine;
	private readonly markdown: MarkdownCaptionEngine;

	constructor(
		app: App,
		getSettings: SettingsProvider,
		getReadingRoots: ReadingRootsProvider,
	) {
		this.wikiImages = new WikiImageCaptionEngine(getSettings, getReadingRoots);
		this.markdown = new MarkdownCaptionEngine(app, getSettings, getReadingRoots);
	}

	createEditorExtensions(): Extension[] {
		return [
			this.wikiImages.createEditorExtension(),
			this.markdown.createEditorExtension(),
		];
	}

	attachReadingSection(root: HTMLElement, context: MarkdownPostProcessorContext): void {
		this.wikiImages.attachReadingSection(root, context);
		this.markdown.attachReadingSection(root, context);
	}

	refresh(): void {
		this.wikiImages.refresh();
		this.markdown.refresh();
	}

	cleanup(): void {
		this.wikiImages.cleanup();
		this.markdown.cleanup();
	}
}
