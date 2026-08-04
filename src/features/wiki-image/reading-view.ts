import { MarkdownRenderChild } from "obsidian";

import type { WikiImageCaptionReadingCoordinator } from "./reading-coordinator";

export class WikiImageCaptionRenderChild extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private readonly coordinator: WikiImageCaptionReadingCoordinator,
	) {
		super(containerEl);
	}

	onload(): void {
		this.coordinator.register(this.containerEl);
	}

	onunload(): void {
		this.coordinator.unregister(this.containerEl);
	}
}
