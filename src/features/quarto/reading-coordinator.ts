import type { QuartoDocument } from "./parser";
import {
	cleanupQuartoReadingView,
	renderQuartoReadingSections,
	type QuartoReadingSection,
} from "./reading-view";
import type { QuartoSettings } from "./settings";

type SettingsProvider = () => QuartoSettings;
type DocumentLoader = () => Promise<QuartoDocument>;

export interface QuartoReadingSectionInformation {
	lineStart: number;
	lineEnd: number;
}

interface SectionRegistration {
	docId: string;
	root: HTMLElement;
	sectionInfo: QuartoReadingSectionInformation;
	loadDocument: DocumentLoader;
	generation: number;
}

interface DocumentRenderState {
	document: QuartoDocument;
	sections: Map<HTMLElement, QuartoReadingSection>;
	scheduled: boolean;
}

export class QuartoReadingCoordinator {
	private readonly registrations = new Map<HTMLElement, SectionRegistration>();
	private readonly documents = new Map<string, DocumentRenderState>();
	private enabled = false;

	constructor(private readonly getSettings: SettingsProvider) {}

	registerSection(
		docId: string,
		root: HTMLElement,
		sectionInfo: QuartoReadingSectionInformation,
		loadDocument: DocumentLoader,
	): void {
		const previous = this.registrations.get(root);
		const registration: SectionRegistration = {
			docId,
			root,
			sectionInfo,
			loadDocument,
			generation: (previous?.generation ?? 0) + 1,
		};
		if (previous !== undefined) {
			this.removeRenderedSection(previous);
		}
		this.registrations.set(root, registration);

		if (this.enabled) {
			this.activate(registration);
		} else {
			cleanupQuartoReadingView(root);
		}
	}

	unregisterSection(root: HTMLElement): void {
		const registration = this.registrations.get(root);
		if (registration === undefined) {
			return;
		}

		registration.generation += 1;
		this.registrations.delete(root);
		this.removeRenderedSection(registration);
		cleanupQuartoReadingView(root);
	}

	enable(): void {
		if (this.enabled) {
			this.refresh();
			return;
		}

		this.enabled = true;
		for (const registration of this.registrations.values()) {
			this.activate(registration);
		}
	}

	refresh(): void {
		if (!this.enabled) {
			return;
		}
		for (const state of this.documents.values()) {
			this.scheduleRender(state);
		}
	}

	disable(): void {
		this.enabled = false;
		for (const registration of this.registrations.values()) {
			registration.generation += 1;
			cleanupQuartoReadingView(registration.root);
		}
		this.documents.clear();
	}

	clear(): void {
		this.disable();
		this.registrations.clear();
	}

	private activate(registration: SectionRegistration): void {
		const generation = registration.generation;
		void registration.loadDocument().then((document) => {
			if (
				!this.enabled
				|| this.registrations.get(registration.root) !== registration
				|| registration.generation !== generation
			) {
				return;
			}

			let state = this.documents.get(registration.docId);
			if (state === undefined) {
				state = {
					document,
					sections: new Map(),
					scheduled: false,
				};
				this.documents.set(registration.docId, state);
			} else if (state.document !== document) {
				for (const section of state.sections.values()) {
					cleanupQuartoReadingView(section.root);
				}
				state.document = document;
			}

			state.sections.set(registration.root, {
				root: registration.root,
				lineStart: registration.sectionInfo.lineStart,
				lineEnd: registration.sectionInfo.lineEnd,
			});
			this.scheduleRender(state);
		}, () => undefined);
	}

	private removeRenderedSection(registration: SectionRegistration): void {
		const state = this.documents.get(registration.docId);
		if (state === undefined) {
			return;
		}
		state.sections.delete(registration.root);
		if (state.sections.size === 0) {
			this.documents.delete(registration.docId);
			return;
		}
		this.scheduleRender(state);
	}

	private scheduleRender(state: DocumentRenderState): void {
		if (state.scheduled || !this.enabled) {
			return;
		}
		state.scheduled = true;
		void Promise.resolve().then(() => {
			state.scheduled = false;
			if (!this.enabled || !this.hasDocumentState(state)) {
				return;
			}
			renderQuartoReadingSections(
				Array.from(state.sections.values()),
				state.document,
				this.getSettings(),
			);
		});
	}

	private hasDocumentState(target: DocumentRenderState): boolean {
		for (const state of this.documents.values()) {
			if (state === target) {
				return true;
			}
		}
		return false;
	}
}
