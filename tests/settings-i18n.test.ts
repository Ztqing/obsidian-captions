import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	getSettingsStrings,
	resolveSettingsLocale,
} from "../src/settings-i18n";

void test("uses Chinese settings strings for Obsidian Chinese locales", () => {
	for (const languageCode of ["zh", "zh-CN", "zh_Hans", "zh-TW"]) {
		assert.equal(resolveSettingsLocale(languageCode), "zh");
		assert.equal(getSettingsStrings(languageCode).engines.heading, "引擎");
	}
});

void test("uses English settings strings as the default fallback", () => {
	for (const languageCode of [undefined, null, "", "en", "en-GB", "ja"]) {
		assert.equal(resolveSettingsLocale(languageCode), "en");
		assert.equal(getSettingsStrings(languageCode).engines.heading, "Engines");
	}
});

void test("localizes controls and choices", () => {
	const english = getSettingsStrings("en");
	const chinese = getSettingsStrings("zh-CN");

	assert.equal(english.appearance.styleOptions.bold, "Bold");
	assert.equal(chinese.appearance.styleOptions.bold, "粗体");
	assert.equal(english.engines.options.none, "None");
	assert.equal(chinese.engines.options.none, "无");
});
