export function normalizeNumericSettingValue(
	rawValue: string,
	fallback: number,
	min: number,
	max: number,
	step: number,
	defaultValue = fallback,
): number {
	if (rawValue.trim().length === 0) {
		return defaultValue;
	}

	const parsedValue = Number(rawValue);
	if (!Number.isFinite(parsedValue)) {
		return fallback;
	}

	const clampedValue = Math.min(max, Math.max(min, parsedValue));
	const stepsFromMinimum = Math.round((clampedValue - min) / step);
	return Math.min(max, min + stepsFromMinimum * step);
}

export function formatCommittedNumericSettingInputValue(
	rawValue: string,
	value: number,
): string {
	return rawValue.trim().length === 0 ? "" : String(value);
}
