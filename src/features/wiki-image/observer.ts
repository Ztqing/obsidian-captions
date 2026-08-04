import type { WikiImageCaptionSettings } from "./caption";
import { renderWikiImageCaptions } from "./dom";

type SettingsProvider = () => WikiImageCaptionSettings;
type ObserverFactory = (callback: MutationCallback) => MutationObserver;

export class WikiImageCaptionObserver {
	private observer: MutationObserver | null = null;
	private scheduled = false;
	private destroyed = false;

	constructor(
		private readonly root: HTMLElement,
		private readonly getSettings: SettingsProvider,
		private readonly createObserver: ObserverFactory = (
			callback,
		) => new MutationObserver(callback),
	) {}

	start(): void {
		if (this.observer !== null) {
			return;
		}

		this.destroyed = false;
		this.observer = this.createObserver(() => this.scheduleRender());
		this.observer.observe(this.root, {
			attributeFilter: ["alt", "class", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		this.render();
	}

	stop(): void {
		this.destroyed = true;
		this.observer?.disconnect();
		this.observer = null;
	}

	private scheduleRender(): void {
		if (this.scheduled || this.destroyed) {
			return;
		}

		this.scheduled = true;
		void Promise.resolve().then(() => {
			this.scheduled = false;
			if (!this.destroyed) {
				this.render();
			}
		});
	}

	private render(): void {
		renderWikiImageCaptions(this.root, this.getSettings());
	}
}
