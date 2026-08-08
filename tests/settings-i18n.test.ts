import * as assert from "node:assert/strict";
import { test } from "node:test";

import { getSettingsStrings } from "../src/settings-i18n";

void test("uses Chinese strings for Chinese locales and has no engine controls", () => {
	const strings = getSettingsStrings("zh-CN");
	assert.equal(strings.appearance.heading, "题注外观");
	assert.equal(strings.behavior.fileNameFallbackName, "使用文件名作为兜底");
	assert.equal("engines" in strings, false);
	assert.equal("labels" in strings, false);
});

void test("uses English as the locale fallback", () => {
	const strings = getSettingsStrings("de-DE");
	assert.equal(strings.appearance.heading, "Caption appearance");
	assert.equal(strings.behavior.heading, "Caption behavior");
});
