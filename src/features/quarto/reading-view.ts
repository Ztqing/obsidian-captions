import type {
	QuartoCaptionTarget,
	QuartoCrossrefCaptionTarget,
	QuartoDocument,
} from "./parser";
import {
	applyCaptionAppearance,
	getCaptionAppearance,
	placeCaptionRelativeToTarget,
	resolveImageCaption,
} from "../../caption-settings";
import {
	createQuartoReferencePattern,
	getQuartoTargetId,
	isQuartoCrossrefTarget,
	isQuartoReferenceBoundary,
} from "./parser";
import {
	getQuartoTargetLabel,
	type QuartoSettings,
} from "./settings";

export interface QuartoReadingSection {
	root: HTMLElement;
	lineStart: number;
	lineEnd: number;
}

const FIGURE_CLASS = "captions-quarto-figure";
const FIGURE_CAPTION_CLASS = "captions-quarto-figure-caption";
const TABLE_CLASS = "captions-quarto-table";
const TABLE_CAPTION_CLASS = "captions-quarto-table-caption";
const CAPTION_LABEL_CLASS = "captions-quarto-label";
const SOURCE_MARKER_CLASS = "captions-quarto-source-marker";
const SOURCE_CAPTION_CLASS = "captions-quarto-source-caption";
const REFERENCE_CLASS = "captions-quarto-reference";
const REFERENCE_SOURCE_CLASS = "captions-quarto-reference-source";
const MANAGED_TARGET_ATTRIBUTE = "data-captions-quarto-managed-id";
const PREVIOUS_ID_ATTRIBUTE = "data-captions-quarto-previous-id";

interface TextReferenceMatch {
	from: number;
	to: number;
	source: string;
	id: string;
}

export function renderQuartoReadingSections(
	sections: QuartoReadingSection[],
	document: QuartoDocument,
	settings: QuartoSettings,
): void {
	const targetsById = createCrossrefTargetsById(document.targets);

	for (const target of document.targets) {
		const targetSection = findSectionForLine(sections, target.targetStartLine);
		const markerSection = findSectionForLine(sections, target.markerLine);
		if (targetSection === null) {
			continue;
		}

		if (target.kind === "figure") {
			renderFigure(targetSection, markerSection, document, target, settings);
		} else {
			renderTable(targetSection, markerSection, document, target, settings);
		}
	}

	for (const section of sections) {
		renderReferences(section.root, targetsById, settings);
	}
}

export function cleanupQuartoReadingView(root: HTMLElement): void {
	for (const wrapper of collectElements<HTMLElement>(root, `.${REFERENCE_CLASS}`)) {
		const source = wrapper.querySelector<HTMLElement>(`.${REFERENCE_SOURCE_CLASS}`);
		wrapper.replaceWith(wrapper.ownerDocument.createTextNode(source?.textContent ?? ""));
	}

	for (const marker of collectElements<HTMLElement>(root, `.${SOURCE_MARKER_CLASS}`)) {
		marker.replaceWith(marker.ownerDocument.createTextNode(marker.textContent ?? ""));
	}

	for (const caption of collectElements<HTMLElement>(root, `.${SOURCE_CAPTION_CLASS}`)) {
		caption.classList.remove(SOURCE_CAPTION_CLASS);
		delete caption.dataset.captionKey;
	}

	for (const caption of collectElements<HTMLElement>(
		root,
		`.${FIGURE_CAPTION_CLASS}, .${TABLE_CAPTION_CLASS}`,
	)) {
		caption.remove();
	}

	for (const target of collectElements<HTMLElement>(
		root,
		`[${MANAGED_TARGET_ATTRIBUTE}]`,
	)) {
		restoreTargetId(target);
	}

	for (const target of collectElements<HTMLElement>(
		root,
		`.${FIGURE_CLASS}, .${TABLE_CLASS}`,
	)) {
		target.classList.remove(FIGURE_CLASS, TABLE_CLASS);
	}
}

