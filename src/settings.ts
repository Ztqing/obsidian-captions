import { type App, Plugin, PluginSettingTab, Setting } from "obsidian";

import {
	STANDARD_MARKDOWN_ENGINE_OPTIONS,
	type StandardMarkdownEngine,
} from "./engine-manager";
import {
	CAPTION_FONT_SIZE_PERCENT_MAX,
	CAPTION_FONT_SIZE_PERCENT_MIN,
	CAPTION_FONT_SIZE_PERCENT_STEP,
	CAPTION_SPACING_PX_MAX,
	CAPTION_SPACING_PX_MIN,
	CAPTION_SPACING_PX_STEP,
	type CaptionAlignment,
	type CaptionPosition,
	type CaptionStyle,
} from "./caption-settings";
import type { CaptionsPluginSettings } from "./settings-data";

const APPEARANCE_SAVE_DELAY_MS = 150;

interface SettingsController {
	settings: CaptionsPluginSettings;
	refreshCaptions(): void;
	saveSettings(): Promise<void>;
}

export class CaptionsSettingTab extends PluginSettingTab {
	private readonly controller: SettingsController;
	private appearanceSaveTimer: number | null = null;
	private saveQueue: Promise<void> = Promise.resolve();

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
			.setName("Caption labels")
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
			.setName("Caption appearance")
			.setHeading();

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
			.setName("Font style")
			.setDesc("Display generated captions using italic, normal, or bold text.")
			.addDropdown((dropdown) => dropdown
				.addOption("italic", "Italic")
				.addOption("normal", "Normal")
				.addOption("bold", "Bold")
				.setValue(this.controller.settings.captions.style)
				.onChange(async (value) => {
					if (!isCaptionStyle(value)) {
						return;
					}

					this.controller.settings.captions.style = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Font size")
			.setDesc("Set caption text size relative to the current Obsidian theme.")
			.addSlider((slider) => {
				slider.getValuePretty = () => `${slider.getValue()}%`;
				slider
					.setLimits(
						CAPTION_FONT_SIZE_PERCENT_MIN,
						CAPTION_FONT_SIZE_PERCENT_MAX,
						CAPTION_FONT_SIZE_PERCENT_STEP,
					)
					.setValue(this.controller.settings.captions.fontSizePercent)
					.setInstant(true)
					.setDynamicTooltip()
					.onChange((value) => {
						this.controller.settings.captions.fontSizePercent = value;
						this.scheduleAppearanceSaveAndRefresh();
					});
			});

		new Setting(this.containerEl)
			.setName("Spacing above")
			.setDesc("Set the space before generated captions.")
			.addSlider((slider) => {
				slider.getValuePretty = () => `${slider.getValue()}px`;
				slider
					.setLimits(
						CAPTION_SPACING_PX_MIN,
						CAPTION_SPACING_PX_MAX,
						CAPTION_SPACING_PX_STEP,
					)
					.setValue(this.controller.settings.captions.spacingAbovePx)
					.setInstant(true)
					.setDynamicTooltip()
					.onChange((value) => {
						this.controller.settings.captions.spacingAbovePx = value;
						this.scheduleAppearanceSaveAndRefresh();
					});
			});

		new Setting(this.containerEl)
			.setName("Spacing below")
			.setDesc("Set the space after generated captions.")
			.addSlider((slider) => {
				slider.getValuePretty = () => `${slider.getValue()}px`;
				slider
					.setLimits(
						CAPTION_SPACING_PX_MIN,
						CAPTION_SPACING_PX_MAX,
						CAPTION_SPACING_PX_STEP,
					)
					.setValue(this.controller.settings.captions.spacingBelowPx)
					.setInstant(true)
					.setDynamicTooltip()
					.onChange((value) => {
						this.controller.settings.captions.spacingBelowPx = value;
						this.scheduleAppearanceSaveAndRefresh();
				});
			});

		new Setting(this.containerEl)
			.setName("Figure caption position")
			.setDesc("Place figure captions above or below images.")
			.addDropdown((dropdown) => dropdown
				.addOption("above", "Above")
				.addOption("below", "Below")
				.setValue(this.controller.settings.captions.figurePosition)
				.onChange(async (value) => {
					if (!isCaptionPosition(value)) {
						return;
					}

					this.controller.settings.captions.figurePosition = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Table caption position")
			.setDesc("Place table captions above or below tables.")
			.addDropdown((dropdown) => dropdown
				.addOption("above", "Above")
				.addOption("below", "Below")
				.setValue(this.controller.settings.captions.tablePosition)
				.onChange(async (value) => {
					if (!isCaptionPosition(value)) {
						return;
					}

					this.controller.settings.captions.tablePosition = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName("Caption behavior")
			.setHeading();

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

	hide(): void {
		this.flushAppearanceSaveAndRefresh();
		super.hide();
	}

	private async setStandardMarkdownEngine(
		engine: StandardMarkdownEngine,
	): Promise<void> {
		this.controller.settings.engines.standardMarkdown = engine;
		this.controller.settings.engines.pandocCrossref = engine === "pandocCrossref";
		await this.saveAndRefresh();
		this.display();
	}

	private saveAndRefresh(): Promise<void> {
		this.cancelScheduledAppearanceSave();
		const task = this.saveQueue.then(async () => {
			await this.controller.saveSettings();
			this.controller.refreshCaptions();
		});
		this.saveQueue = task.catch(() => undefined);
		return task;
	}

	private scheduleAppearanceSaveAndRefresh(): void {
		this.cancelScheduledAppearanceSave();
		this.appearanceSaveTimer = window.setTimeout(() => {
			this.appearanceSaveTimer = null;
			void this.saveAndRefresh();
		}, APPEARANCE_SAVE_DELAY_MS);
	}

	private flushAppearanceSaveAndRefresh(): void {
		if (this.appearanceSaveTimer === null) {
			return;
		}

		this.cancelScheduledAppearanceSave();
		void this.saveAndRefresh();
	}

	private cancelScheduledAppearanceSave(): void {
		if (this.appearanceSaveTimer === null) {
			return;
		}

		window.clearTimeout(this.appearanceSaveTimer);
		this.appearanceSaveTimer = null;
	}
}

function isCaptionAlignment(value: string): value is CaptionAlignment {
	return value === "left" || value === "center" || value === "right";
}

function isCaptionStyle(value: string): value is CaptionStyle {
	return value === "italic" || value === "normal" || value === "bold";
}

function isCaptionPosition(value: string): value is CaptionPosition {
	return value === "above" || value === "below";
}

function isStandardMarkdownEngine(value: string): value is StandardMarkdownEngine {
	return value === "none" || value === "pandocCrossref" || value === "quarto";
}
