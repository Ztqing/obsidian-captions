import type { WikiImageCaptionSettings } from "./caption";
import {
	renderWikiImageCaptions,
	renderWikiImageEmbeds,
} from "./dom";
import { CAPTION_KEY } from "../shared/renderer";

type SettingsProvider = () => WikiImageCaptionSettings;
type ObserverFactory = (callback: MutationCallback) => MutationObserver;

export class WikiImageCaptionObserver {
	private observer: MutationObserver | null = null;
	private readonly dirtyEmbeds = new Set<HTMLElement>();
	private scheduled = false;
	private destroyed = false;
	private epoch = 0;

	constructor(
		private readonly root: HTMLElement,
		private readonly getSettings: SettingsProvider,
		private readonly createObserver: ObserverFactory = (
			callback,
		) => new MutationObserver(callback),
	) {}

	start(
		renderInitial = true,
		settings?: WikiImageCaptionSettings,
	): void {
		if (this.observer !== null) {
			return;
		}

		this.destroyed = false;
		const epoch = this.epoch + 1;
		this.epoch = epoch;
		this.observer = this.createObserver((mutations) => {
			this.scheduleEmbeds(epoch, collectAffectedWikiImageEmbeds(mutations));
		});
		this.observer.observe(this.root, {
			attributeFilter: ["alt", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		if (renderInitial) {
			this.renderRoot(settings);
		}
	}

	stop(): void {
		this.destroyed = true;
		this.epoch += 1;
		this.observer?.disconnect();
		this.observer = null;
		this.dirtyEmbeds.clear();
		this.scheduled = false;
	}

	refresh(settings?: WikiImageCaptionSettings): void {
		if (!this.destroyed) {
			this.dirtyEmbeds.clear();
			this.renderRoot(settings);
		}
	}

	private scheduleEmbeds(epoch: number, embeds: readonly HTMLElement[]): void {
		if (this.destroyed || epoch !== this.epoch || embeds.length === 0) {
			return;
		}
		for (const embed of embeds) {
			this.dirtyEmbeds.add(embed);
		}
		if (this.scheduled) {
			return;
		}

		this.scheduled = true;
		void Promise.resolve().then(() => {
			if (epoch !== this.epoch || this.destroyed) {
				return;
			}
			this.scheduled = false;
			if (this.dirtyEmbeds.size === 0) {
				return;
			}
			const dirtyEmbeds = Array.from(this.dirtyEmbeds)
				.filter((embed) => this.root.contains(embed));
			this.dirtyEmbeds.clear();
			renderWikiImageEmbeds(dirtyEmbeds, this.getSettings());
		});
	}

	private renderRoot(settings = this.getSettings()): void {
		renderWikiImageCaptions(this.root, settings);
	}
}

export function collectAffectedWikiImageEmbeds(
	mutations: readonly MutationRecord[],
): HTMLElement[] {
	const affected = new Set<HTMLElement>();
	for (const mutation of mutations) {
		if (mutation.type === "attributes") {
			addClosestWikiImageEmbed(mutation.target, affected);
			continue;
		}
		if (
			mutation.type !== "childList"
			|| isManagedCaptionNode(mutation.target)
		) {
			continue;
		}

		const addedNodes = Array.from(mutation.addedNodes)
			.filter(isExternalNode);
		const hasExternalRemoval = Array.from(mutation.removedNodes)
			.some(isExternalNode);
		if (addedNodes.length === 0 && !hasExternalRemoval) {
			continue;
		}

		addClosestWikiImageEmbed(mutation.target, affected);
		for (const node of addedNodes) {
			addClosestWikiImageEmbed(node, affected);
			addWikiImageEmbedsFromNode(node, affected);
		}
	}
	return Array.from(affected);
}

function addClosestWikiImageEmbed(
	node: Node,
	affected: Set<HTMLElement>,
): void {
	if (node.nodeType !== 1) {
		return;
	}
	const embed = (node as HTMLElement).closest<HTMLElement>(
		".internal-embed",
	);
	if (embed !== null) {
		affected.add(embed);
	}
}

function addWikiImageEmbedsFromNode(
	node: Node,
	affected: Set<HTMLElement>,
): void {
	if (node.nodeType !== 1) {
		return;
	}
	const element = node as HTMLElement;
	if (element.matches(".internal-embed")) {
		affected.add(element);
	}
	for (const embed of Array.from(element.querySelectorAll<HTMLElement>(
		".internal-embed",
	))) {
		affected.add(embed);
	}
}

function isExternalNode(node: Node): boolean {
	return !isManagedCaptionNode(node);
}

function isManagedCaptionNode(node: Node): boolean {
	return node.nodeType === 1
		&& (node as HTMLElement).dataset[CAPTION_KEY] === "wiki";
}