function renderFigure(
	targetSection: QuartoReadingSection,
	markerSection: QuartoReadingSection | null,
	document: QuartoDocument,
	target: QuartoCaptionTarget,
	settings: QuartoSettings,
): void {
	const markerRoot = markerSection?.root ?? targetSection.root;
	const existingMarker = findElementByKey(
		markerRoot,
		SOURCE_MARKER_CLASS,
		target.key,
	);
	const sourceNode = existingMarker === null && target.markerText !== null
		? findTextNodeContaining(markerRoot, target.markerText)
		: null;
	const marker = existingMarker
		?? (sourceNode === null
			? null
			: replaceTextWithSourceMarker(sourceNode, target.markerText ?? "", target.key));
	const markerBlock = marker?.parentElement?.closest("p") ?? marker?.parentElement;

	let image = markerBlock === null || markerBlock === undefined
		? undefined
		: findStandardImage(markerBlock, target.caption);
	if (image === undefined) {
		image = findFigureImageForTarget(targetSection, document, target);
	}
	if (image === undefined) {
		return;
	}

	const block = image.closest("p") ?? image.parentElement;
	if (block === null) {
		return;
	}

	const id = getQuartoTargetId(target);
	if (id !== null) {
		manageTargetId(block, id);
	}

	let caption = findElementByKey(block, FIGURE_CAPTION_CLASS, target.key);
	const captionText = resolveImageCaption(
		target.caption,
		[target.imageSource, image.getAttribute("src")],
		settings.showFileNameAsCaption,
	);
	if (captionText === null && !isQuartoCrossrefTarget(target)) {
		caption?.remove();
		block.classList.remove(FIGURE_CLASS);
		return;
	}

	block.classList.add(FIGURE_CLASS);
	if (caption === null) {
		caption = block.ownerDocument.createElement("span");
		caption.dataset.captionKey = target.key;
	}
	const appearance = getCaptionAppearance(settings, "figure");
	caption.className = [
		FIGURE_CAPTION_CLASS,
		...appearance.classNames,
	].join(" ");
	applyCaptionAppearance(caption, appearance);
	placeCaptionRelativeToTarget(
		block,
		image,
		caption,
		settings.figurePosition,
	);

	setCaptionContent(
		caption,
		target,
		captionText ?? "",
		settings,
	);
}

function renderTable(
	targetSection: QuartoReadingSection,
	markerSection: QuartoReadingSection | null,
	document: QuartoDocument,
	target: QuartoCaptionTarget,
	settings: QuartoSettings,
): void {
	const table = findTableForTarget(targetSection, document, target);
	if (table === null) {
		return;
	}

	const markerRoot = markerSection?.root;
	const existingCaptionBlock = markerRoot === undefined
		? null
		: findElementByKey(markerRoot, SOURCE_CAPTION_CLASS, target.key);
	const sourceNode = markerRoot === undefined
		|| existingCaptionBlock !== null
		|| target.attributeText === null
		? null
		: findTextNodeContaining(markerRoot, target.attributeText);
	const captionBlock = existingCaptionBlock
		?? sourceNode?.parentElement?.closest("p")
		?? (markerRoot === undefined || target.attributeText !== null
			? null
			: findRenderedTableCaptionBlock(markerRoot));
	const renderedCaption = captionBlock === null
		? target.caption
		: extractRenderedTableCaption(
			captionBlock.textContent ?? "",
			target.attributeText,
			target.caption,
		);

	if (captionBlock !== null) {
		captionBlock.classList.add(SOURCE_CAPTION_CLASS);
		captionBlock.dataset.captionKey = target.key;
	}

	const id = getQuartoTargetId(target);
	if (id !== null) {
		manageTargetId(table, id);
	}
	table.classList.add(TABLE_CLASS);

	let caption = findDirectTableCaption(table, target.key);
	if (caption === null) {
		caption = table.ownerDocument.createElement("caption");
		caption.dataset.captionKey = target.key;
	}
	const appearance = getCaptionAppearance(settings, "table");
	caption.className = [
		TABLE_CAPTION_CLASS,
		...appearance.classNames,
	].join(" ");
	applyCaptionAppearance(caption, appearance);

	setCaptionContent(caption, target, renderedCaption, settings);
	if (settings.tablePosition === "above") {
		table.prepend(caption);
	} else {
		table.appendChild(caption);
	}
}

function renderReferences(
	root: HTMLElement,
	targetsById: Map<string, QuartoCrossrefCaptionTarget>,
	settings: QuartoSettings,
): void {
	for (const textNode of collectTextNodes(root)) {
		if (shouldSkipTextNode(textNode)) {
			continue;
		}

		const matches = findTextReferences(textNode.data);
		if (matches.length === 0) {
			continue;
		}

		const fragment = root.ownerDocument.createDocumentFragment();
		let previousEnd = 0;
		for (const match of matches) {
			const target = targetsById.get(match.id);
			fragment.append(textNode.data.slice(previousEnd, match.from));
			fragment.append(target === undefined
				? match.source
				: createReferenceElement(
					root.ownerDocument,
					match.source,
					target,
					settings,
				));
			previousEnd = match.to;
		}
		fragment.append(textNode.data.slice(previousEnd));
		textNode.replaceWith(fragment);
	}
}

