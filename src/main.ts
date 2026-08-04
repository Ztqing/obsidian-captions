import type { Extension } from "@codemirror/state";
import { Plugin, TFile } from "obsidian";

import { createPandocCrossrefEditorExtension } from "./features/pandoc-crossref/live-preview";
import {
	parsePandocCrossrefDocument,
	type PandocCrossrefDocument,
} from "./features/pandoc-crossref/parser";
import {
	PandocCrossrefReadingCoordinator,
	PandocCrossrefSectionRenderChild,
} from "./features/pandoc-crossref/reading-coordinator";
import { cleanupPandocCrossrefReadingView } from "./features/pandoc-crossref/reading-view";
import {
	cleanupWikiImageCaptions,
	hasWikiImageEmbed,
	renderWikiImageCaptions,
} from "./features/wiki-image/dom";
import { createWikiImageCaptionEditorExtension } from "./features/wiki-image/live-preview";
import { WikiImageCaptionRenderChild } from "./features/wiki-image/reading-view";
import {
	CaptionsSettingTab,
	createDefaultSettings,
	type CaptionsPluginSettings,
} from "./settings";

export default class CaptionsPlugin extends Plugin {
	settings: CaptionsPluginSettings = createDefaultSettings();

	private readonly editorExtensions: Extension[] = [];
	private readonly pandocDocuments = new Map<string, {
		mtime: number;
		document: Promise<PandocCrossrefDocument>;
	}>();
	private readonly pandocReadingCoordinator = new PandocCrossrefReadingCoordinator(
		() => this.settings.pandocCrossref,
	);

	async onload(): Promise<void> {
		await this.loadSettings();

		this.editorExtensions.push(...this.createEditorExtensions());
		this.registerEditorExtension(this.editorExtensions);

		this.registerMarkdownPostProcessor((el, context) => {
			const sectionText = context.getSectionInfo(el)?.text ?? "";
			if (!hasWikiImageEmbed(el, sectionText)) {
				return;
			}

			renderWikiImageCaptions(el, this.settings.wikiImage);
			context.addChild(
				new WikiImageCaptionRenderChild(
					el,
					() => this.settings.wikiImage,
				),
			);
		});

		this.registerMarkdownPostProcessor((el, context) => {
			const sourceFile = this.app.vault.getAbstractFileByPath(context.sourcePath);
			if (!(sourceFile instanceof TFile)) {
				return;
			}

			const sectionInfo = context.getSectionInfo(el);
			if (sectionInfo === null) {
				return;
			}

			context.addChild(
				new PandocCrossrefSectionRenderChild(
					el,
					context.docId,
					sectionInfo,
					this.getPandocDocument(sourceFile),
					this.pandocReadingCoordinator,
				),
			);
		});

		this.addSettingTab(new CaptionsSettingTab(this.app, this));
	}

	onunload(): void {
		this.pandocDocuments.clear();
		this.pandocReadingCoordinator.clear();
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			cleanupWikiImageCaptions(leaf.view.containerEl);
			cleanupPandocCrossrefReadingView(leaf.view.containerEl);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshCaptions(): void {
		this.editorExtensions.length = 0;
		this.editorExtensions.push(...this.createEditorExtensions());
		this.app.workspace.updateOptions();
		this.pandocReadingCoordinator.refresh();

		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			renderWikiImageCaptions(
				leaf.view.containerEl,
				this.settings.wikiImage,
			);
		}
	}

	private createEditorExtensions(): Extension[] {
		return [
			createWikiImageCaptionEditorExtension(
				() => this.settings.wikiImage,
			),
			createPandocCrossrefEditorExtension(
				() => this.settings.pandocCrossref,
			),
		];
	}

	private getPandocDocument(
		file: TFile,
	): Promise<PandocCrossrefDocument> {
		const cached = this.pandocDocuments.get(file.path);
		if (cached?.mtime === file.stat.mtime) {
			return cached.document;
		}

		const document = this.app.vault.cachedRead(file)
			.then((source) => parsePandocCrossrefDocument(source));
		this.pandocDocuments.set(file.path, {
			mtime: file.stat.mtime,
			document,
		});
		return document;
	}

	private async loadSettings(): Promise<void> {
		const stored = await this.loadData() as Partial<CaptionsPluginSettings> | null;
		const defaults = createDefaultSettings();

		this.settings = {
			wikiImage: {
				...defaults.wikiImage,
				...stored?.wikiImage,
			},
			pandocCrossref: {
				...defaults.pandocCrossref,
				...stored?.pandocCrossref,
			},
		};
	}
}
