/**
 * Gravibe Trace Preview Component
 * Renders an interactive SVG preview of trace spans with time window selection.
 */

import { hexToRgba, normalizeColorBrightness } from "../core/colors.js";
import { getPaletteColors } from "../core/palette.js";
import { computeSpanOffsets } from "./trace.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 */

/**
 * Renders a non-interactive SVG preview of the trace spans.
 * @param {TraceModel} trace
 * @param {Function} onSelectionChange - Callback when selection changes (start, end) as percentages
 * @param {Object} initialSelection - Initial selection state {start: 0-100, end: 0-100}
 * @returns {{ element: SVGSVGElement, update: Function }}
 */
export function renderTracePreview(trace, onSelectionChange = null, initialSelection = null) {
  const SVG_HEIGHT = 150;
  const MIN_SPAN_WIDTH = 2; // Minimum width in pixels for visibility
  const MIN_SPAN_HEIGHT = 2; // Minimum height in pixels per span
  const SPAN_GAP = 2; // Gap between span rows

  // Flatten all spans from the tree structure
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

  // Calculate row count (one row per span)
  const rowCount = Math.max(allSpans.length, 1);

  // Calculate span height to fill the SVG height
  // Total gap space = (rowCount + 1) * SPAN_GAP (gap before first, between, and after last)
  const totalGapSpace = (rowCount + 1) * SPAN_GAP;
  const availableHeight = SVG_HEIGHT - totalGapSpace;
  const calculatedSpanHeight = availableHeight / rowCount;

  // Use minimum height if calculated height is too small
  const spanHeight = Math.max(calculatedSpanHeight, MIN_SPAN_HEIGHT);

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trace-preview");
  svg.setAttribute("viewBox", `0 0 100 ${SVG_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = "100%";
  svg.style.height = `${SVG_HEIGHT}px`;

  // Background - use UI surface color from CSS variables
  // Read from computed styles to ensure we get the current palette value
  const root = document.documentElement;
  const style = getComputedStyle(root);
  let surfaceColor = style.getPropertyValue("--ui-surface-2").trim();

  // Fallback if CSS variable is not set
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

  // Get palette colors for service coloring
  const paletteColors = getPaletteColors();
  const paletteLength = paletteColors.length;

  // Helper to get color for a service
  const getServiceColor = (serviceName) => {
    const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const colorIndex = serviceIndex % paletteLength;
    const paletteColor = paletteColors[colorIndex];
    const normalizedColor = normalizeColorBrightness(paletteColor, 50, 0.7); // Desaturated (70% of original saturation)
    return normalizedColor;
  };

  // Render each span (preview always shows full range)
  allSpans.forEach((node, index) => {
    const offsets = computeSpanOffsets(trace, node.span, { start: 0, end: 100 });
    const serviceName = node.span.resource?.serviceName || "unknown-service";
    const color = getServiceColor(serviceName);

    // Calculate Y position: SPAN_GAP + index * (spanHeight + SPAN_GAP)
    const y = SPAN_GAP + index * (spanHeight + SPAN_GAP);
    const height = spanHeight;

    // Calculate X position and width (percentage to viewBox units)
    let x = offsets.startPercent;
    let width = offsets.widthPercent;

    // Ensure minimum width in viewBox units (viewBox is 0 0 100 150)
    // For 100 viewBox units wide, 2px min = (2 / actualSVGWidth) * 100
    // Since viewBox is percentage-based, minWidthPercent should be small
    // Assuming typical SVG width of ~800px, 2px = 0.25% of viewBox
    const minWidthPercent = 0.25; // Minimum 2px when SVG is ~800px wide
    if (width < minWidthPercent) {
      width = minWidthPercent;
      // Adjust x to keep span centered if possible
      const originalCenter = x + offsets.widthPercent / 2;
      x = Math.max(0, originalCenter - width / 2);
      // Ensure we don't go past 100%
      if (x + width > 100) {
        x = 100 - width;
      }
    }

    // Create span rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", `${x}`);
    rect.setAttribute("y", `${y}`);
    rect.setAttribute("width", `${width}`);
    rect.setAttribute("height", `${height}`);
    rect.setAttribute("fill", hexToRgba(color, 0.6));
    rect.setAttribute("rx", "1.5"); // Rounded corners
    svg.appendChild(rect);
  });

  // Inverted selection overlays (darken non-selected areas)
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

  // Left draggable marker
  const leftMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leftMarker.setAttribute("class", "trace-preview__marker trace-preview__marker--left");
  leftMarker.setAttribute("x1", "0");
  leftMarker.setAttribute("y1", "0");
  leftMarker.setAttribute("x2", "0");
  leftMarker.setAttribute("y2", `${SVG_HEIGHT}`);
  // Calculate stroke width in viewBox units to maintain fixed 8px width
  // SVG viewBox is "0 0 100 ${SVG_HEIGHT}", so we need to convert 8px to viewBox units
  const updateStrokeWidth = () => {
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 100; // viewBox width in units
    const pixelsPerUnit = rect.width / viewBoxWidth;
    const strokeWidthUnits = 8 / pixelsPerUnit;
    leftMarker.setAttribute("stroke-width", String(strokeWidthUnits));
    rightMarker.setAttribute("stroke-width", String(strokeWidthUnits));
  };

  leftMarker.setAttribute("stroke", "rgba(148, 163, 184, 0.6)");
  leftMarker.style.cursor = "col-resize";
  leftMarker.style.opacity = "0";
  leftMarker.style.transition = "opacity 0.2s ease";
  svg.appendChild(leftMarker);

  // Right draggable marker
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

  // Initialize stroke width
  updateStrokeWidth();

  // Update stroke width on resize
  const resizeObserver = new ResizeObserver(() => {
    updateStrokeWidth();
  });
  resizeObserver.observe(svg);

  // Selection state
  let isSelecting = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let isDraggingMarker = false;
  let draggingMarker = null;

  // Helper to convert SVG client coordinates to viewBox percentage
  const getXPercent = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const svgX = clientX - rect.left;
    const percent = (svgX / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  // Helper to update selection overlays (inverted: darken non-selected areas)
  const updateSelection = () => {
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);

    // Left overlay: from 0 to start
    leftOverlay.setAttribute("x", "0");
    leftOverlay.setAttribute("width", `${start}`);

    // Right overlay: from end to 100
    rightOverlay.setAttribute("x", `${end}`);
    rightOverlay.setAttribute("width", `${100 - end}`);

    // Update marker positions
    leftMarker.setAttribute("x1", `${start}`);
    leftMarker.setAttribute("x2", `${start}`);
    rightMarker.setAttribute("x1", `${end}`);
    rightMarker.setAttribute("x2", `${end}`);
  };

  // Initialize selection from initialSelection or default to full range
  if (initialSelection) {
    selectionStart = initialSelection.start;
    selectionEnd = initialSelection.end;
  } else {
    selectionStart = 0;
    selectionEnd = 100;
  }
  updateSelection();

  // Show/hide markers
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

  // Mouse down on SVG for selection
  const handleMouseDown = (e) => {
    // Check if clicking on a marker
    const target = e.target;
    if (target === leftMarker || target === rightMarker) {
      isDraggingMarker = true;
      draggingMarker = target;
      return;
    }

    // Start new selection
    isSelecting = true;
    const xPercent = getXPercent(e.clientX);
    selectionStart = xPercent;
    selectionEnd = xPercent;
    updateSelection();
    showMarkers();
    svg.style.cursor = "col-resize";
  };

  // Mouse move during selection or marker dragging
  const handleMouseMove = (e) => {
    if (!isSelecting && !isDraggingMarker) {
      // Show markers on hover
      return;
    }

    const xPercent = getXPercent(e.clientX);

    if (isSelecting) {
      selectionEnd = xPercent;
      updateSelection();
    } else if (isDraggingMarker) {
      if (draggingMarker === leftMarker) {
        selectionStart = xPercent;
      } else if (draggingMarker === rightMarker) {
        selectionEnd = xPercent;
      }
      updateSelection();
    }
  };

  // Mouse up - finalize selection
  const handleMouseUp = () => {
    if (isSelecting) {
      // Swap if end < start
      if (selectionEnd < selectionStart) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      }

      // Check if selection is too small - if so, reset to full range
      const selectionWidthPercent = Math.abs(selectionEnd - selectionStart);
      const rect = svg.getBoundingClientRect();
      const thresholdPercent = (5 / rect.width) * 100;

      if (selectionWidthPercent < thresholdPercent) {
        // Reset selection to full range
        selectionStart = 0;
        selectionEnd = 100;
      }

      updateSelection();

      // Notify parent of selection change
      if (onSelectionChange) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        onSelectionChange(start, end);
      }

      isSelecting = false;
      svg.style.cursor = "";
    }

    if (isDraggingMarker) {
      // Swap if end < start
      if (draggingMarker === leftMarker && selectionStart > selectionEnd) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      } else if (draggingMarker === rightMarker && selectionEnd < selectionStart) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      }

      // Check if selection is too small - if so, reset to full range
      const selectionWidthPercent = Math.abs(selectionEnd - selectionStart);
      const rect = svg.getBoundingClientRect();
      const thresholdPercent = (5 / rect.width) * 100;

      if (selectionWidthPercent < thresholdPercent) {
        // Reset selection to full range
        selectionStart = 0;
        selectionEnd = 100;
      }

      updateSelection();

      // Notify parent of selection change
      if (onSelectionChange) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        onSelectionChange(start, end);
      }

      isDraggingMarker = false;
      draggingMarker = null;
    }

    hideMarkers();
  };

  // Add event listeners for mouse interaction
  svg.addEventListener("mousedown", handleMouseDown);
  svg.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Show markers on hover over SVG
  svg.addEventListener("mouseenter", showMarkers);
  svg.addEventListener("mouseleave", hideMarkers);

  /**
   * Updates all computed colors in the preview without re-rendering.
   * Updates background color and span rectangle fill colors.
   */
  const update = () => {
    console.log("[Trace Preview Update] update() method called!");
    // Force a reflow to ensure CSS variables are applied
    void svg.offsetWidth;

    // Update background color - read from inline style first (immediate)
    const backgroundRect = svg.querySelector("rect.trace-preview-background");
    if (backgroundRect) {
      const root = document.documentElement;
      // Read from inline style first (set by applyPalette), then fall back to computed style
      let surfaceColor = root.style.getPropertyValue("--ui-surface-2").trim();
      if (!surfaceColor) {
        const style = getComputedStyle(root);
        surfaceColor = style.getPropertyValue("--ui-surface-2").trim();
      }
      backgroundRect.setAttribute("fill", surfaceColor || "#1e2129");
      console.log("[Trace Preview Update] Background color:", surfaceColor);
    }

    // Update span rectangle fill colors - read fresh palette colors
    const paletteColors = getPaletteColors();
    console.log("[Trace Preview Update] Palette colors read:", paletteColors);
    if (paletteColors.length === 0) {
      // If no palette colors available, skip update
      console.warn("[Trace Preview Update] No palette colors available, skipping update");
      return;
    }
    const paletteLength = paletteColors.length;

    // Helper to compute service color
    const computeServiceColor = (serviceName) => {
      const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
      const colorIndex = serviceIndex % paletteLength;
      const paletteColor = paletteColors[colorIndex];
      if (!paletteColor) {
        // Fallback if palette color is missing
        return "#61afef";
      }
      return normalizeColorBrightness(paletteColor, 50, 0.7);
    };

    // Find all span rectangles (excluding background and overlays)
    const spanRects = svg.querySelectorAll("rect:not(.trace-preview-background):not(.trace-preview__selection)");

    // Update each span rectangle with new colors
    spanRects.forEach((rect, index) => {
      if (index < allSpans.length) {
        const node = allSpans[index];
        const serviceName = node.span.resource?.serviceName || "unknown-service";
        const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
        const colorIndex = serviceIndex % paletteLength;
        const color = computeServiceColor(serviceName);
        const rgba = hexToRgba(color, 0.6);
        rect.setAttribute("fill", rgba);
        if (index < 3) { // Log first 3 spans to avoid spam
          console.log(`[Trace Preview Update] Span ${index}: service="${serviceName}", index=${serviceIndex}, colorIndex=${colorIndex}, color="${color}", rgba="${rgba}"`);
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

