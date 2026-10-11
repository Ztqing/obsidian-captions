import type { WikiImageCaptionSettings } from "./caption";
import {
	cleanupWikiImageCaptions,
	renderWikiImageCaptions,
	renderWikiImageEmbeds,
} from "./dom";
import type { WikiImageCaptionReadingCoordinator } from "./reading-coordinator";

type SettingsProvider = () => WikiImageCaptionSettings;
type ReadingRootsProvider = () => HTMLElement[];

/** Owns full Reading view scans so they run once for pre-existing rendered DOM. */
export class WikiImageCaptionReadingLifecycle {
	private readonly fallbackEmbeds = new Set<HTMLElement>();
	private initialScanComplete = false;

	constructor(
		private readonly coordinator: WikiImageCaptionReadingCoordinator,
		private readonly getSettings: SettingsProvider,
		private readonly getReadingRoots: ReadingRootsProvider,
	) {}

	refresh(): void {
		if (this.initialScanComplete) {
			const settings = this.getSettings();
			this.coordinator.enable(true, settings);
			this.refreshFallbackEmbeds(
				this.coordinator.getRegisteredRoots(),
				settings,
			);
			return;
		}

		this.initialScanComplete = true;
		const settings = this.getSettings();
		for (const root of this.getReadingRoots()) {
			for (const embed of renderWikiImageCaptions(root, settings)) {
				this.fallbackEmbeds.add(embed);
			}
		}
		this.coordinator.enable(false);
	}

	cleanup(): void {
		this.coordinator.clear();
		this.fallbackEmbeds.clear();
		for (const root of this.getReadingRoots()) {
			cleanupWikiImageCaptions(root);
		}
	}

	private refreshFallbackEmbeds(
		registeredRoots: ReadonlySet<HTMLElement>,
		settings: WikiImageCaptionSettings,
	): void {
		const remaining: HTMLElement[] = [];
		for (const embed of this.fallbackEmbeds) {
			if (!embed.isConnected || hasRegisteredAncestor(embed, registeredRoots)) {
				this.fallbackEmbeds.delete(embed);
				continue;
			}
			remaining.push(embed);
		}
		renderWikiImageEmbeds(remaining, settings);
	}
}

function hasRegisteredAncestor(
	embed: HTMLElement,
	registeredRoots: ReadonlySet<HTMLElement>,
): boolean {
	let current: HTMLElement | null = embed;
	while (current !== null) {
		if (registeredRoots.has(current)) {
			return true;
		}
		current = current.parentElement;
	}
	return false;
}
