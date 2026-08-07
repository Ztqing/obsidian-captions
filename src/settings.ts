import { type App, Plugin, PluginSettingTab, Setting } from "obsidian";

import {
	STANDARD_MARKDOWN_ENGINE_OPTIONS,
	type StandardMarkdownEngine,
} from "./engine-manager";
import type {
	CaptionAlignment,
	CaptionStyle,
} from "./caption-settings";
import type { CaptionsPluginSettings } from "./settings-data";

interface SettingsController {
	settings: CaptionsPluginSettings;
	refreshCaptions(): void;
	saveSettings(): Promise<void>;
}

export class CaptionsSettingTab extends PluginSettingTab {
	private readonly controller: SettingsController;

	constructor(
		app: App,
		plugin: Plugin & SettingsController,
	) {
		super(app, plugin);
		this.controller = plugin;
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName("Engines")
			.setHeading();

		new Setting(this.containerEl)
			.setName("Wiki image captions")
			.setDesc("Render aliases for wiki image embeds.")
			.addToggle((toggle) => toggle
				.setValue(this.controller.settings.engines.wikiImage)
				.onChange(async (value) => {
					this.controller.settings.engines.wikiImage = value;
					await this.saveAndRefresh();
					this.display();
				}));

		new Setting(this.containerEl)
			.setName("Standard Markdown engine")
			.setDesc("Choose one caption and cross-reference syntax for standard images and tables.")
			.addDropdown((dropdown) => {
				for (const option of STANDARD_MARKDOWN_ENGINE_OPTIONS) {
					dropdown.addOption(option.id, option.name);
				}
				dropdown
					.setValue(this.controller.settings.engines.standardMarkdown)
					.onChange(async (value) => {
						if (!isStandardMarkdownEngine(value)) {
							return;
						}
						await this.setStandardMarkdownEngine(value);
					});
			});

		new Setting(this.containerEl)
			.setName("Caption defaults")
			.setHeading();

		new Setting(this.containerEl)
			.setName("Figure label")
			.setDesc("Used by both standard Markdown engines for numbered figure captions and references.")
			.addText((text) => text
				.setPlaceholder("Figure")
				.setValue(this.controller.settings.captions.figureLabel)
				.onChange(async (value) => {
					this.controller.settings.captions.figureLabel = value.trim() || "Figure";
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Table label")
			.setDesc("Used by both standard Markdown engines for numbered table captions and references.")
			.addText((text) => text
				.setPlaceholder("Table")
				.setValue(this.controller.settings.captions.tableLabel)
				.onChange(async (value) => {
					this.controller.settings.captions.tableLabel = value.trim() || "Table";
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Caption alignment")
			.setDesc("Align captions generated for wiki images, figures, and tables.")
			.addDropdown((dropdown) => dropdown
				.addOption("left", "Left")
				.addOption("center", "Center")
				.addOption("right", "Right")
				.setValue(this.controller.settings.captions.alignment)
				.onChange(async (value) => {
					if (!isCaptionAlignment(value)) {
						return;
					}

					this.controller.settings.captions.alignment = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Caption style")
			.setDesc("Display generated captions using italic or normal text.")
			.addDropdown((dropdown) => dropdown
				.addOption("italic", "Italic")
				.addOption("normal", "Normal")
				.setValue(this.controller.settings.captions.style)
				.onChange(async (value) => {
					if (!isCaptionStyle(value)) {
						return;
					}

					this.controller.settings.captions.style = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Use file name as fallback")
			.setDesc("Use the decoded image file name when an image has no explicit caption.")
			.addToggle((toggle) => toggle
				.setValue(this.controller.settings.captions.showFileNameAsCaption)
				.onChange(async (value) => {
					this.controller.settings.captions.showFileNameAsCaption = value;
					await this.saveAndRefresh();
				}));
	}

	private async setStandardMarkdownEngine(
		engine: StandardMarkdownEngine,
	): Promise<void> {
		this.controller.settings.engines.standardMarkdown = engine;
		this.controller.settings.engines.pandocCrossref = engine === "pandocCrossref";
		await this.saveAndRefresh();
		this.display();
	}

	private async saveAndRefresh(): Promise<void> {
		await this.controller.saveSettings();
		this.controller.refreshCaptions();
	}
}

function isCaptionAlignment(value: string): value is CaptionAlignment {
	return value === "left" || value === "center" || value === "right";
}

function isCaptionStyle(value: string): value is CaptionStyle {
	return value === "italic" || value === "normal";
}

function isStandardMarkdownEngine(value: string): value is StandardMarkdownEngine {
	return value === "none" || value === "pandocCrossref" || value === "quarto";
}
