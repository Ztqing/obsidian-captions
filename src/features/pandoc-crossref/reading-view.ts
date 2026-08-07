import type {
	PandocCaptionTarget,
	PandocCrossrefCaptionTarget,
	PandocCrossrefDocument,
} from "./parser";
import {
	applyCaptionAppearance,
	getCaptionAppearance,
	placeCaptionRelativeToTarget,
	resolveImageCaption,
} from "../../caption-settings";
import {
	getPandocTargetId,
	isPandocCrossrefTarget,
} from "./parser";
import {
	getPandocTargetLabel,
	type PandocCrossrefSettings,
} from "./settings";

export interface PandocCrossrefReadingSection {
	root: HTMLElement;
	lineStart: number;
	lineEnd: number;
}

const FIGURE_CLASS = "captions-pandoc-figure";
const FIGURE_CAPTION_CLASS = "captions-pandoc-figure-caption";
const TABLE_CLASS = "captions-pandoc-table";
const TABLE_CAPTION_CLASS = "captions-pandoc-table-caption";
const CAPTION_LABEL_CLASS = "captions-pandoc-label";
const SOURCE_MARKER_CLASS = "captions-pandoc-source-marker";
const SOURCE_CAPTION_CLASS = "captions-pandoc-source-caption";
const REFERENCE_CLASS = "captions-pandoc-reference";
const REFERENCE_SOURCE_CLASS = "captions-pandoc-reference-source";
const MANAGED_TARGET_ATTRIBUTE = "data-captions-pandoc-managed-id";
const PREVIOUS_ID_ATTRIBUTE = "data-captions-pandoc-previous-id";
const REFERENCE_PATTERN = /\[@((?:fig|tbl):[A-Za-z0-9][A-Za-z0-9_.:-]*)\]/gu;

export function renderPandocCrossrefReadingSections(
	sections: PandocCrossrefReadingSection[],
	document: PandocCrossrefDocument,
	settings: PandocCrossrefSettings,
): void {
	const targetsById = createCrossrefTargetsById(document.targets);

	for (const target of document.targets) {
		const targetSection = findSectionForLine(sections, target.targetStartLine);
		const markerSection = findSectionForLine(sections, target.markerLine);
		if (targetSection === null) {
			continue;
		}

		if (target.kind === "figure") {
			renderFigure(
				targetSection,
				markerSection,
				document,
				target,
				settings,
			);
		} else {
			renderTable(
				targetSection,
				markerSection,
				document,
				target,
				settings,
			);
		}
	}

	for (const section of sections) {
		renderReferences(section.root, targetsById, settings);
	}
}

export function refreshPandocCrossrefLabels(
	root: HTMLElement,
	settings: PandocCrossrefSettings,
): void {
	const labels = collectElements<HTMLElement>(root, `.${CAPTION_LABEL_CLASS}`);
	for (const label of labels) {
		const kind = label.dataset.captionKind;
		const number = label.dataset.captionNumber;
		if ((kind === "figure" || kind === "table") && number !== undefined) {
			label.textContent = `${getPandocTargetLabel(kind, settings)} ${number}`;
		}
	}

	const references = collectElements<HTMLAnchorElement>(
		root,
		`.${REFERENCE_CLASS} > a[data-caption-kind][data-caption-number]`,
	);
	for (const reference of references) {
		const kind = reference.dataset.captionKind;
		const number = reference.dataset.captionNumber;
		if ((kind === "figure" || kind === "table") && number !== undefined) {
			reference.textContent = `${getPandocTargetLabel(kind, settings)} ${number}`;
		}
	}
}

