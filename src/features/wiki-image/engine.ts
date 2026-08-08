import type { Extension } from "@codemirror/state";
import {
	editorLivePreviewField,
	type MarkdownPostProcessorContext,
} from "obsidian";

import type { WikiImageCaptionSettings } from "./caption";
import {
	cleanupWikiImageCaptions,
	hasWikiImageEmbed,
	renderWikiImageCaptions,
} from "./dom";
import { createWikiImageCaptionEditorExtension } from "./live-preview";
import { WikiImageCaptionReadingCoordinator } from "./reading-coordinator";
import { WikiImageCaptionRenderChild } from "./reading-view";

type SettingsProvider = () => WikiImageCaptionSettings;
type ReadingRootsProvider = () => HTMLElement[];

export class WikiImageCaptionEngine {
	private readonly readingCoordinator: WikiImageCaptionReadingCoordinator;

	constructor(
		private readonly getSettings: SettingsProvider,
		private readonly getReadingRoots: ReadingRootsProvider,
	) {
		this.readingCoordinator = new WikiImageCaptionReadingCoordinator(getSettings);
	}

	createEditorExtension(): Extension {
		return createWikiImageCaptionEditorExtension(
			this.getSettings,
			editorLivePreviewField,
		);
	}

	attachReadingSection(
		root: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		const sectionText = context.getSectionInfo(root)?.text ?? "";
		if (!hasWikiImageEmbed(root, sectionText)) {
			return;
		}

		context.addChild(
			new WikiImageCaptionRenderChild(root, this.readingCoordinator),
		);
	}

	refresh(): void {
		this.readingCoordinator.enable();
		for (const root of this.getReadingRoots()) {
			renderWikiImageCaptions(root, this.getSettings());
		}
	}

	cleanup(): void {
		this.readingCoordinator.clear();
		this.cleanupRoots();
	}

	private cleanupRoots(): void {
		for (const root of this.getReadingRoots()) {
			cleanupWikiImageCaptions(root);
		}
	}
}
