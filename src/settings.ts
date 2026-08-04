import { type App, Plugin, PluginSettingTab, Setting } from "obsidian";

import {
	CAPTION_ENGINE_METADATA,
	type CaptionEngineId,
} from "./engine-manager";
import type {
	WikiCaptionAlignment,
	WikiCaptionStyle,
} from "./features/wiki-image/caption";
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

		for (const engine of CAPTION_ENGINE_METADATA) {
			new Setting(this.containerEl)
				.setName(engine.name)
				.setDesc(engine.description)
				.addToggle((toggle) => toggle
					.setValue(this.controller.settings.engines[engine.id])
					.onChange(async (value) => {
						await this.setEngineEnabled(engine.id, value);
					}));
		}

		new Setting(this.containerEl)
			.setName("Wiki images")
			.setHeading();

		const wikiEnabled = this.controller.settings.engines.wikiImage;
		new Setting(this.containerEl)
			.setName("Use file name as fallback")
			.setDesc("Show the image file name when a wiki image has no caption alias.")
			.addToggle((toggle) => toggle
				.setDisabled(!wikiEnabled)
				.setValue(this.controller.settings.wikiImage.showFileNameAsCaption)
				.onChange(async (value) => {
					this.controller.settings.wikiImage.showFileNameAsCaption = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Caption alignment")
			.setDesc("Align wiki image captions relative to their image container.")
			.addDropdown((dropdown) => dropdown
				.setDisabled(!wikiEnabled)
				.addOption("left", "Left")
				.addOption("center", "Center")
				.addOption("right", "Right")
				.setValue(this.controller.settings.wikiImage.alignment)
				.onChange(async (value) => {
					if (!isWikiCaptionAlignment(value)) {
						return;
					}

					this.controller.settings.wikiImage.alignment = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Caption style")
			.setDesc("Display wiki image captions using italic or normal text.")
			.addDropdown((dropdown) => dropdown
				.setDisabled(!wikiEnabled)
				.addOption("italic", "Italic")
				.addOption("normal", "Normal")
				.setValue(this.controller.settings.wikiImage.style)
				.onChange(async (value) => {
					if (!isWikiCaptionStyle(value)) {
						return;
					}

					this.controller.settings.wikiImage.style = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Pandoc and pandoc-crossref")
			.setHeading();

		const pandocEnabled = this.controller.settings.engines.pandocCrossref;
		new Setting(this.containerEl)
			.setName("Figure label")
			.setDesc("Label used for pandoc-crossref figure captions and references.")
			.addText((text) => text
				.setDisabled(!pandocEnabled)
				.setPlaceholder("Figure")
				.setValue(this.controller.settings.pandocCrossref.figureLabel)
				.onChange(async (value) => {
					this.controller.settings.pandocCrossref.figureLabel = value.trim() || "Figure";
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Table label")
			.setDesc("Label used for pandoc-crossref table captions and references.")
			.addText((text) => text
				.setDisabled(!pandocEnabled)
				.setPlaceholder("Table")
				.setValue(this.controller.settings.pandocCrossref.tableLabel)
				.onChange(async (value) => {
					this.controller.settings.pandocCrossref.tableLabel = value.trim() || "Table";
					await this.saveAndRefresh();
				}));
	}

	private async setEngineEnabled(
		id: CaptionEngineId,
		enabled: boolean,
	): Promise<void> {
		this.controller.settings.engines[id] = enabled;
		await this.saveAndRefresh();
		this.display();
	}

	private async saveAndRefresh(): Promise<void> {
		await this.controller.saveSettings();
		this.controller.refreshCaptions();
	}
}

function isWikiCaptionAlignment(value: string): value is WikiCaptionAlignment {
	return value === "left" || value === "center" || value === "right";
}

function isWikiCaptionStyle(value: string): value is WikiCaptionStyle {
	return value === "italic" || value === "normal";
}
