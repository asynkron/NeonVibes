/**
 * Gravibe Trace Preview Component
 * Renders an interactive SVG preview of trace spans with time window selection.
 */

import { getColorKeyFromNode } from "../core/identity.js";
import { computeSpanOffsets } from "./trace.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 */

const SVG_HEIGHT = 150;
const MIN_SPAN_WIDTH = 2; // Minimum width in pixels for visibility
const MIN_SPAN_HEIGHT = 2; // Minimum height in pixels per span
const SPAN_GAP = 2; // Gap between span rows

/**
 * Flattens all spans from the tree structure into a single array.
 * @param {TraceModel} trace - The trace model
 * @returns {Array} Array of all span nodes
 */
function flattenAllSpans(trace) {
  const allSpans = [];
  const flattenSpans = (nodes) => {
    nodes.forEach((node) => {
      allSpans.push(node);
      if (node.children.length > 0) {
        flattenSpans(node.children);
      }
    });
  };
  flattenSpans(trace.roots);
  return allSpans;
}

/**
 * Calculates span height based on row count.
 * @param {number} rowCount - Number of span rows
 * @returns {number} Calculated span height
 */
function calculateSpanHeight(rowCount) {
  const totalGapSpace = (rowCount + 1) * SPAN_GAP;
  const availableHeight = SVG_HEIGHT - totalGapSpace;
  const calculatedSpanHeight = availableHeight / rowCount;
  return Math.max(calculatedSpanHeight, MIN_SPAN_HEIGHT);
}

/**
 * Creates the SVG element with proper attributes.
 * @returns {SVGSVGElement} The SVG element
 */
function createPreviewSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trace-preview");
  svg.setAttribute("viewBox", `0 0 100 ${SVG_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = "100%";
  svg.style.height = `${SVG_HEIGHT}px`;
  return svg;
}

/**
 * Creates the background rectangle for the preview.
 * @param {SVGSVGElement} svg - The SVG element
 */
function createPreviewBackground(svg) {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  let surfaceColor = style.getPropertyValue("--ui-surface-2").trim();

  if (!surfaceColor) {
    surfaceColor = "#1e2129"; // Dark fallback
  }

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("class", "trace-preview-background");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", "100");
  background.setAttribute("height", `${SVG_HEIGHT}`);
  background.setAttribute("fill", surfaceColor);
  svg.appendChild(background);
}

/**
 * Creates a span rectangle element.
 * @param {Object} node - The span node
 * @param {TraceModel} trace - The trace model
 * @param {number} index - The span index
 * @param {number} spanHeight - The height of each span
 * @returns {SVGRectElement} The span rectangle
 */
/**
 * Gets the CSS variable name for a service color based on its index.
 * Maps service index to palette color CSS variables (primary, secondary, tertiary, etc.)
 * @param {string} colorKey - Color key (groupName || serviceName) to look up
 * @param {TraceModel} trace - Trace model with serviceNameMapping
 * @returns {string} CSS variable name (e.g., "--primary-positive-2")
 */
function getServiceColorCssVar(colorKey, trace) {
  const paletteColorNames = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary"];
  const serviceIndex = trace.serviceNameMapping?.get(colorKey) ?? 0;
  const colorIndex = serviceIndex % paletteColorNames.length;
  const colorName = paletteColorNames[colorIndex];
  return `--${colorName}-positive-2`;
}

function createSpanRect(node, trace, index, spanHeight) {
  const offsets = computeSpanOffsets(trace, node.span, { start: 0, end: 100 });
  const colorKey = getColorKeyFromNode(node);
  const cssVar = getServiceColorCssVar(colorKey, trace);

  const y = SPAN_GAP + index * (spanHeight + SPAN_GAP);
  let x = offsets.startPercent;
  let width = offsets.widthPercent;

  // Ensure minimum width in viewBox units
  const minWidthPercent = 0.25;
  if (width < minWidthPercent) {
    width = minWidthPercent;
    const originalCenter = x + offsets.widthPercent / 2;
    x = Math.max(0, originalCenter - width / 2);
    if (x + width > 100) {
      x = 100 - width;
    }
  }

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", `${x}`);
  rect.setAttribute("y", `${y}`);
  rect.setAttribute("width", `${width}`);
  rect.setAttribute("height", `${spanHeight}`);
  rect.setAttribute("rx", "0");
  rect.style.setProperty("--span-color", `var(${cssVar})`);
  rect.style.fill = `color-mix(in srgb, var(${cssVar}) 60%, transparent)`;
  return rect;
}

/**
 * Renders all span rectangles in the preview.
 * @param {SVGSVGElement} svg - The SVG element
 * @param {TraceModel} trace - The trace model
 * @param {Array} allSpans - Array of all span nodes
 * @param {number} spanHeight - The height of each span
 */
function renderPreviewSpans(svg, trace, allSpans, spanHeight) {
  allSpans.forEach((node, index) => {
    const rect = createSpanRect(node, trace, index, spanHeight);
    svg.appendChild(rect);
  });
}

/**
 * Creates selection overlay rectangles (left and right).
 * @param {SVGSVGElement} svg - The SVG element
 * @returns {{leftOverlay: SVGRectElement, rightOverlay: SVGRectElement}} The overlay elements
 */
function createSelectionOverlays(svg) {
  const leftOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  leftOverlay.setAttribute("class", "trace-preview__selection trace-preview__selection--left");
  leftOverlay.setAttribute("x", "0");
  leftOverlay.setAttribute("y", "0");
  leftOverlay.setAttribute("width", "0");
  leftOverlay.setAttribute("height", `${SVG_HEIGHT}`);
  leftOverlay.setAttribute("fill", "rgba(0, 0, 0, 0.7)");
  leftOverlay.style.pointerEvents = "none";
  svg.appendChild(leftOverlay);

  const rightOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rightOverlay.setAttribute("class", "trace-preview__selection trace-preview__selection--right");
  rightOverlay.setAttribute("x", "100");
  rightOverlay.setAttribute("y", "0");
  rightOverlay.setAttribute("width", "0");
  rightOverlay.setAttribute("height", `${SVG_HEIGHT}`);
  rightOverlay.setAttribute("fill", "rgba(0, 0, 0, 0.7)");
  rightOverlay.style.pointerEvents = "none";
  svg.appendChild(rightOverlay);

  return { leftOverlay, rightOverlay };
}

/**
 * Creates draggable marker lines (left and right).
 * @param {SVGSVGElement} svg - The SVG element
 * @returns {{leftMarker: SVGLineElement, rightMarker: SVGLineElement, updateStrokeWidth: Function}} The markers and update function
 */
function createPreviewMarkers(svg) {
  const leftMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leftMarker.setAttribute("class", "trace-preview__marker trace-preview__marker--left");
  leftMarker.setAttribute("x1", "0");
  leftMarker.setAttribute("y1", "0");
  leftMarker.setAttribute("x2", "0");
  leftMarker.setAttribute("y2", `${SVG_HEIGHT}`);
  leftMarker.setAttribute("stroke", "rgba(148, 163, 184, 0.6)");
  leftMarker.style.cursor = "col-resize";
  leftMarker.style.opacity = "0";
  leftMarker.style.transition = "opacity 0.2s ease";
  svg.appendChild(leftMarker);

  const rightMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
  rightMarker.setAttribute("class", "trace-preview__marker trace-preview__marker--right");
  rightMarker.setAttribute("x1", "100");
  rightMarker.setAttribute("y1", "0");
  rightMarker.setAttribute("x2", "100");
  rightMarker.setAttribute("y2", `${SVG_HEIGHT}`);
  rightMarker.setAttribute("stroke", "rgba(148, 163, 184, 0.6)");
  rightMarker.style.cursor = "col-resize";
  rightMarker.style.opacity = "0";
  rightMarker.style.transition = "opacity 0.2s ease";
  svg.appendChild(rightMarker);

  const updateStrokeWidth = () => {
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 100;
    const pixelsPerUnit = rect.width / viewBoxWidth;
    const strokeWidthUnits = 8 / pixelsPerUnit;
    leftMarker.setAttribute("stroke-width", String(strokeWidthUnits));
    rightMarker.setAttribute("stroke-width", String(strokeWidthUnits));
  };

  updateStrokeWidth();

  const resizeObserver = new ResizeObserver(() => {
    updateStrokeWidth();
  });
  resizeObserver.observe(svg);

  return { leftMarker, rightMarker, updateStrokeWidth };
}

/**
 * Converts SVG client coordinates to viewBox percentage.
 * @param {SVGSVGElement} svg - The SVG element
 * @param {number} clientX - The client X coordinate
 * @returns {number} The percentage (0-100)
 */
function getXPercent(svg, clientX) {
  const rect = svg.getBoundingClientRect();
  const svgX = clientX - rect.left;
  const percent = (svgX / rect.width) * 100;
  return Math.max(0, Math.min(100, percent));
}

/**
 * Updates selection overlays and marker positions.
 * @param {SVGRectElement} leftOverlay - The left overlay element
 * @param {SVGRectElement} rightOverlay - The right overlay element
 * @param {SVGLineElement} leftMarker - The left marker element
 * @param {SVGLineElement} rightMarker - The right marker element
 * @param {number} selectionStart - The selection start percentage
 * @param {number} selectionEnd - The selection end percentage
 */
function updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd) {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  leftOverlay.setAttribute("x", "0");
  leftOverlay.setAttribute("width", `${start}`);

  rightOverlay.setAttribute("x", `${end}`);
  rightOverlay.setAttribute("width", `${100 - end}`);

  leftMarker.setAttribute("x1", `${start}`);
  leftMarker.setAttribute("x2", `${start}`);
  rightMarker.setAttribute("x1", `${end}`);
  rightMarker.setAttribute("x2", `${end}`);
}

/**
 * Checks if selection is too small and resets if needed.
 * @param {SVGSVGElement} svg - The SVG element
 * @param {number} selectionStart - The selection start percentage
 * @param {number} selectionEnd - The selection end percentage
 * @returns {{start: number, end: number}} Normalized selection
 */
function normalizeSelection(svg, selectionStart, selectionEnd) {
  let start = selectionStart;
  let end = selectionEnd;

  // Swap if end < start
  if (end < start) {
    [start, end] = [end, start];
  }

  // Check if selection is too small
  const selectionWidthPercent = Math.abs(end - start);
  const rect = svg.getBoundingClientRect();
  const thresholdPercent = (5 / rect.width) * 100;

  if (selectionWidthPercent < thresholdPercent) {
    start = 0;
    end = 100;
  }

  return { start, end };
}

/**
 * Sets up mouse event handlers for the preview.
 * @param {SVGSVGElement} svg - The SVG element
 * @param {SVGRectElement} leftOverlay - The left overlay element
 * @param {SVGRectElement} rightOverlay - The right overlay element
 * @param {SVGLineElement} leftMarker - The left marker element
 * @param {SVGLineElement} rightMarker - The right marker element
 * @param {Function} onSelectionChange - Callback when selection changes
 * @returns {{showMarkers: Function, hideMarkers: Function}} Marker visibility functions
 */
function setupPreviewMouseHandlers(svg, leftOverlay, rightOverlay, leftMarker, rightMarker, onSelectionChange) {
  let isSelecting = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let isDraggingMarker = false;
  let draggingMarker = null;

  const showMarkers = () => {
    leftMarker.style.opacity = "1";
    rightMarker.style.opacity = "1";
  };

  const hideMarkers = () => {
    if (!isSelecting && !isDraggingMarker) {
      leftMarker.style.opacity = "0";
      rightMarker.style.opacity = "0";
    }
  };

  const handleMouseDown = (e) => {
    const target = e.target;
    if (target === leftMarker || target === rightMarker) {
      isDraggingMarker = true;
      draggingMarker = target;
      return;
    }

    isSelecting = true;
    const xPercent = getXPercent(svg, e.clientX);
    selectionStart = xPercent;
    selectionEnd = xPercent;
    updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);
    showMarkers();
    svg.style.cursor = "col-resize";
  };

  const handleMouseMove = (e) => {
    if (!isSelecting && !isDraggingMarker) {
      return;
    }

    const xPercent = getXPercent(svg, e.clientX);

    if (isSelecting) {
      selectionEnd = xPercent;
      updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);
    } else if (isDraggingMarker) {
      if (draggingMarker === leftMarker) {
        selectionStart = xPercent;
      } else if (draggingMarker === rightMarker) {
        selectionEnd = xPercent;
      }
      updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      const normalized = normalizeSelection(svg, selectionStart, selectionEnd);
      selectionStart = normalized.start;
      selectionEnd = normalized.end;
      updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);

      if (onSelectionChange) {
        onSelectionChange(selectionStart, selectionEnd);
      }

      isSelecting = false;
      svg.style.cursor = "";
    }

    if (isDraggingMarker) {
      const normalized = normalizeSelection(svg, selectionStart, selectionEnd);
      selectionStart = normalized.start;
      selectionEnd = normalized.end;
      updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);

      if (onSelectionChange) {
        onSelectionChange(selectionStart, selectionEnd);
      }

      isDraggingMarker = false;
      draggingMarker = null;
    }

    hideMarkers();
  };

  svg.addEventListener("mousedown", handleMouseDown);
  svg.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  svg.addEventListener("mouseenter", showMarkers);
  svg.addEventListener("mouseleave", hideMarkers);

  return { showMarkers, hideMarkers };
}

/**
 * Renders a non-interactive SVG preview of the trace spans.
 * @param {TraceModel} trace
 * @param {Function} onSelectionChange - Callback when selection changes (start, end) as percentages
 * @param {Object} initialSelection - Initial selection state {start: 0-100, end: 0-100}
 * @returns {{ element: SVGSVGElement, update: Function }}
 */
export function renderTracePreview(trace, onSelectionChange = null, initialSelection = null) {
  // Flatten all spans and calculate dimensions
  const allSpans = flattenAllSpans(trace);
  const rowCount = Math.max(allSpans.length, 1);
  const spanHeight = calculateSpanHeight(rowCount);

  // Create SVG structure
  const svg = createPreviewSVG();
  createPreviewBackground(svg);
  renderPreviewSpans(svg, trace, allSpans, spanHeight);
  const { leftOverlay, rightOverlay } = createSelectionOverlays(svg);
  const { leftMarker, rightMarker } = createPreviewMarkers(svg);

  // Initialize selection
  let selectionStart = initialSelection?.start ?? 0;
  let selectionEnd = initialSelection?.end ?? 100;
  updateSelection(leftOverlay, rightOverlay, leftMarker, rightMarker, selectionStart, selectionEnd);

  // Setup mouse handlers
  setupPreviewMouseHandlers(svg, leftOverlay, rightOverlay, leftMarker, rightMarker, onSelectionChange);

  /**
   * Updates all computed colors in the preview without re-rendering.
   * Updates background color and span rectangle fill colors.
   */
  const update = () => {
    console.log("[Trace Preview Update] update() method called!");
    void svg.offsetWidth;

    // Update background color
    const backgroundRect = svg.querySelector("rect.trace-preview-background");
    if (backgroundRect) {
      const root = document.documentElement;
      let surfaceColor = root.style.getPropertyValue("--ui-surface-2").trim();
      if (!surfaceColor) {
        const style = getComputedStyle(root);
        surfaceColor = style.getPropertyValue("--ui-surface-2").trim();
      }
      backgroundRect.setAttribute("fill", surfaceColor || "#1e2129");
      console.log("[Trace Preview Update] Background color:", surfaceColor);
    }

    // Update span rectangle fill colors using CSS variables
    const spanRects = svg.querySelectorAll("rect:not(.trace-preview-background):not(.trace-preview__selection)");
    spanRects.forEach((rect, index) => {
      if (index < allSpans.length) {
        const node = allSpans[index];
        const colorKey = getColorKeyFromNode(node);
        const cssVar = getServiceColorCssVar(colorKey, trace);
        rect.style.setProperty("--span-color", `var(${cssVar})`);
        rect.style.fill = `color-mix(in srgb, var(${cssVar}) 60%, transparent)`;
        if (index < 3) {
          console.log(`[Trace Preview Update] Span ${index}: colorKey="${colorKey}", groupName="${node.description?.groupName}", serviceName="${node.span.resource?.serviceName}", cssVar="${cssVar}"`);
        }
      }
    });
    console.log(`[Trace Preview Update] Updated ${spanRects.length} span rectangles`);
  };

  // Store preview component reference on the SVG element for direct access
  svg.__previewComponent = { element: svg, update };

  return {
    element: svg,
    update
  };
}

