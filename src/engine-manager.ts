import type { Extension } from "@codemirror/state";
import type { MarkdownPostProcessorContext } from "obsidian";

export const CAPTION_ENGINE_METADATA = [
	{
		id: "wikiImage",
		name: "Wiki image captions",
		description: "Captions for Obsidian Wiki image embeds.",
	},
	{
		id: "pandocCrossref",
		name: "Pandoc and pandoc-crossref",
		description: "Captions, anchors, numbering, and cross-references for Pandoc syntax.",
	},
] as const;

export type CaptionEngineId = typeof CAPTION_ENGINE_METADATA[number]["id"];

export interface CaptionsEngineSettings {
	wikiImage: boolean;
	pandocCrossref: boolean;
}

export interface CaptionEngine {
	readonly id: CaptionEngineId;
	createEditorExtension(): Extension;
	attachReadingSection(
		root: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void;
	refresh(): void;
	disable(): void;
	cleanup(): void;
}

type EnabledProvider = (id: CaptionEngineId) => boolean;

export class CaptionEngineManager {
	constructor(
		private readonly engines: readonly CaptionEngine[],
		private readonly isEnabled: EnabledProvider,
	) {}

	createEditorExtensions(): Extension[] {
		return this.engines
			.filter((engine) => this.isEnabled(engine.id))
			.map((engine) => engine.createEditorExtension());
	}

	attachReadingSection(
		root: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		for (const engine of this.engines) {
			engine.attachReadingSection(root, context);
		}
	}

	refresh(): void {
		for (const engine of this.engines) {
			if (this.isEnabled(engine.id)) {
				engine.refresh();
			} else {
				engine.disable();
			}
		}
	}

	cleanup(): void {
		for (const engine of this.engines) {
			engine.cleanup();
		}
	}
}
