import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	formatCommittedNumericSettingInputValue,
	normalizeNumericSettingValue,
} from "../src/settings-controls";

void test("accepts precise in-range numeric setting values", () => {
	assert.equal(normalizeNumericSettingValue("87", 85, 50, 200, 1), 87);
	assert.equal(normalizeNumericSettingValue("12", 8, 0, 32, 1), 12);
});

void test("clamps numeric setting input to its supported range", () => {
	assert.equal(normalizeNumericSettingValue("25", 85, 50, 200, 1), 50);
	assert.equal(normalizeNumericSettingValue("250", 85, 50, 200, 1), 200);
	assert.equal(normalizeNumericSettingValue("-2", 8, 0, 32, 1), 0);
});

void test("restores the current value for empty or invalid numeric input", () => {
	assert.equal(normalizeNumericSettingValue("", 85, 50, 200, 1), 85);
	assert.equal(normalizeNumericSettingValue("not-a-number", 8, 0, 32, 1), 8);
});

void test("restores a configured default for empty numeric input", () => {
	assert.equal(normalizeNumericSettingValue("", 6, 0, 32, 1, 12), 12);
	assert.equal(normalizeNumericSettingValue("not-a-number", 6, 0, 32, 1, 12), 6);
});

void test("preserves explicit default values instead of showing the placeholder", () => {
	assert.equal(formatCommittedNumericSettingInputValue("85", 85), "85");
	assert.equal(formatCommittedNumericSettingInputValue("12", 12), "12");
	assert.equal(formatCommittedNumericSettingInputValue("", 85), "");
	assert.equal(formatCommittedNumericSettingInputValue("  ", 12), "");
});
