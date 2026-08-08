import {
	type App,
	getLanguage,
	Plugin,
	PluginSettingTab,
	Setting,
	type SliderComponent,
	type TextComponent,
} from "obsidian";

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
import { normalizeNumericSettingValue } from "./settings-controls";
import {
	createDefaultSettings,
	type CaptionsPluginSettings,
} from "./settings-data";
import { getSettingsStrings } from "./settings-i18n";

const APPEARANCE_SAVE_DELAY_MS = 150;

interface SettingsController {
	settings: CaptionsPluginSettings;
	refreshCaptions(): void;
	saveSettings(): Promise<void>;
}

interface NumericSliderOptions {
	value: number;
	min: number;
	max: number;
	step: number;
	unit: string;
	label: string;
	onChange(value: number): void;
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
		const strings = getSettingsStrings(getLanguage());
		const defaults = createDefaultSettings();

		this.addGroupHeading(strings.engines.heading);

		new Setting(this.containerEl)
			.setName(strings.engines.wikiImageName)
			.setDesc(strings.engines.wikiImageDesc)
			.addToggle((toggle) => toggle
				.setValue(this.controller.settings.engines.wikiImage)
				.onChange(async (value) => {
					this.controller.settings.engines.wikiImage = value;
					await this.saveAndRefresh();
					this.display();
				}));

