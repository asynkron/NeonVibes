/**
 * NeonVibes Flame Chart Component
 * Renders a flame chart visualization of trace spans.
 * Based on TraceLens.Site/Shared/FlameGraph implementation.
 */

import { h } from "../core/dom.js";
import { toNumberTimestamp, buildTraceModel, formatDurationNano } from "./trace.js";
import { getColorKeyFromNode } from "../core/identity.js";
import { ComponentKind } from "./metaModel.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 * @typedef {import("./trace.js").TraceSpanNode} TraceSpanNode
 */

/**
 * Calculates the total duration of a span including all its descendants recursively.
 * This is the "strange math" from the reference implementation.
 * @param {TraceSpanNode} node - The span node
 * @returns {number} Total duration in nanoseconds
 */
function getTotalSpanDurationRecursive(node) {
  const spanDuration = toNumberTimestamp(node.span.endTimeUnixNano) - toNumberTimestamp(node.span.startTimeUnixNano);
  
  if (!node.children || node.children.length === 0) {
    return spanDuration;
  }

  // Calculate the maximum end time of all descendants
  let maxEndTime = toNumberTimestamp(node.span.endTimeUnixNano);
  
  const calculateMaxEndTime = (child) => {
    const childEndTime = toNumberTimestamp(child.span.endTimeUnixNano);
    if (childEndTime > maxEndTime) {
      maxEndTime = childEndTime;
    }
    child.children.forEach(calculateMaxEndTime);
  };
  
  node.children.forEach(calculateMaxEndTime);
  
  // Total duration is from span start to the latest descendant end time
  const startTime = toNumberTimestamp(node.span.startTimeUnixNano);
  return maxEndTime - startTime;
}

/**
 * Finds the widest child duration among all root spans.
 * @param {TraceModel} trace - The trace model
 * @returns {number} Widest child duration in nanoseconds
 */
function findWidestChildDuration(trace) {
  let widest = 0;
  
  const checkNode = (node) => {
    const totalDuration = getTotalSpanDurationRecursive(node);
    if (totalDuration > widest) {
      widest = totalDuration;
    }
    node.children.forEach(checkNode);
  };
  
  trace.roots.forEach(checkNode);
  
  return widest || trace.durationNano || 1;
}

/**
 * Gets the component kind class name for styling.
 * @param {TraceSpanNode} node - The span node
 * @returns {string} Component kind class name
 */
function getComponentKindClass(node) {
  const kind = node.description?.componentKind || ComponentKind.SERVICE;
  return kind.toLowerCase();
}

/**
 * Checks if a span has an error status.
 * @param {TraceSpanNode} node - The span node
 * @returns {boolean} True if span has error status
 */
function hasError(node) {
  return node.span.status?.code === "STATUS_CODE_ERROR";
}

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

/**
 * Creates a flame chart span widget element.
 * @param {TraceSpanNode} node - The span node
 * @param {TraceModel} trace - The trace model
 * @param {number} innerWidthPercent - Inner width percentage (0-100)
 * @param {number} outerWidthPercent - Outer width percentage (0-100)
 * @param {boolean} small - Whether to render in small mode
 * @param {string|null} selectedSpanId - Currently selected span ID
 * @param {Function} onSpanClick - Click handler for span selection
 * @returns {HTMLElement} The span widget element
 */
function createFlameSpanWidget(node, trace, innerWidthPercent, outerWidthPercent, small, selectedSpanId, onSpanClick) {
  const container = h('div', {
    style: { width: '100%', maxWidth: '100%' },
    title: getSpanTitle(node)
  });

  if (!small) {
    const spanBarTotal = h('div', {
      className: 'flame-chart__span-bar-total',
      style: { width: '100%' }
    });

    const spanBg = h('div', {
      className: `flame-chart__span-bg ${getComponentKindClass(node)}`
    });
    spanBarTotal.appendChild(spanBg);

    const spanBar = h('div', {
      className: `flame-chart__span-bar ${getSelectedClass(node, selectedSpanId)} ${getComponentKindClass(node)} ${hasError(node) ? 'flame-chart__span-error' : ''}`,
      style: { width: `${innerWidthPercent}%` },
      onclick: () => onSpanClick(node.span.spanId)
    });
    spanBarTotal.appendChild(spanBar);

    const title = h('div', {
      className: 'flame-chart__title',
      textContent: `${node.description?.operation || node.span.name} - ${formatDurationNano(toNumberTimestamp(node.span.endTimeUnixNano) - toNumberTimestamp(node.span.startTimeUnixNano))}`
    });
    spanBarTotal.appendChild(title);

    container.appendChild(spanBarTotal);
  } else {
    const spanBarSmall = h('div', {
      className: 'flame-chart__span-bar-small'
    });
    container.appendChild(spanBarSmall);
  }

  return container;
}

