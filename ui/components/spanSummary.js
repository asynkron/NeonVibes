/**
 * Span Summary Component
 * Renders the summary section of a span node (left section, timeline, bar)
 */

import { h } from "../../core/dom.js";
import { getColorKeyFromNode } from "../../core/identity.js";
import { renderSpanMarkers, renderRunlineX, renderRunlineY, computeSpanOffsets, formatDurationNano, toNumberTimestamp } from "../trace.js";

/**
 * Creates the left section (expander and service button) for a span summary.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @returns {{leftSection: HTMLElement, expander: HTMLElement, service: HTMLElement, serviceRgb: Object}} Left section components
 */
export function createSpanLeftSection(trace, node) {
  const leftSection = h('div', {
    className: 'trace-span__left',
    style: { paddingLeft: 'calc(var(--depth) * var(--trace-indent-width, 1rem))' }
  });

  const expander = h('button', {
    type: 'button',
    className: 'trace-span__expander',
    attrs: {
      'aria-label': node.children.length ? 'Toggle child spans' : 'No child spans'
    },
    disabled: !node.children.length
  });
  leftSection.append(expander);

  const serviceName = getColorKeyFromNode(node);
  const componentName = node.description?.componentName;

  // Get CSS variable for service color
  const paletteColorNames = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary"];
  const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
  const colorIndex = serviceIndex % paletteColorNames.length;
  const colorName = paletteColorNames[colorIndex];
  const cssVar = `--${colorName}-positive-2`;
  
  const indicatorStyle = {
    "--service-color": `var(${cssVar})`,
    backgroundColor: `var(${cssVar})`
  };

  const service = h('button', {
    type: 'button',
    className: 'trace-span__service',
    disabled: !node.children.length,
    attrs: !node.children.length ? { 'aria-disabled': 'true' } : {}
  }, h('div', { className: 'trace-span__service-row' },
    h('span', { className: 'trace-span__service-indicator', style: indicatorStyle }),
    h('span', { className: 'trace-span__service-name' }, serviceName),
    h('span', { className: 'trace-span__component-name' }, componentName)
  ));
  leftSection.append(service);

  return { leftSection, expander, service, serviceCssVar: cssVar };
}

/**
 * Creates the span bar with name, duration, markers, and runlines.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @param {Object} offsets - Span offsets { startPercent, widthPercent }
 * @param {string} serviceCssVar - Service color CSS variable (e.g., "--primary-positive-2")
 * @param {boolean} showRunlineX - Whether to show horizontal runlines
 * @returns {HTMLElement} The span bar element
 */
export function createSpanBar(trace, node, timeWindow, offsets, serviceCssVar, showRunlineX) {
  const bar = h('div', { className: 'trace-span__bar' });

  // Hide the bar if span is fully outside the time window
  if (offsets.widthPercent === 0) {
    bar.style.display = "none";
  }

  // Use CSS variable for bar colors
  if (serviceCssVar) {
    bar.style.setProperty("--service-color", `var(${serviceCssVar})`);
    bar.style.setProperty("--service-shadow", `0 0 18px color-mix(in srgb, var(${serviceCssVar}) 25%, transparent)`);
  }

  const name = h('span', { className: 'trace-span__name', textContent: node.span.name });
  bar.append(name);

  const duration = h('span', {
    className: 'trace-span__duration',
    textContent: formatDurationNano(
      toNumberTimestamp(node.span.endTimeUnixNano) -
      toNumberTimestamp(node.span.startTimeUnixNano)
    )
  });
  bar.append(duration);

  // Store marker data for lazy creation on hover
  // Don't create markers upfront - they'll be created when hovering over the span summary
  bar._markerData = { node, trace, timeWindow };
  
  // Create empty markers container that will be populated on hover
  const markersContainer = h('div', { className: 'trace-span__markers' });
  bar.append(markersContainer);

  // Add runline-x elements that show parent span duration, interrupted by child spans
  if (showRunlineX) {
    const runlineX = renderRunlineX(node, trace, timeWindow);
    if (runlineX) {
      bar.append(runlineX);
    }
  }

  return bar;
}

/**
 * Creates the timeline button with bar for a span summary.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @param {string} serviceCssVar - Service color CSS variable (e.g., "--primary-positive-2")
 * @param {boolean} showRunlineX - Whether to show horizontal runlines
 * @returns {HTMLElement} The timeline button element
 */
export function createSpanTimeline(trace, node, timeWindow, serviceCssVar, showRunlineX) {
  const timeline = h('button', {
    type: 'button',
    className: 'trace-span__timeline',
    attrs: { 'aria-label': 'Toggle span details' }
  });

  const offsets = computeSpanOffsets(trace, node.span, timeWindow);
  timeline.style.setProperty("--span-start", `${offsets.startPercent}%`);
  timeline.style.setProperty("--span-width", `${offsets.widthPercent}%`);

  // Create bar with name, duration, markers, and runlines
  const bar = createSpanBar(trace, node, timeWindow, offsets, serviceCssVar, showRunlineX);
  timeline.append(bar);

  return timeline;
}

/**
 * Renders a span summary with left section, timeline, and runlines.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @param {Set<string>} expandedChildren - Set of expanded child span IDs
 * @param {boolean} showRunlineX - Whether to show horizontal runlines
 * @param {boolean} showRunlineY - Whether to show vertical runlines
 * @returns {{summary: HTMLElement, expander: HTMLElement, service: HTMLElement, timeline: HTMLElement}} Summary components
 */
export function renderSpanSummary(trace, node, timeWindow = { start: 0, end: 100 }, expandedChildren = new Set(), showRunlineX = true, showRunlineY = true) {
  const summary = h('div', {
    className: 'trace-span__summary',
    dataset: { depth: String(node.depth) },
    style: { '--depth': String(node.depth) }
  });

  // Create left section (expander and service)
  const { leftSection, expander, service, serviceCssVar } = createSpanLeftSection(trace, node);
  summary.append(leftSection);

  // Create timeline with bar
  const timeline = createSpanTimeline(trace, node, timeWindow, serviceCssVar, showRunlineX);
  summary.append(timeline);

  // Add runline-y elements connecting parent to children in the timeline area
  // Position on summary so they can extend beyond the timeline (which has overflow: hidden)
  if (showRunlineY) {
    const runlineY = renderRunlineY(node, trace, timeWindow, expandedChildren);
    if (runlineY) {
      summary.append(runlineY);
    }
  }

  return { summary, expander, service, timeline };
}