		new Setting(this.containerEl)
			.setName(strings.engines.standardMarkdownName)
			.setDesc(strings.engines.standardMarkdownDesc)
			.addDropdown((dropdown) => {
				for (const option of STANDARD_MARKDOWN_ENGINE_OPTIONS) {
					dropdown.addOption(option.id, strings.engines.options[option.id]);
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

		this.addGroupHeading(strings.labels.heading);

		new Setting(this.containerEl)
			.setName(strings.labels.figureName)
			.setDesc(strings.labels.figureDesc)
			.addText((text) => text
				.setPlaceholder(defaults.captions.figureLabel)
				.setValue(this.controller.settings.captions.figureLabel)
				.onChange(async (value) => {
					this.controller.settings.captions.figureLabel = value.trim()
						|| defaults.captions.figureLabel;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName(strings.labels.tableName)
			.setDesc(strings.labels.tableDesc)
			.addText((text) => text
				.setPlaceholder(defaults.captions.tableLabel)
				.setValue(this.controller.settings.captions.tableLabel)
				.onChange(async (value) => {
					this.controller.settings.captions.tableLabel = value.trim()
						|| defaults.captions.tableLabel;
					await this.saveAndRefresh();
				}));

		this.addGroupHeading(strings.appearance.heading);

		new Setting(this.containerEl)
			.setName(strings.appearance.alignmentName)
			.setDesc(strings.appearance.alignmentDesc)
			.addDropdown((dropdown) => dropdown
				.addOption("left", strings.appearance.alignmentOptions.left)
				.addOption("center", strings.appearance.alignmentOptions.center)
				.addOption("right", strings.appearance.alignmentOptions.right)
				.setValue(this.controller.settings.captions.alignment)
				.onChange(async (value) => {
					if (!isCaptionAlignment(value)) {
						return;
					}

					this.controller.settings.captions.alignment = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName(strings.appearance.styleName)
			.setDesc(strings.appearance.styleDesc)
			.addDropdown((dropdown) => dropdown
				.addOption("italic", strings.appearance.styleOptions.italic)
				.addOption("normal", strings.appearance.styleOptions.normal)
				.addOption("bold", strings.appearance.styleOptions.bold)
				.setValue(this.controller.settings.captions.style)
				.onChange(async (value) => {
					if (!isCaptionStyle(value)) {
						return;
					}

					this.controller.settings.captions.style = value;
					await this.saveAndRefresh();
				}));

		const fontSizeSetting = new Setting(this.containerEl)
			.setName(strings.appearance.fontSizeName)
			.setDesc(strings.appearance.fontSizeDesc);
		this.addNumericSlider(fontSizeSetting, {
			value: this.controller.settings.captions.fontSizePercent,
			min: CAPTION_FONT_SIZE_PERCENT_MIN,
			max: CAPTION_FONT_SIZE_PERCENT_MAX,
			step: CAPTION_FONT_SIZE_PERCENT_STEP,
			unit: "%",
			label: strings.appearance.fontSizeName,
			onChange: (value) => {
				this.controller.settings.captions.fontSizePercent = value;
				this.scheduleAppearanceSaveAndRefresh();
			},
		});

		const spacingAboveSetting = new Setting(this.containerEl)
			.setName(strings.appearance.spacingAboveName)
			.setDesc(strings.appearance.spacingAboveDesc);
		this.addNumericSlider(spacingAboveSetting, {
			value: this.controller.settings.captions.spacingAbovePx,
			min: CAPTION_SPACING_PX_MIN,
			max: CAPTION_SPACING_PX_MAX,
			step: CAPTION_SPACING_PX_STEP,
			unit: "px",
			label: strings.appearance.spacingAboveName,
			onChange: (value) => {
				this.controller.settings.captions.spacingAbovePx = value;
				this.scheduleAppearanceSaveAndRefresh();
			},
		});

		const spacingBelowSetting = new Setting(this.containerEl)
			.setName(strings.appearance.spacingBelowName)
			.setDesc(strings.appearance.spacingBelowDesc);
		this.addNumericSlider(spacingBelowSetting, {
			value: this.controller.settings.captions.spacingBelowPx,
			min: CAPTION_SPACING_PX_MIN,
			max: CAPTION_SPACING_PX_MAX,
			step: CAPTION_SPACING_PX_STEP,
			unit: "px",
			label: strings.appearance.spacingBelowName,
			onChange: (value) => {
				this.controller.settings.captions.spacingBelowPx = value;
				this.scheduleAppearanceSaveAndRefresh();
			},
		});

		new Setting(this.containerEl)
			.setName(strings.appearance.figurePositionName)
			.setDesc(strings.appearance.figurePositionDesc)
			.addDropdown((dropdown) => dropdown
				.addOption("above", strings.appearance.positionOptions.above)
				.addOption("below", strings.appearance.positionOptions.below)
				.setValue(this.controller.settings.captions.figurePosition)
				.onChange(async (value) => {
					if (!isCaptionPosition(value)) {
						return;
					}

					this.controller.settings.captions.figurePosition = value;
					await this.saveAndRefresh();
				}));

		new Setting(this.containerEl)
			.setName(strings.appearance.tablePositionName)
			.setDesc(strings.appearance.tablePositionDesc)
			.addDropdown((dropdown) => dropdown
				.addOption("above", strings.appearance.positionOptions.above)
				.addOption("below", strings.appearance.positionOptions.below)
				.setValue(this.controller.settings.captions.tablePosition)
				.onChange(async (value) => {
					if (!isCaptionPosition(value)) {
						return;
					}

					this.controller.settings.captions.tablePosition = value;
					await this.saveAndRefresh();
				}));

		this.addGroupHeading(strings.behavior.heading);

		new Setting(this.containerEl)
			.setName(strings.behavior.fileNameFallbackName)
			.setDesc(strings.behavior.fileNameFallbackDesc)
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

	private addGroupHeading(name: string): void {
		new Setting(this.containerEl)
			.setName(name)
			.setHeading();
	}

	private addNumericSlider(
		setting: Setting,
		options: NumericSliderOptions,
	): void {
		let currentValue = options.value;
		let sliderComponent: SliderComponent | null = null;
		let numberComponent: TextComponent | null = null;
		const updateValue = (value: number): void => {
			sliderComponent?.setValue(value);
			numberComponent?.setValue(String(value));
			if (value === currentValue) {
				return;
			}

			currentValue = value;
			options.onChange(value);
		};

		setting
			.addSlider((slider) => {
				sliderComponent = slider;
				slider.getValuePretty = () => `${slider.getValue()}${options.unit}`;
				slider
					.setLimits(options.min, options.max, options.step)
					.setValue(options.value)
					.setInstant(true)
					.setDynamicTooltip()
					.onChange(updateValue);
			})
			.addText((text) => {
				numberComponent = text;
				text.setValue(String(options.value));
				const inputEl = text.inputEl;
				inputEl.type = "number";
				inputEl.min = String(options.min);
				inputEl.max = String(options.max);
				inputEl.step = String(options.step);
				inputEl.inputMode = "numeric";
				inputEl.classList.add("captions-setting-number-input");
				inputEl.setAttribute("aria-label", options.label);

				const commitValue = (): void => {
					updateValue(normalizeNumericSettingValue(
						inputEl.value,
						currentValue,
						options.min,
						options.max,
						options.step,
					));
				};
				inputEl.addEventListener("input", () => {
					if (inputEl.value.length > 0 && inputEl.validity.valid) {
						commitValue();
					}
				});
				inputEl.addEventListener("change", commitValue);
				inputEl.addEventListener("keydown", (event) => {
					if (event.key !== "Enter") {
						return;
					}

					event.preventDefault();
					commitValue();
					inputEl.blur();
				});
			});

		const unitEl = setting.controlEl.ownerDocument.createElement("span");
		unitEl.className = "captions-setting-number-unit";
		unitEl.textContent = options.unit;
		setting.controlEl.append(unitEl);
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
