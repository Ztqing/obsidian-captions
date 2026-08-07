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
	{
		id: "quarto",
		name: "Quarto",
		description: "Captions, numbering, and cross-references for Quarto syntax.",
	},
] as const;

export type CaptionEngineId = typeof CAPTION_ENGINE_METADATA[number]["id"];
export type StandardMarkdownEngine = "none" | Exclude<CaptionEngineId, "wikiImage">;

export interface CaptionsEngineSettings {
	wikiImage: boolean;
	standardMarkdown: StandardMarkdownEngine;
	// Kept as a compatibility mirror for settings written by version 0.0.3.
	pandocCrossref: boolean;
}

export const STANDARD_MARKDOWN_ENGINE_OPTIONS: ReadonlyArray<{
	id: StandardMarkdownEngine;
	name: string;
}> = [
	{ id: "none", name: "None" },
	{ id: "pandocCrossref", name: "Pandoc and pandoc-crossref" },
	{ id: "quarto", name: "Quarto" },
];

export function isCaptionEngineEnabled(
	settings: CaptionsEngineSettings,
	id: CaptionEngineId,
): boolean {
	return id === "wikiImage"
		? settings.wikiImage
		: settings.standardMarkdown === id;
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
