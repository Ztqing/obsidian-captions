import type { Extension } from "@codemirror/state";
import {
	editorLivePreviewField,
	type App,
	type MarkdownPostProcessorContext,
	TFile,
} from "obsidian";

import type { CaptionSettings } from "../../caption-settings";
import { createMarkdownCaptionEditorExtension } from "./live-preview";
import { parseCaptionDocument, type CaptionDocument } from "./parser";
import { CaptionReadingCoordinator } from "./reading-coordinator";
import { cleanupCaptionReadingView } from "./reading-view";
import { CaptionSectionRenderChild } from "./section-render-child";

type SettingsProvider = () => CaptionSettings;
type ReadingRootsProvider = () => HTMLElement[];

interface CachedDocument {
	mtime: number;
	document: Promise<CaptionDocument>;
}

export class MarkdownCaptionEngine {
	private readonly documents = new Map<string, CachedDocument>();
	private readonly readingCoordinator: CaptionReadingCoordinator;

	constructor(
		private readonly app: App,
		private readonly getSettings: SettingsProvider,
		private readonly getReadingRoots: ReadingRootsProvider,
	) {
		this.readingCoordinator = new CaptionReadingCoordinator(getSettings);
	}

	createEditorExtension(): Extension {
		return createMarkdownCaptionEditorExtension(
			this.getSettings,
			editorLivePreviewField,
		);
	}

	attachReadingSection(root: HTMLElement, context: MarkdownPostProcessorContext): void {
		const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
		if (!(sourceFile instanceof TFile)) {
			return;
		}
		const sectionInfo = context.getSectionInfo(root);
		if (sectionInfo === null) {
			return;
		}
		context.addChild(new CaptionSectionRenderChild(
			root,
			context.docId,
			sectionInfo,
			() => this.getDocument(sourceFile),
			this.readingCoordinator,
		));
	}

	refresh(): void {
		this.readingCoordinator.enable();
	}

	cleanup(): void {
		this.documents.clear();
		this.readingCoordinator.clear();
		for (const root of this.getReadingRoots()) {
			cleanupCaptionReadingView(root);
		}
	}

	private getDocument(file: TFile): Promise<CaptionDocument> {
		const cached = this.documents.get(file.path);
		if (cached?.mtime === file.stat.mtime) {
			return cached.document;
		}
		const document = this.app.vault.cachedRead(file).then(parseCaptionDocument);
		this.documents.set(file.path, { mtime: file.stat.mtime, document });
		return document;
	}
}
