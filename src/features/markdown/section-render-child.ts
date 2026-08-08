import {
	type MarkdownSectionInformation,
	MarkdownRenderChild,
} from "obsidian";

import type { CaptionDocument } from "./parser";
import type { CaptionReadingCoordinator } from "./reading-coordinator";

export class CaptionSectionRenderChild extends MarkdownRenderChild {
	private registered = false;

	constructor(
		containerEl: HTMLElement,
		private readonly docId: string,
		private readonly sectionInfo: MarkdownSectionInformation,
		private readonly loadDocument: () => Promise<CaptionDocument>,
		private readonly coordinator: CaptionReadingCoordinator,
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
