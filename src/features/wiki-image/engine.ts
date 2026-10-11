import type { Extension } from "@codemirror/state";
import {
	editorLivePreviewField,
	type MarkdownPostProcessorContext,
} from "obsidian";

import type { WikiImageCaptionSettings } from "./caption";
import {
	hasWikiImageEmbed,
} from "./dom";
import { createWikiImageCaptionEditorExtension } from "./live-preview";
import { WikiImageCaptionReadingCoordinator } from "./reading-coordinator";
import { WikiImageCaptionReadingLifecycle } from "./reading-lifecycle";
import { WikiImageCaptionRenderChild } from "./reading-view";

type SettingsProvider = () => WikiImageCaptionSettings;
type ReadingRootsProvider = () => HTMLElement[];

export class WikiImageCaptionEngine {
	private readonly readingCoordinator: WikiImageCaptionReadingCoordinator;
	private readonly readingLifecycle: WikiImageCaptionReadingLifecycle;

	constructor(
		private readonly getSettings: SettingsProvider,
		getReadingRoots: ReadingRootsProvider,
	) {
		this.readingCoordinator = new WikiImageCaptionReadingCoordinator(getSettings);
		this.readingLifecycle = new WikiImageCaptionReadingLifecycle(
			this.readingCoordinator,
			getSettings,
			getReadingRoots,
		);
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
		this.readingLifecycle.refresh();
	}

	cleanup(): void {
		this.readingLifecycle.cleanup();
	}
}
