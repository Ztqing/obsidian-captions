import type { CaptionSettings } from "../../caption-settings";
import type { CaptionDocument } from "./parser";
import {
	cleanupCaptionReadingView,
	renderCaptionReadingSections,
	type CaptionReadingSection,
} from "./reading-view";

type SettingsProvider = () => CaptionSettings;
type DocumentLoader = () => Promise<CaptionDocument>;

export interface CaptionReadingSectionInformation {
	lineStart: number;
	lineEnd: number;
}

interface SectionRegistration {
	docId: string;
	root: HTMLElement;
	sectionInfo: CaptionReadingSectionInformation;
	loadDocument: DocumentLoader;
	generation: number;
	loading: boolean;
}

interface DocumentRenderState {
	docId: string;
	document: CaptionDocument;
	documentLoadGeneration: number;
	sections: Map<HTMLElement, CaptionReadingSection>;
	scheduled: boolean;
}

/** Coalesces section lifecycle events so a note is parsed and rendered once. */
export class CaptionReadingCoordinator {
	private readonly registrations = new Map<HTMLElement, SectionRegistration>();
	private readonly documents = new Map<string, DocumentRenderState>();
	private readonly documentLoadGenerations = new Map<string, number>();
	private enabled = false;

	constructor(private readonly getSettings: SettingsProvider) {}

	registerSection(
		docId: string,
		root: HTMLElement,
		sectionInfo: CaptionReadingSectionInformation,
		loadDocument: DocumentLoader,
	): void {
		const previous = this.registrations.get(root);
		const registration: SectionRegistration = {
			docId,
			root,
			sectionInfo,
			loadDocument,
			generation: (previous?.generation ?? 0) + 1,
			loading: false,
		};
		if (previous !== undefined) {
			previous.generation += 1;
			this.removeRenderedSection(previous);
			cleanupCaptionReadingView(previous.root);
		}
		this.registrations.set(root, registration);

		if (this.enabled) {
			this.activate(registration);
		} else {
			cleanupCaptionReadingView(root);
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
		cleanupCaptionReadingView(root);
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
		for (const registration of this.registrations.values()) {
			if (!registration.loading && !this.hasRenderedSection(registration)) {
				this.activate(registration);
			}
		}
		for (const state of this.documents.values()) {
			this.scheduleRender(state);
		}
	}

	disable(): void {
		this.enabled = false;
		for (const registration of this.registrations.values()) {
			registration.generation += 1;
			registration.loading = false;
			cleanupCaptionReadingView(registration.root);
		}
		this.documents.clear();
		this.documentLoadGenerations.clear();
	}

	clear(): void {
		this.disable();
		this.registrations.clear();
	}

	private activate(registration: SectionRegistration): void {
		if (registration.loading) {
			return;
		}
		registration.loading = true;
		const generation = registration.generation;
		const documentLoadGeneration = this.nextDocumentLoadGeneration(registration.docId);
		let loading: Promise<CaptionDocument>;
		try {
			loading = registration.loadDocument();
		} catch (error: unknown) {
			this.handleLoadFailure(
				registration,
				generation,
				documentLoadGeneration,
				error,
			);
			return;
		}
		void loading.then((document) => {
			if (registration.generation === generation) {
				registration.loading = false;
			}
			if (
				!this.enabled
				|| this.registrations.get(registration.root) !== registration
				|| registration.generation !== generation
			) {
				return;
			}

			const existingState = this.documents.get(registration.docId);
			if (
				existingState !== undefined
				&& existingState.document !== document
				&& existingState.documentLoadGeneration > documentLoadGeneration
			) {
				return;
			}
			const state: DocumentRenderState = existingState ?? {
				docId: registration.docId,
				document,
				documentLoadGeneration,
				sections: new Map(),
				scheduled: false,
			};
			if (existingState === undefined) {
				this.documents.set(registration.docId, state);
			} else if (state.document !== document) {
				for (const section of state.sections.values()) {
					cleanupCaptionReadingView(section.root);
				}
				state.document = document;
				state.documentLoadGeneration = documentLoadGeneration;
			}

			state.sections.set(registration.root, {
				root: registration.root,
				lineStart: registration.sectionInfo.lineStart,
				lineEnd: registration.sectionInfo.lineEnd,
			});
			this.scheduleRender(state);
		}, (error: unknown) => {
			this.handleLoadFailure(
				registration,
				generation,
				documentLoadGeneration,
				error,
			);
		});
	}

	private handleLoadFailure(
		registration: SectionRegistration,
		generation: number,
		documentLoadGeneration: number,
		error: unknown,
	): void {
		if (registration.generation === generation) {
			registration.loading = false;
		}
		if (
			!this.enabled
			|| this.registrations.get(registration.root) !== registration
			|| registration.generation !== generation
			|| this.documentLoadGenerations.get(registration.docId) !== documentLoadGeneration
		) {
			return;
		}
		this.removeRenderedSection(registration);
		cleanupCaptionReadingView(registration.root);
		console.error("Failed to load Markdown caption document.", error);
	}

	private nextDocumentLoadGeneration(docId: string): number {
		const generation = (this.documentLoadGenerations.get(docId) ?? 0) + 1;
		this.documentLoadGenerations.set(docId, generation);
		return generation;
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
		queueMicrotask(() => {
			state.scheduled = false;
			if (!this.enabled || !this.hasDocumentState(state)) {
				return;
			}
			renderCaptionReadingSections(
				Array.from(state.sections.values()),
				state.document,
				this.getSettings(),
			);
		});
	}

	private hasDocumentState(target: DocumentRenderState): boolean {
		return this.documents.get(target.docId) === target;
	}

	private hasRenderedSection(registration: SectionRegistration): boolean {
		return this.documents.get(registration.docId)?.sections.has(registration.root) ?? false;
	}
}
