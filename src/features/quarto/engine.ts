import type { Extension } from "@codemirror/state";
import { type App, type MarkdownPostProcessorContext, TFile } from "obsidian";

import type { CaptionEngine } from "../../engine-manager";
import { createQuartoEditorExtension } from "./live-preview";
import {
	parseQuartoDocument,
	type QuartoDocument,
} from "./parser";
import { QuartoReadingCoordinator } from "./reading-coordinator";
import { cleanupQuartoReadingView } from "./reading-view";
import { QuartoSectionRenderChild } from "./section-render-child";
import type { QuartoSettings } from "./settings";

type SettingsProvider = () => QuartoSettings;
type ReadingRootsProvider = () => HTMLElement[];

interface CachedQuartoDocument {
	mtime: number;
	document: Promise<QuartoDocument>;
}

export class QuartoEngine implements CaptionEngine {
	readonly id = "quarto" as const;
	private readonly documents = new Map<string, CachedQuartoDocument>();
	private readonly readingCoordinator: QuartoReadingCoordinator;

	constructor(
		private readonly app: App,
		private readonly getSettings: SettingsProvider,
		private readonly getReadingRoots: ReadingRootsProvider,
	) {
		this.readingCoordinator = new QuartoReadingCoordinator(getSettings);
	}

	createEditorExtension(): Extension {
		return createQuartoEditorExtension(this.getSettings);
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
			new QuartoSectionRenderChild(
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

	private getDocument(file: TFile): Promise<QuartoDocument> {
		const cached = this.documents.get(file.path);
		if (cached?.mtime === file.stat.mtime) {
			return cached.document;
		}

		const document = this.app.vault.cachedRead(file)
			.then((source) => parseQuartoDocument(source));
		this.documents.set(file.path, {
			mtime: file.stat.mtime,
			document,
		});
		return document;
	}

	private cleanupRoots(): void {
		for (const root of this.getReadingRoots()) {
			cleanupQuartoReadingView(root);
		}
	}
}
