import type { Extension } from "@codemirror/state";
import { Plugin } from "obsidian";

import {
	CaptionEngineManager,
	type CaptionEngineId,
	isCaptionEngineEnabled,
} from "./engine-manager";
import { PandocCrossrefEngine } from "./features/pandoc-crossref/engine";
import { QuartoEngine } from "./features/quarto/engine";
import { WikiImageCaptionEngine } from "./features/wiki-image/engine";
import {
	createDefaultSettings,
	normalizeSettings,
	type CaptionsPluginSettings,
} from "./settings-data";
import { CaptionsSettingTab } from "./settings";

export default class CaptionsPlugin extends Plugin {
	settings: CaptionsPluginSettings = createDefaultSettings();

	private readonly editorExtensions: Extension[] = [];
	private engineManager: CaptionEngineManager | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.engineManager = new CaptionEngineManager(
			[
				new WikiImageCaptionEngine(
					() => this.settings.captions,
					() => this.getMarkdownRoots(),
				),
				new PandocCrossrefEngine(
					this.app,
					() => this.settings.captions,
					() => this.getMarkdownRoots(),
				),
				new QuartoEngine(
					this.app,
					() => this.settings.captions,
					() => this.getMarkdownRoots(),
				),
			],
			(id) => this.isEngineEnabled(id),
		);

		this.editorExtensions.push(
			...this.engineManager.createEditorExtensions(),
		);
		this.registerEditorExtension(this.editorExtensions);

		this.registerMarkdownPostProcessor((root, context) => {
			this.engineManager?.attachReadingSection(root, context);
		});

		this.addSettingTab(new CaptionsSettingTab(this.app, this));
		this.engineManager.refresh();
	}

	onunload(): void {
		this.engineManager?.cleanup();
		this.engineManager = null;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshCaptions(): void {
		if (this.engineManager === null) {
			return;
		}

		this.editorExtensions.length = 0;
		this.editorExtensions.push(
			...this.engineManager.createEditorExtensions(),
		);
		this.app.workspace.updateOptions();
		this.engineManager.refresh();
	}

	private isEngineEnabled(id: CaptionEngineId): boolean {
		return isCaptionEngineEnabled(this.settings.engines, id);
	}

	private getMarkdownRoots(): HTMLElement[] {
		return this.app.workspace.getLeavesOfType("markdown")
			.map((leaf) => leaf.view.containerEl);
	}

	private async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}
}