/**
 * Gets the title text for a span.
 * @param {TraceSpanNode} node - The span node
 * @returns {string} Title text
 */
function getSpanTitle(node) {
  const groupName = node.description?.groupName || '';
  const componentName = node.description?.componentName || '';
  const operation = node.description?.operation || node.span.name || '';
  return `${groupName} ${componentName} ${operation}`.trim();
}

/**
 * Gets the selected class name for a span.
 * @param {TraceSpanNode} node - The span node
 * @param {string|null} selectedSpanId - Currently selected span ID
 * @returns {string} Selected class name or empty string
 */
function getSelectedClass(node, selectedSpanId) {
  if (selectedSpanId === node.span.spanId) {
    return 'flame-chart__span-bar-selected';
  }
  return '';
}

/**
 * Creates a flame chart children widget that renders children horizontally.
 * This contains the "strange math" from the reference implementation.
 * @param {TraceSpanNode} parentNode - The parent span node
 * @param {TraceModel} trace - The trace model
 * @param {number} widestDuration - The widest child duration
 * @param {number} outerWidth - The outer width percentage (0-100)
 * @param {boolean} small - Whether to render in small mode
 * @param {string|null} selectedSpanId - Currently selected span ID
 * @param {Function} onSpanClick - Click handler for span selection
 * @returns {HTMLElement|null} The children widget element or null if no children
 */
function createFlameChildrenWidget(parentNode, trace, widestDuration, outerWidth, small, selectedSpanId, onSpanClick) {
  if (!parentNode.children || parentNode.children.length === 0) {
    return null;
  }

  const container = h('div', {
    className: 'flame-chart__children',
    style: { width: '100%', padding: '0', display: 'flex', justifyContent: 'flex-start' }
  });

  // Calculate scale factor (strange math from reference)
  const scale = 100 / outerWidth;

  // Sort children by total duration descending (like reference)
  const sortedChildren = [...parentNode.children].sort((a, b) => {
    const durationA = getTotalSpanDurationRecursive(a);
    const durationB = getTotalSpanDurationRecursive(b);
    return durationB - durationA; // Descending order
  });

  sortedChildren.forEach((child) => {
    const childOuterWidth = getTotalSpanDurationRecursive(child);
    const childDuration = toNumberTimestamp(child.span.endTimeUnixNano) - toNumberTimestamp(child.span.startTimeUnixNano);

    // Calculate percentages (strange math from reference)
    const childOuterWidthPercentOfTotal = (childOuterWidth / widestDuration) * 100.0;
    const childInnerWidthPercentOfTotal = (childDuration / widestDuration) * 100.0;
    const innerWidthPercent = childOuterWidthPercentOfTotal > 0
      ? (childInnerWidthPercentOfTotal / childOuterWidthPercentOfTotal) * 100.0
      : 0;

    // Determine if child should be rendered in small mode
    const isSmall = small || (childOuterWidthPercentOfTotal < 0.5);

    const childContainer = h('div', {
      style: { width: `${(childOuterWidthPercentOfTotal * scale)}%` }
    });

    const spanWidget = createFlameSpanWidget(
      child,
      trace,
      innerWidthPercent,
      childOuterWidthPercentOfTotal,
      isSmall,
      selectedSpanId,
      onSpanClick
    );

    // Add data attribute for color lookup
    spanWidget.setAttribute('data-span-id', child.span.spanId);
    childContainer.appendChild(spanWidget);

    // Recursively render children if they exist
    if (child.children && child.children.length > 0) {
      const childrenWidget = createFlameChildrenWidget(
        child,
        trace,
        widestDuration,
        childOuterWidthPercentOfTotal,
        isSmall,
        selectedSpanId,
        onSpanClick
      );
      if (childrenWidget) {
        childContainer.appendChild(childrenWidget);
      }
    }

    container.appendChild(childContainer);
  });

  return container;
}

