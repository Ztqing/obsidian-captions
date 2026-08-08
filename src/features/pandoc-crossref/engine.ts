import type { Extension } from "@codemirror/state";
import {
	editorLivePreviewField,
	type App,
	type MarkdownPostProcessorContext,
	TFile,
} from "obsidian";

import type { CaptionEngine } from "../../engine-manager";
import { createPandocCrossrefEditorExtension } from "./live-preview";
import {
	parsePandocCrossrefDocument,
	type PandocCrossrefDocument,
} from "./parser";
import { PandocCrossrefReadingCoordinator } from "./reading-coordinator";
import { cleanupPandocCrossrefReadingView } from "./reading-view";
import { PandocCrossrefSectionRenderChild } from "./section-render-child";
import type { PandocCrossrefSettings } from "./settings";

type SettingsProvider = () => PandocCrossrefSettings;
type ReadingRootsProvider = () => HTMLElement[];

interface CachedPandocDocument {
	mtime: number;
	document: Promise<PandocCrossrefDocument>;
}

export class PandocCrossrefEngine implements CaptionEngine {
	readonly id = "pandocCrossref" as const;
	private readonly documents = new Map<string, CachedPandocDocument>();
	private readonly readingCoordinator: PandocCrossrefReadingCoordinator;

	constructor(
		private readonly app: App,
		private readonly getSettings: SettingsProvider,
		private readonly getReadingRoots: ReadingRootsProvider,
	) {
		this.readingCoordinator = new PandocCrossrefReadingCoordinator(getSettings);
	}

	createEditorExtension(): Extension {
		return createPandocCrossrefEditorExtension(
			this.getSettings,
			editorLivePreviewField,
		);
	}

	attachReadingSection(
		root: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
		if (!(sourceFile instanceof TFile)) {
			return;
		}

		const sectionInfo = context.getSectionInfo(root);
		if (sectionInfo === null) {
			return;
		}

		context.addChild(
			new PandocCrossrefSectionRenderChild(
				root,
				context.docId,
				sectionInfo,
				() => this.getDocument(sourceFile),
				this.readingCoordinator,
			),
		);
	}

	refresh(): void {
		this.readingCoordinator.enable();
	}

	disable(): void {
		this.documents.clear();
		this.readingCoordinator.disable();
		this.cleanupRoots();
	}

	cleanup(): void {
		this.documents.clear();
		this.readingCoordinator.clear();
		this.cleanupRoots();
	}

	private getDocument(file: TFile): Promise<PandocCrossrefDocument> {
		const cached = this.documents.get(file.path);
		if (cached?.mtime === file.stat.mtime) {
			return cached.document;
		}

		const document = this.app.vault.cachedRead(file)
			.then((source) => parsePandocCrossrefDocument(source));
		this.documents.set(file.path, {
			mtime: file.stat.mtime,
			document,
		});
		return document;
	}

	private cleanupRoots(): void {
		for (const root of this.getReadingRoots()) {
			cleanupPandocCrossrefReadingView(root);
		}
	}
}
