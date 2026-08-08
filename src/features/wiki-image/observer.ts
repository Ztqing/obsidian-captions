import type { WikiImageCaptionSettings } from "./caption";
import { renderWikiImageCaptions } from "./dom";
import { CAPTION_KEY } from "../shared/renderer";

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
		this.observer = this.createObserver((mutations) => {
			if (mutations.some(isRelevantWikiImageMutation)) {
				this.scheduleRender();
			}
		});
		this.observer.observe(this.root, {
			attributeFilter: ["alt", "src"],
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

	refresh(): void {
		if (!this.destroyed) {
			this.render();
		}
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

export function isRelevantWikiImageMutation(mutation: MutationRecord): boolean {
	if (mutation.type === "attributes") {
		return true;
	}
	if (isManagedCaptionNode(mutation.target)) {
		return false;
	}

	return Array.from(mutation.addedNodes).some(isExternalNode)
		|| Array.from(mutation.removedNodes).some(isExternalNode);
}

function isExternalNode(node: Node): boolean {
	return !isManagedCaptionNode(node);
}

function isManagedCaptionNode(node: Node): boolean {
	return node.nodeType === 1
		&& (node as HTMLElement).dataset[CAPTION_KEY] === "wiki";
}
