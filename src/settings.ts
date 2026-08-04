import { type App, Plugin, PluginSettingTab, Setting } from "obsidian";

import type {
	WikiCaptionAlignment,
	WikiCaptionStyle,
	WikiImageCaptionSettings,
} from "./features/wiki-image/caption";

export interface CaptionsPluginSettings {
	wikiImage: WikiImageCaptionSettings;
}

interface SettingsController {
	settings: CaptionsPluginSettings;
	refreshCaptions(): void;
	saveSettings(): Promise<void>;
}

export function createDefaultSettings(): CaptionsPluginSettings {
	return {
		wikiImage: {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		},
	};
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
			.setName("Use file name as fallback")
			.setDesc("Show the image file name when a wiki image has no caption alias.")
			.addToggle((toggle) => toggle
				.setValue(this.controller.settings.wikiImage.showFileNameAsCaption)
				.onChange(async (value) => {
					this.controller.settings.wikiImage.showFileNameAsCaption = value;
					await this.controller.saveSettings();
					this.controller.refreshCaptions();
				}));

		new Setting(this.containerEl)
			.setName("Caption alignment")
			.setDesc("Align wiki image captions relative to their image container.")
			.addDropdown((dropdown) => dropdown
				.addOption("left", "Left")
				.addOption("center", "Center")
				.addOption("right", "Right")
				.setValue(this.controller.settings.wikiImage.alignment)
				.onChange(async (value) => {
					if (!isWikiCaptionAlignment(value)) {
						return;
					}

					this.controller.settings.wikiImage.alignment = value;
					await this.controller.saveSettings();
					this.controller.refreshCaptions();
				}));

		new Setting(this.containerEl)
			.setName("Caption style")
			.setDesc("Display wiki image captions using italic or normal text.")
			.addDropdown((dropdown) => dropdown
				.addOption("italic", "Italic")
				.addOption("normal", "Normal")
				.setValue(this.controller.settings.wikiImage.style)
				.onChange(async (value) => {
					if (!isWikiCaptionStyle(value)) {
						return;
					}

					this.controller.settings.wikiImage.style = value;
					await this.controller.saveSettings();
					this.controller.refreshCaptions();
				}));
	}
}

function isWikiCaptionAlignment(value: string): value is WikiCaptionAlignment {
	return value === "left" || value === "center" || value === "right";
}

function isWikiCaptionStyle(value: string): value is WikiCaptionStyle {
	return value === "italic" || value === "normal";
}
