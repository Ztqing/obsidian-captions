import type { Extension } from "@codemirror/state";
import { Plugin } from "obsidian";

import { CaptionEngine } from "./features/caption-engine";
import {
	createDefaultSettings,
	normalizeSettings,
	type CaptionsPluginSettings,
} from "./settings-data";
import { CaptionsSettingTab } from "./settings";

export default class CaptionsPlugin extends Plugin {
	settings: CaptionsPluginSettings = createDefaultSettings();

	private readonly editorExtensions: Extension[] = [];
	private captionEngine: CaptionEngine | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.captionEngine = new CaptionEngine(
			this.app,
			() => this.settings.captions,
			() => this.getMarkdownRoots(),
		);

		this.editorExtensions.push(
			...this.captionEngine.createEditorExtensions(),
		);
		this.registerEditorExtension(this.editorExtensions);

		this.registerMarkdownPostProcessor((root, context) => {
			this.captionEngine?.attachReadingSection(root, context);
		});

		this.addSettingTab(new CaptionsSettingTab(this.app, this));
		this.captionEngine.refresh();
	}

	onunload(): void {
		this.captionEngine?.cleanup();
		this.captionEngine = null;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshCaptions(): void {
		if (this.captionEngine === null) {
			return;
		}
		this.app.workspace.updateOptions();
		this.captionEngine.refresh();
	}

	private getMarkdownRoots(): HTMLElement[] {
		return this.app.workspace.getLeavesOfType("markdown")
			.map((leaf) => leaf.view.containerEl);
	}

	private async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}
}
