import {
	type MarkdownSectionInformation,
	MarkdownRenderChild,
} from "obsidian";

import type { QuartoDocument } from "./parser";
import type { QuartoReadingCoordinator } from "./reading-coordinator";

export class QuartoSectionRenderChild extends MarkdownRenderChild {
	private registered = false;

	constructor(
		containerEl: HTMLElement,
		private readonly docId: string,
		private readonly sectionInfo: MarkdownSectionInformation,
		private readonly loadDocument: () => Promise<QuartoDocument>,
		private readonly coordinator: QuartoReadingCoordinator,
	) {
		super(containerEl);
	}

	onload(): void {
		this.coordinator.registerSection(
			this.docId,
			this.containerEl,
			this.sectionInfo,
			this.loadDocument,
		);
		this.registered = true;
	}

	onunload(): void {
		if (this.registered) {
			this.coordinator.unregisterSection(this.containerEl);
			this.registered = false;
		}
	}
}
