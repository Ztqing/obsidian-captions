import {
	type MarkdownSectionInformation,
	MarkdownRenderChild,
} from "obsidian";

import type { PandocCrossrefDocument } from "./parser";
import {
	cleanupPandocCrossrefReadingView,
	renderPandocCrossrefReadingSections,
	type PandocCrossrefReadingSection,
} from "./reading-view";
import type { PandocCrossrefSettings } from "./settings";

type SettingsProvider = () => PandocCrossrefSettings;

interface DocumentRenderState {
	document: PandocCrossrefDocument;
	sections: Map<HTMLElement, PandocCrossrefReadingSection>;
	scheduled: boolean;
}

export class PandocCrossrefReadingCoordinator {
	private readonly documents = new Map<string, DocumentRenderState>();

	constructor(private readonly getSettings: SettingsProvider) {}

	registerSection(
		docId: string,
		root: HTMLElement,
		sectionInfo: MarkdownSectionInformation,
		document: PandocCrossrefDocument,
	): void {
		let state = this.documents.get(docId);
		if (state === undefined) {
			state = {
				document,
				sections: new Map(),
				scheduled: false,
			};
			this.documents.set(docId, state);
		} else if (state.document !== document) {
			for (const section of state.sections.values()) {
				cleanupPandocCrossrefReadingView(section.root);
			}
			state.document = document;
		}

		state.sections.set(root, {
			root,
			lineStart: sectionInfo.lineStart,
			lineEnd: sectionInfo.lineEnd,
		});
		this.scheduleRender(state);
	}

	unregisterSection(docId: string, root: HTMLElement): void {
		const state = this.documents.get(docId);
		if (state === undefined) {
			return;
		}

		cleanupPandocCrossrefReadingView(root);
		state.sections.delete(root);
		if (state.sections.size === 0) {
			this.documents.delete(docId);
			return;
		}
		this.scheduleRender(state);
	}

	refresh(): void {
		for (const state of this.documents.values()) {
			this.scheduleRender(state);
		}
	}

	clear(): void {
		for (const state of this.documents.values()) {
			for (const section of state.sections.values()) {
				cleanupPandocCrossrefReadingView(section.root);
			}
			state.sections.clear();
		}
		this.documents.clear();
	}

	private scheduleRender(state: DocumentRenderState): void {
		if (state.scheduled) {
			return;
		}

		state.scheduled = true;
		void Promise.resolve().then(() => {
			state.scheduled = false;
			renderPandocCrossrefReadingSections(
				Array.from(state.sections.values()),
				state.document,
				this.getSettings(),
			);
		});
	}
}

export class PandocCrossrefSectionRenderChild extends MarkdownRenderChild {
	private active = false;
	private registered = false;

	constructor(
		containerEl: HTMLElement,
		private readonly docId: string,
		private readonly sectionInfo: MarkdownSectionInformation,
		private readonly document: Promise<PandocCrossrefDocument>,
		private readonly coordinator: PandocCrossrefReadingCoordinator,
	) {
		super(containerEl);
	}

	onload(): void {
		this.active = true;
		void this.document.then((document) => {
			if (!this.active) {
				return;
			}

			this.coordinator.registerSection(
				this.docId,
				this.containerEl,
				this.sectionInfo,
				document,
			);
			this.registered = true;
		}, () => undefined);
	}

	onunload(): void {
		this.active = false;
		if (this.registered) {
			this.coordinator.unregisterSection(this.docId, this.containerEl);
			this.registered = false;
		}
	}
}
