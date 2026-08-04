import type { WikiImageCaptionSettings } from "./caption";
import { cleanupWikiImageCaptions } from "./dom";
import { WikiImageCaptionObserver } from "./observer";

type SettingsProvider = () => WikiImageCaptionSettings;
type ObserverFactory = (callback: MutationCallback) => MutationObserver;

export class WikiImageCaptionReadingCoordinator {
	private readonly observers = new Map<HTMLElement, WikiImageCaptionObserver>();
	private enabled = false;

	constructor(
		private readonly getSettings: SettingsProvider,
		private readonly createObserver?: ObserverFactory,
	) {}

	register(root: HTMLElement): void {
		if (this.observers.has(root)) {
			return;
		}

		const observer = new WikiImageCaptionObserver(
			root,
			this.getSettings,
			this.createObserver,
		);
		this.observers.set(root, observer);
		if (this.enabled) {
			observer.start();
		} else {
			cleanupWikiImageCaptions(root);
		}
	}

	unregister(root: HTMLElement): void {
		const observer = this.observers.get(root);
		observer?.stop();
		this.observers.delete(root);
		cleanupWikiImageCaptions(root);
	}

	enable(): void {
		if (this.enabled) {
			for (const observer of this.observers.values()) {
				observer.refresh();
			}
			return;
		}

		this.enabled = true;
		for (const observer of this.observers.values()) {
			observer.start();
		}
	}

	disable(): void {
		this.enabled = false;
		for (const [root, observer] of this.observers) {
			observer.stop();
			cleanupWikiImageCaptions(root);
		}
	}

	clear(): void {
		this.disable();
		this.observers.clear();
	}
}