export function cleanupPandocCrossrefReadingView(root: HTMLElement): void {
	const referenceWrappers = collectElements<HTMLElement>(root, `.${REFERENCE_CLASS}`);
	for (const wrapper of referenceWrappers) {
		const source = wrapper.querySelector<HTMLElement>(`.${REFERENCE_SOURCE_CLASS}`);
		wrapper.replaceWith(wrapper.ownerDocument.createTextNode(source?.textContent ?? ""));
	}

	const sourceMarkers = collectElements<HTMLElement>(root, `.${SOURCE_MARKER_CLASS}`);
	for (const marker of sourceMarkers) {
		marker.replaceWith(marker.ownerDocument.createTextNode(marker.textContent ?? ""));
	}

	const sourceCaptions = collectElements<HTMLElement>(root, `.${SOURCE_CAPTION_CLASS}`);
	for (const caption of sourceCaptions) {
		caption.classList.remove(SOURCE_CAPTION_CLASS);
		delete caption.dataset.captionKey;
		delete caption.dataset.captionId;
	}

	const captions = collectElements<HTMLElement>(
		root,
		`.${FIGURE_CAPTION_CLASS}, .${TABLE_CAPTION_CLASS}`,
	);
	for (const caption of captions) {
		caption.remove();
	}

	const managedTargets = collectElements<HTMLElement>(
		root,
		`[${MANAGED_TARGET_ATTRIBUTE}]`,
	);
	for (const target of managedTargets) {
		restoreTargetId(target);
	}

	const targetBlocks = collectElements<HTMLElement>(
		root,
		`.${FIGURE_CLASS}, .${TABLE_CLASS}`,
	);
	for (const target of targetBlocks) {
		target.classList.remove(FIGURE_CLASS, TABLE_CLASS);
	}
}