function findTextReferences(source: string): TextReferenceMatch[] {
	const references: TextReferenceMatch[] = [];
	const pattern = createQuartoReferencePattern();
	let match = pattern.exec(source);
	while (match !== null) {
		const id = match[1];
		if (
			id !== undefined
			&& isQuartoReferenceBoundary(
				source,
				match.index,
				match.index + match[0].length,
			)
		) {
			references.push({
				from: match.index,
				to: match.index + match[0].length,
				source: match[0],
				id,
			});
		}
		match = pattern.exec(source);
	}
	return references;
}

function createReferenceElement(
	document: Document,
	source: string,
	target: QuartoCrossrefCaptionTarget,
	settings: QuartoSettings,
): HTMLElement {
	const wrapper = document.createElement("span");
	wrapper.className = REFERENCE_CLASS;

	const sourceElement = document.createElement("span");
	sourceElement.className = REFERENCE_SOURCE_CLASS;
	sourceElement.textContent = source;
	wrapper.appendChild(sourceElement);

	const anchor = document.createElement("a");
	anchor.dataset.captionKind = target.kind;
	anchor.dataset.captionNumber = String(target.identity.number);
	anchor.setAttribute("href", `#${target.identity.id}`);
	anchor.textContent = `${getQuartoTargetLabel(target.kind, settings)} ${target.identity.number}`;
	wrapper.appendChild(anchor);
	return wrapper;
}

function setCaptionContent(
	caption: HTMLElement,
	target: QuartoCaptionTarget,
	captionText: string,
	settings: QuartoSettings,
): void {
	caption.replaceChildren();
	if (isQuartoCrossrefTarget(target)) {
		const label = caption.ownerDocument.createElement("span");
		label.className = CAPTION_LABEL_CLASS;
		label.dataset.captionKind = target.kind;
		label.dataset.captionNumber = String(target.identity.number);
		label.textContent = `${getQuartoTargetLabel(target.kind, settings)} ${target.identity.number}`;
		caption.appendChild(label);
		if (captionText.length > 0) {
			caption.append(": ", captionText);
		}
	} else {
		caption.textContent = captionText;
	}
}

function findFigureImageForTarget(
	section: QuartoReadingSection,
	document: QuartoDocument,
	target: QuartoCaptionTarget,
): HTMLImageElement | undefined {
	const images = collectStandardImages(section.root);
	const targets = document.targets.filter((candidate) =>
		candidate.kind === "figure"
		&& sectionContainsLine(section, candidate.targetStartLine));
	const targetIndex = targets.indexOf(target);
	if (targetIndex === -1) {
		return undefined;
	}

	const matchingImages = images.filter((image) =>
		image.getAttribute("alt")?.trim() === target.caption);
	const captionOccurrence = targets.slice(0, targetIndex + 1).filter((candidate) =>
		candidate.caption === target.caption).length - 1;
	return matchingImages[captionOccurrence] ?? images[targetIndex];
}

function findTableForTarget(
	section: QuartoReadingSection,
	document: QuartoDocument,
	target: QuartoCaptionTarget,
): HTMLTableElement | null {
	const tableBlocks = document.tableBlocks.filter((block) =>
		sectionContainsLine(section, block.startLine));
	const targetIndex = tableBlocks.findIndex((block) =>
		block.startLine === target.targetStartLine);
	return targetIndex === -1
		? null
		: collectElements<HTMLTableElement>(section.root, "table")[targetIndex] ?? null;
}

function findSectionForLine(
	sections: QuartoReadingSection[],
	line: number,
): QuartoReadingSection | null {
	let bestMatch: QuartoReadingSection | null = null;
	for (const section of sections) {
		if (
			sectionContainsLine(section, line)
			&& (bestMatch === null || section.lineStart > bestMatch.lineStart)
		) {
			bestMatch = section;
		}
	}
	return bestMatch;
}

function sectionContainsLine(section: QuartoReadingSection, line: number): boolean {
	return section.lineStart <= line && line <= section.lineEnd;
}

function collectStandardImages(root: HTMLElement): HTMLImageElement[] {
	return collectElements<HTMLImageElement>(root, "img")
		.filter((image) => image.closest(".internal-embed") === null);
}

function findStandardImage(
	root: HTMLElement,
	caption: string,
): HTMLImageElement | undefined {
	const images = collectStandardImages(root);
	return images.find((image) => image.getAttribute("alt")?.trim() === caption)
		?? images[0];
}

