import {
	type EditorState,
	type Extension,
	type StateField,
} from "@codemirror/state";
import {
	type EditorView,
	type PluginValue,
	type ViewUpdate,
	ViewPlugin,
} from "@codemirror/view";

import type { WikiImageCaptionSettings } from "./caption";
import {
	cleanupWikiImageCaptions,
	cleanupWikiImageEmbedCaption,
	renderWikiImageCaptions,
	renderWikiImageEmbeds,
} from "./dom";
import { isCaptionRefreshTransaction } from "../shared/editor-refresh";
import { collectAffectedWikiImageEmbeds } from "./observer";

type SettingsProvider = () => WikiImageCaptionSettings;

export function shouldRenderWikiImageCaptions(
	state: EditorState,
	livePreviewField: StateField<boolean>,
): boolean {
	return state.field(livePreviewField, false) === true;
}

export function shouldDeferWikiImageCaptionRender(composing: boolean): boolean {
	return composing;
}

export function getWikiImageCaptionSourcePosition(
	source: string,
	embedFrom: number,
	embedTo = embedFrom,
): number | null {
	const lineStart = source.lastIndexOf("\n", embedFrom - 1) + 1;
	const lineEndIndex = source.indexOf("\n", embedFrom);
	const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
	const line = source.slice(lineStart, lineEnd);
	const embedPattern = /!\[\[([^\]\r\n]*)\]\]/gu;
	for (const match of line.matchAll(embedPattern)) {
		const embedStart = lineStart + match.index;
		const embedText = match[0];
		const embedEnd = embedStart + embedText.length;
		const overlaps = embedFrom === embedTo
			? embedFrom >= embedStart && embedFrom < embedEnd
			: embedFrom < embedEnd && embedTo > embedStart;
		if (!overlaps) {
			continue;
		}

		const aliasSeparator = embedText.indexOf("|", 3);
		if (aliasSeparator === -1) {
			return null;
		}
		return embedStart + aliasSeparator + 1;
	}
	return null;
}

export function selectionOverlapsWikiImageEmbed(
	selection: { from: number; to: number },
	embedFrom: number,
	embedTo: number,
): boolean {
	if (selection.from === selection.to) {
		return selection.from > embedFrom && selection.from < embedTo;
	}
	return selection.from < embedTo && selection.to > embedFrom;
}

export function createWikiImageCaptionEditorExtension(
	getSettings: SettingsProvider,
	livePreviewField: StateField<boolean>,
): Extension {
	return ViewPlugin.define(
		(view) => new WikiImageCaptionViewPlugin(view, getSettings, livePreviewField),
	);
}

