export function normalizeNumericSettingValue(
	rawValue: string,
	fallback: number,
	min: number,
	max: number,
	step: number,
): number {
	if (rawValue.trim().length === 0) {
		return fallback;
	}

	const parsedValue = Number(rawValue);
	if (!Number.isFinite(parsedValue)) {
		return fallback;
	}

	const clampedValue = Math.min(max, Math.max(min, parsedValue));
	const stepsFromMinimum = Math.round((clampedValue - min) / step);
	return Math.min(max, min + stepsFromMinimum * step);
}