function findRenderedTableCaptionBlock(root: HTMLElement): HTMLElement | null {
	return collectElements<HTMLElement>(root, "p").find((paragraph) =>
		/^\s*:\s*/u.test(paragraph.textContent ?? "")) ?? null;
}

function findTextNodeContaining(root: HTMLElement, source: string): Text | null {
	return source.length === 0
		? null
		: collectTextNodes(root).find((textNode) =>
			!shouldSkipTextNode(textNode) && textNode.data.includes(source)) ?? null;
}

function collectTextNodes(root: HTMLElement): Text[] {
	const textNodes: Text[] = [];
	const walker = root.ownerDocument.createTreeWalker(root, 4);
	let current = walker.nextNode();
	while (current !== null) {
		textNodes.push(current as Text);
		current = walker.nextNode();
	}
	return textNodes;
}

function shouldSkipTextNode(textNode: Text): boolean {
	return textNode.parentElement?.closest([
		"code",
		"pre",
		"a",
		`.${SOURCE_MARKER_CLASS}`,
		`.${SOURCE_CAPTION_CLASS}`,
		`.${REFERENCE_CLASS}`,
		`.${FIGURE_CAPTION_CLASS}`,
		`.${TABLE_CAPTION_CLASS}`,
		".captions-wiki-caption",
		".captions-pandoc-figure-caption",
		".captions-pandoc-table-caption",
	].join(", ")) !== null;
}

function replaceTextWithSourceMarker(
	textNode: Text,
	source: string,
	key: string,
): HTMLElement {
	const index = textNode.data.indexOf(source);
	const fragment = textNode.ownerDocument.createDocumentFragment();
	fragment.append(textNode.data.slice(0, index));

	const marker = textNode.ownerDocument.createElement("span");
	marker.className = SOURCE_MARKER_CLASS;
	marker.dataset.captionKey = key;
	marker.textContent = source;
	fragment.appendChild(marker);
	fragment.append(textNode.data.slice(index + source.length));
	textNode.replaceWith(fragment);
	return marker;
}

function extractRenderedTableCaption(
	source: string,
	attributeText: string | null,
	fallback: string,
): string {
	const attributeIndex = attributeText === null ? -1 : source.lastIndexOf(attributeText);
	const withoutAttribute = attributeIndex === -1 ? source : source.slice(0, attributeIndex);
	const caption = withoutAttribute.replace(/^\s*:\s*/u, "").trim();
	return caption.length > 0 ? caption : fallback;
}

function findElementByKey(
	root: HTMLElement,
	className: string,
	key: string,
): HTMLElement | null {
	return collectElements<HTMLElement>(root, `.${className}`)
		.find((element) => element.dataset.captionKey === key) ?? null;
}

function findDirectTableCaption(
	table: HTMLTableElement,
	key: string,
): HTMLTableCaptionElement | null {
	for (const child of Array.from(table.children)) {
		if (
			child.tagName === "CAPTION"
			&& child.classList.contains(TABLE_CAPTION_CLASS)
			&& (child as HTMLElement).dataset.captionKey === key
		) {
			return child as HTMLTableCaptionElement;
		}
	}
	return null;
}

function createCrossrefTargetsById(
	targets: QuartoCaptionTarget[],
): Map<string, QuartoCrossrefCaptionTarget> {
	const targetsById = new Map<string, QuartoCrossrefCaptionTarget>();
	for (const target of targets) {
		if (isQuartoCrossrefTarget(target) && !targetsById.has(target.identity.id)) {
			targetsById.set(target.identity.id, target);
		}
	}
	return targetsById;
}

function manageTargetId(target: HTMLElement, id: string): void {
	if (!target.hasAttribute(MANAGED_TARGET_ATTRIBUTE)) {
		target.setAttribute(MANAGED_TARGET_ATTRIBUTE, "true");
		target.setAttribute(PREVIOUS_ID_ATTRIBUTE, target.getAttribute("id") ?? "");
	}
	target.id = id;
}

function restoreTargetId(target: HTMLElement): void {
	const previousId = target.getAttribute(PREVIOUS_ID_ATTRIBUTE) ?? "";
	if (previousId.length > 0) {
		target.id = previousId;
	} else {
		target.removeAttribute("id");
	}
	target.removeAttribute(MANAGED_TARGET_ATTRIBUTE);
	target.removeAttribute(PREVIOUS_ID_ATTRIBUTE);
}

function collectElements<ElementType extends Element>(
	root: HTMLElement,
	selector: string,
): ElementType[] {
	const elements = Array.from(root.querySelectorAll<ElementType>(selector));
	if (root.matches(selector)) {
		elements.unshift(root as unknown as ElementType);
	}
	return elements;
}