class WikiImageCaptionViewPlugin implements PluginValue {
	private readonly observer: MutationObserver;
	private readonly dirtyEmbeds = new Set<HTMLElement>();
	private fullRenderPending = false;
	private scheduled = false;
	private destroyed = false;
	private composing = false;
	private readonly handleCompositionStart = (): void => {
		this.composing = true;
	};
	private readonly handleCompositionEnd = (): void => {
		this.composing = false;
		this.scheduleFullRender();
	};
	private readonly handleCaptionMouseDown = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		const caption = target.closest<HTMLElement>(
			'[data-captions-key="wiki"]',
		);
		const embed = caption?.closest<HTMLElement>(".internal-embed.image-embed");
		if (embed === null || embed === undefined) {
			return;
		}
		const embedFrom = this.view.posAtDOM(embed, 0);
		const embedTo = this.view.posAtDOM(embed, embed.childNodes.length);
		const sourcePosition = getWikiImageCaptionSourcePosition(
			this.view.state.doc.toString(),
			embedFrom,
			embedTo,
		);
		if (sourcePosition === null) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		this.view.focus();
		this.view.dispatch({
			selection: { anchor: sourcePosition },
			scrollIntoView: true,
		});
	};

	constructor(
		private readonly view: EditorView,
		private readonly getSettings: SettingsProvider,
		private readonly livePreviewField: StateField<boolean>,
	) {
		this.observer = new MutationObserver((mutations) => {
			this.scheduleEmbeds(collectAffectedWikiImageEmbeds(mutations));
		});
		this.observer.observe(view.dom, {
			attributeFilter: ["alt", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		view.dom.addEventListener("compositionstart", this.handleCompositionStart);
		view.dom.addEventListener("compositionend", this.handleCompositionEnd);
		view.dom.addEventListener("mousedown", this.handleCaptionMouseDown, true);
		this.render();
	}

	update(update: ViewUpdate): void {
		if (
			update.docChanged
			|| update.selectionSet
			|| update.viewportChanged
			|| update.transactions.some((transaction) => (
				isCaptionRefreshTransaction(transaction)
				|| transaction.reconfigured
				|| transaction.startState.field(this.livePreviewField, false)
					!== transaction.state.field(this.livePreviewField, false)
				))
		) {
			this.scheduleFullRender();
		}
	}

	destroy(): void {
		this.destroyed = true;
		this.observer.disconnect();
		this.view.dom.removeEventListener("compositionstart", this.handleCompositionStart);
		this.view.dom.removeEventListener("compositionend", this.handleCompositionEnd);
		this.view.dom.removeEventListener("mousedown", this.handleCaptionMouseDown, true);
		this.dirtyEmbeds.clear();
		cleanupWikiImageCaptions(this.view.dom);
	}

	private scheduleEmbeds(embeds: readonly HTMLElement[]): void {
		if (
			this.destroyed
			|| shouldDeferWikiImageCaptionRender(this.composing || this.view.composing)
			|| embeds.length === 0
		) {
			return;
		}
		for (const embed of embeds) {
			this.dirtyEmbeds.add(embed);
		}
		this.scheduleRender();
	}

	private scheduleFullRender(): void {
		if (this.destroyed) {
			return;
		}
		this.fullRenderPending = true;
		this.dirtyEmbeds.clear();
		this.scheduleRender();
	}

	private scheduleRender(): void {
		if (this.scheduled) {
			return;
		}

		this.scheduled = true;
		void Promise.resolve().then(() => {
			this.scheduled = false;
			if (this.destroyed) {
				return;
			}
			if (this.composing || this.view.composing) {
				this.fullRenderPending = false;
				this.dirtyEmbeds.clear();
				return;
			}
			if (this.fullRenderPending) {
				this.fullRenderPending = false;
				this.dirtyEmbeds.clear();
				this.render();
				return;
			}
			if (this.dirtyEmbeds.size > 0) {
				const dirtyEmbeds = Array.from(this.dirtyEmbeds);
				this.dirtyEmbeds.clear();
				this.renderEmbeds(dirtyEmbeds);
			}
		});
	}

	private render(): void {
		if (!shouldRenderWikiImageCaptions(this.view.state, this.livePreviewField)) {
			cleanupWikiImageCaptions(this.view.dom);
			return;
		}
		renderWikiImageCaptions(
			this.view.dom,
			this.getSettings(),
			(embed) => this.isEditingEmbed(embed),
		);
	}

	private renderEmbeds(embeds: readonly HTMLElement[]): void {
		if (!shouldRenderWikiImageCaptions(this.view.state, this.livePreviewField)) {
			cleanupWikiImageCaptions(this.view.dom);
			return;
		}
		for (const embed of embeds) {
			if (this.isEditingEmbed(embed)) {
				cleanupWikiImageEmbedCaption(embed);
			} else {
				renderWikiImageEmbeds([embed], this.getSettings());
			}
		}
	}

	private isEditingEmbed(embed: HTMLElement): boolean {
		const selection = this.view.state.selection.main;
		const from = this.view.posAtDOM(embed);
		const to = this.view.posAtDOM(embed, embed.childNodes.length);
		return selectionOverlapsWikiImageEmbed(selection, from, to);
	}
}