/**
 * Applies colors to flame chart spans using CSS variables.
 * @param {HTMLElement} host - The host element
 * @param {TraceModel} trace - The trace model
 */
function applyFlameChartColors(host, trace) {
  const spanBars = host.querySelectorAll('.flame-chart__span-bar');
  const spanBgs = host.querySelectorAll('.flame-chart__span-bg');

  spanBars.forEach((bar) => {
    const spanId = bar.closest('[data-span-id]')?.dataset.spanId;
    if (!spanId) return;

    // Find the node from the trace
    const findNode = (nodes) => {
      for (const node of nodes) {
        if (node.span.spanId === spanId) {
          return node;
        }
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(trace.roots);
    if (!node) return;

    const colorKey = getColorKeyFromNode(node);
    const cssVar = getServiceColorCssVar(colorKey, trace);
    bar.style.setProperty('--span-color', `var(${cssVar})`);
    bar.style.backgroundColor = `var(${cssVar})`;
  });

  spanBgs.forEach((bg) => {
    const spanId = bg.closest('[data-span-id]')?.dataset.spanId;
    if (!spanId) return;

    const findNode = (nodes) => {
      for (const node of nodes) {
        if (node.span.spanId === spanId) {
          return node;
        }
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(trace.roots);
    if (!node) return;

    const colorKey = getColorKeyFromNode(node);
    const cssVar = getServiceColorCssVar(colorKey, trace);
    bg.style.setProperty('--span-color', `var(${cssVar})`);
    bg.style.backgroundColor = `var(${cssVar})`;
  });
}

/**
 * Initializes the flame chart component.
 * @param {HTMLElement} host - The host element
 * @param {TraceSpan[]} spans - Trace spans
 * @returns {{ render: Function, update: Function }} Component with render and update methods
 */
export function initFlameChart(host, spans) {
  if (!host) {
    return { render: () => {}, update: () => {} };
  }

  // Build trace model
  let trace = null;
  let selectedSpanId = null;

  const onSpanClick = (spanId) => {
    selectedSpanId = selectedSpanId === spanId ? null : spanId;
    render();
  };

  const render = () => {
    host.innerHTML = '';
    host.className = 'flame-chart';

    // Rebuild trace model in case spans changed
    if (spans && Array.isArray(spans)) {
      trace = buildTraceModel(spans);
    } else {
      trace = buildTraceModel([]);
    }

    // Find widest child duration (strange math from reference)
    const widestDuration = findWidestChildDuration(trace);

    // Render each root span
    trace.roots.forEach((root) => {
      const rootOuterWidth = getTotalSpanDurationRecursive(root);
      const rootDuration = toNumberTimestamp(root.span.endTimeUnixNano) - toNumberTimestamp(root.span.startTimeUnixNano);

      const rootOuterWidthPercent = (rootOuterWidth / widestDuration) * 100.0;
      const rootInnerWidthPercent = (rootDuration / widestDuration) * 100.0;
      const rootInnerWidth = rootOuterWidthPercent > 0
        ? (rootInnerWidthPercent / rootOuterWidthPercent) * 100.0
        : 0;

      const rootContainer = h('div', {
        className: 'flame-chart__root',
        dataset: { spanId: root.span.spanId }
      });

      const rootWidget = createFlameSpanWidget(
        root,
        trace,
        rootInnerWidth,
        rootOuterWidthPercent,
        false,
        selectedSpanId,
        onSpanClick
      );
      // Add data attribute for color lookup
      rootWidget.setAttribute('data-span-id', root.span.spanId);
      rootContainer.appendChild(rootWidget);

      // Render children recursively
      if (root.children && root.children.length > 0) {
        const childrenWidget = createFlameChildrenWidget(
          root,
          trace,
          widestDuration,
          rootOuterWidthPercent,
          false,
          selectedSpanId,
          onSpanClick
        );
        if (childrenWidget) {
          rootContainer.appendChild(childrenWidget);
        }
      }

      host.appendChild(rootContainer);
    });

    // Apply colors after rendering
    applyFlameChartColors(host, trace);
  };

  const update = () => {
    // Re-apply colors when palette changes
    applyFlameChartColors(host, trace);
  };

  // Initial render
  render();

  return { render, update };
}

