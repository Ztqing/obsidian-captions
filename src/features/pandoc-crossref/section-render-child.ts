import {
	type MarkdownSectionInformation,
	MarkdownRenderChild,
} from "obsidian";

import type { PandocCrossrefDocument } from "./parser";
import type { PandocCrossrefReadingCoordinator } from "./reading-coordinator";

export class PandocCrossrefSectionRenderChild extends MarkdownRenderChild {
	private registered = false;

	constructor(
		containerEl: HTMLElement,
		private readonly docId: string,
		private readonly sectionInfo: MarkdownSectionInformation,
		private readonly loadDocument: () => Promise<PandocCrossrefDocument>,
		private readonly coordinator: PandocCrossrefReadingCoordinator,
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