function renderFigure(
	targetSection: PandocCrossrefReadingSection,
	markerSection: PandocCrossrefReadingSection | null,
	document: PandocCrossrefDocument,
	target: PandocCaptionTarget,
	settings: PandocCrossrefSettings,
): void {
	const markerRoot = markerSection?.root ?? targetSection.root;
	const existingMarker = findSourceElementByKey(
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

	const id = getPandocTargetId(target);
	if (id !== null) {
		manageTargetId(block, id);
	}

	let caption = findCaptionByKey(block, FIGURE_CAPTION_CLASS, target.key);
	const captionText = resolveImageCaption(
		target.caption,
		[target.imageSource, image.getAttribute("src")],
		settings.showFileNameAsCaption,
	);
	if (captionText === null && !isPandocCrossrefTarget(target)) {
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
	targetSection: PandocCrossrefReadingSection,
	markerSection: PandocCrossrefReadingSection | null,
	document: PandocCrossrefDocument,
	target: PandocCaptionTarget,
	settings: PandocCrossrefSettings,
): void {
	const table = findTableForTarget(targetSection, document, target);
	if (table === null) {
		return;
	}

	const markerRoot = markerSection?.root;
	const existingCaptionBlock = markerRoot === undefined
		? null
		: findSourceElementByKey(markerRoot, SOURCE_CAPTION_CLASS, target.key);
	const sourceNode = markerRoot === undefined
		|| existingCaptionBlock !== null
		|| target.attributeText === null
		? null
		: findTextNodeContaining(markerRoot, target.attributeText);
	const captionBlock = existingCaptionBlock
		?? sourceNode?.parentElement?.closest("p")
		?? (markerRoot === undefined || target.attributeText !== null
			? null
			: findRenderedTableCaptionBlock(markerRoot))
		?? null;
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

	const id = getPandocTargetId(target);
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

function findFigureImageForTarget(
	section: PandocCrossrefReadingSection,
	document: PandocCrossrefDocument,
	target: PandocCaptionTarget,
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
	section: PandocCrossrefReadingSection,
	document: PandocCrossrefDocument,
	target: PandocCaptionTarget,
): HTMLTableElement | null {
	const targets = document.targets.filter((candidate) =>
		candidate.kind === "table"
		&& candidate.targetStartLine === target.targetStartLine);
	if (targets.length === 0) {
		return null;
	}

	const tableBlocks = document.tableBlocks.filter((block) =>
		sectionContainsLine(section, block.startLine));
	const targetIndex = tableBlocks.findIndex((block) =>
		block.startLine === target.targetStartLine);
	if (targetIndex === -1) {
		return null;
	}

	return collectTables(section.root)[targetIndex] ?? null;
}

function renderReferences(
	root: HTMLElement,
	targetsById: Map<string, PandocCrossrefCaptionTarget>,
	settings: PandocCrossrefSettings,
): void {
	for (const textNode of collectTextNodes(root)) {
		if (shouldSkipTextNode(textNode)) {
			continue;
		}

		const source = textNode.data;
		const pattern = new RegExp(REFERENCE_PATTERN.source, "gu");
		let match = pattern.exec(source);
		if (match === null) {
			continue;
		}

		const fragment = root.ownerDocument.createDocumentFragment();
		let previousEnd = 0;
		while (match !== null) {
			const id = match[1];
			const target = id === undefined ? undefined : targetsById.get(id);
			fragment.append(source.slice(previousEnd, match.index));

			if (target === undefined) {
				fragment.append(match[0]);
			} else {
				fragment.append(createReferenceElement(
					root.ownerDocument,
					match[0],
					target,
					settings,
				));
			}

			previousEnd = match.index + match[0].length;
			match = pattern.exec(source);
		}

		fragment.append(source.slice(previousEnd));
		textNode.replaceWith(fragment);
	}
}

function createReferenceElement(
	document: Document,
	source: string,
	target: PandocCrossrefCaptionTarget,
	settings: PandocCrossrefSettings,
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
	anchor.textContent = `${getPandocTargetLabel(target.kind, settings)} ${target.identity.number}`;
	wrapper.appendChild(anchor);
	return wrapper;
}

function setCaptionContent(
	caption: HTMLElement,
	target: PandocCaptionTarget,
	captionText: string,
	settings: PandocCrossrefSettings,
): void {
	while (caption.firstChild !== null) {
		caption.removeChild(caption.firstChild);
	}

	if (isPandocCrossrefTarget(target)) {
		const label = caption.ownerDocument.createElement("span");
		label.className = CAPTION_LABEL_CLASS;
		label.dataset.captionKind = target.kind;
		label.dataset.captionNumber = String(target.identity.number);
		label.textContent = `${getPandocTargetLabel(target.kind, settings)} ${target.identity.number}`;
		caption.appendChild(label);

		if (captionText.length > 0) {
			caption.append(": ", captionText);
		}
	} else {
		caption.textContent = captionText;
	}
}

function findSectionForLine(
	sections: PandocCrossrefReadingSection[],
	line: number,
): PandocCrossrefReadingSection | null {
	let bestMatch: PandocCrossrefReadingSection | null = null;
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

function sectionContainsLine(
	section: PandocCrossrefReadingSection,
	line: number,
): boolean {
	return section.lineStart <= line && line <= section.lineEnd;
}

function collectStandardImages(root: HTMLElement): HTMLImageElement[] {
	const images = collectElements<HTMLImageElement>(root, "img");
	return images.filter((image) => image.closest(".internal-embed") === null);
}

function findStandardImage(
	root: HTMLElement,
	caption: string,
): HTMLImageElement | undefined {
	const images = collectStandardImages(root);
	return images.find((image) => image.getAttribute("alt")?.trim() === caption)
		?? images[0];
}

function collectTables(root: HTMLElement): HTMLTableElement[] {
	return collectElements<HTMLTableElement>(root, "table");
}

function findRenderedTableCaptionBlock(root: HTMLElement): HTMLElement | null {
	return collectElements<HTMLElement>(root, "p").find((paragraph) => (
		/^\s*(?::|Table:)\s*/iu.test(paragraph.textContent ?? "")
	)) ?? null;
}

function findTextNodeContaining(root: HTMLElement, source: string): Text | null {
	if (source.length === 0) {
		return null;
	}

	return collectTextNodes(root).find((textNode) =>
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
	const attributeIndex = attributeText === null
		? -1
		: source.lastIndexOf(attributeText);
	const withoutAttribute = attributeIndex === -1
		? source
		: source.slice(0, attributeIndex);
	const caption = withoutAttribute.replace(/^\s*(?::|Table:)\s*/iu, "").trim();
	return caption.length > 0 ? caption : fallback;
}

function findCaptionByKey(
	root: HTMLElement,
	className: string,
	key: string,
): HTMLElement | null {
	return collectElements<HTMLElement>(root, `.${className}`)
		.find((caption) => caption.dataset.captionKey === key) ?? null;
}

function findSourceElementByKey(
	root: HTMLElement,
	className: string,
	key: string,
): HTMLElement | null {
	return findCaptionByKey(root, className, key);
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
	targets: PandocCaptionTarget[],
): Map<string, PandocCrossrefCaptionTarget> {
	const targetsById = new Map<string, PandocCrossrefCaptionTarget>();
	for (const target of targets) {
		if (
			isPandocCrossrefTarget(target)
			&& !targetsById.has(target.identity.id)
		) {
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
