import type { Extension } from "@codemirror/state";
import { Plugin } from "obsidian";

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

	async onload(): Promise<void> {
		await this.loadSettings();

		this.editorExtensions.push(this.createEditorExtension());
		this.registerEditorExtension(this.editorExtensions);

		this.registerMarkdownPostProcessor((el, context) => {
			if (!hasWikiImageEmbed(el)) {
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

		this.addSettingTab(new CaptionsSettingTab(this.app, this));
	}

	onunload(): void {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			cleanupWikiImageCaptions(leaf.view.containerEl);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshCaptions(): void {
		this.editorExtensions.length = 0;
		this.editorExtensions.push(this.createEditorExtension());
		this.app.workspace.updateOptions();

		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			renderWikiImageCaptions(
				leaf.view.containerEl,
				this.settings.wikiImage,
			);
		}
	}

	private createEditorExtension(): Extension {
		return createWikiImageCaptionEditorExtension(
			() => this.settings.wikiImage,
		);
	}

	private async loadSettings(): Promise<void> {
		const stored = await this.loadData() as Partial<CaptionsPluginSettings> | null;
		const defaults = createDefaultSettings();

		this.settings = {
			wikiImage: {
				...defaults.wikiImage,
				...stored?.wikiImage,
			},
		};
	}
}
