/**
 * Span Node Component
 * Renders a complete span node with summary, details, children, and interactions
 */

import { h } from "../../core/dom.js";
import { onClickStop } from "../../core/events.js";
import { pruneDescendantState } from "../../core/stateManager.js";
import { renderSpanSummary } from "./spanSummary.js";
import { renderSpanLogs } from "./spanLogs.js";
import { renderSpanDetails, updateRunlineYHeights, renderSpanMarkers } from "../trace.js";

/**
 * Creates a span container element with proper classes and attributes.
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {boolean} isLastChild - Whether this is the last child
 * @returns {HTMLElement} The container element
 */
export function createSpanContainer(node, isLastChild = false) {
  const container = h('div', {
    className: 'trace-span',
    dataset: { spanId: node.span.spanId },
    style: { '--depth': String(node.depth) }
  });

  const hasChildren = node.children.length > 0;
  if (!hasChildren) {
    container.classList.add("trace-span--leaf");
  }

  // Mark if this is the last child for tree line styling
  if (isLastChild) {
    container.classList.add("trace-span--last-child");
  }

  // Mark if this has a parent (depth > 0) for tree line continuation
  if (node.depth > 0) {
    container.classList.add("trace-span--has-parent");
  }

  return container;
}

/**
 * Creates the children container for a span node.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {import("../../core/stateManager.js").TraceViewState} state - The view state
 * @returns {{body: HTMLElement, childrenContainer: HTMLElement}|null} The children container or null if no children
 */
export function createSpanChildren(trace, node, state) {
  const hasChildren = node.children.length > 0;
  if (!hasChildren) {
    return null;
  }

  const body = h('div', { className: 'trace-span__body' });
  const childrenContainer = h('div', {
    className: 'trace-span__children',
    id: `trace-span-children-${node.span.spanId}`
  });

  node.children.forEach((child, index) => {
    const isLast = index === node.children.length - 1;
    childrenContainer.append(renderSpanNode(trace, child, state, isLast, node.depth));
  });

  body.append(childrenContainer);
  return { body, childrenContainer };
}

/**
 * Sets up event handlers and state management for a span node.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {import("../../core/stateManager.js").TraceViewState} state - The view state
 * @param {HTMLElement} container - The container element
 * @param {HTMLElement} summary - The summary element
 * @param {HTMLElement} expander - The expander button
 * @param {HTMLElement} service - The service button
 * @param {HTMLElement} timeline - The timeline button
 * @param {HTMLElement|null} childrenContainer - The children container or null
 * @param {HTMLElement|null} detailSections - The detail sections or null
 * @param {boolean} hasDetails - Whether there are details
 */
export function setupSpanInteractions(trace, node, state, container, summary, expander, service, timeline, childrenContainer, detailSections, hasDetails) {
  const spanId = node.span.spanId;
  const spanState = state ?? {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
  };

  // Set up children expand/collapse
  if (childrenContainer) {
    const hasChildren = node.children.length > 0;
    const childrenOpen = hasChildren && spanState.expandedChildren.has(spanId);
    
    container.classList.toggle("trace-span--children-open", childrenOpen);
    childrenContainer.hidden = !childrenOpen;

    // Update tree line heights after children are rendered and visibility is set
    if (childrenOpen) {
      requestAnimationFrame(() => {
        updateRunlineYHeights(summary);
      });
    }
    
    expander.setAttribute("aria-controls", childrenContainer.id);
    expander.setAttribute("aria-expanded", String(childrenOpen));
    service.setAttribute("aria-controls", childrenContainer.id);
    service.setAttribute("aria-expanded", String(childrenOpen));

    const toggleChildren = () => {
      if (!childrenContainer) {
        return;
      }
      const next = !container.classList.contains("trace-span--children-open");
      container.classList.toggle("trace-span--children-open", next);
      childrenContainer.hidden = !next;
      expander.setAttribute("aria-expanded", String(next));
      service.setAttribute("aria-expanded", String(next));
      if (next) {
        spanState.expandedChildren.add(spanId);
        requestAnimationFrame(() => {
          updateRunlineYHeights(summary);
        });
      } else {
        spanState.expandedChildren.delete(spanId);
        pruneDescendantState(node, spanState);
      }
    };

    onClickStop(expander, toggleChildren);

    onClickStop(service, (event) => {
      if (service.disabled) {
        return;
      }
      toggleChildren();
    });
  } else {
    expander.setAttribute("aria-expanded", "false");
    service.setAttribute("aria-expanded", "false");
  }

  // Set up details expand/collapse
  let detailsOpen = hasDetails && spanState.expandedAttributes.has(spanId);
  if (hasDetails && detailSections) {
    timeline.setAttribute("aria-controls", detailSections.id);
    timeline.setAttribute("aria-expanded", String(detailsOpen));
    container.classList.toggle("trace-span--details-open", detailsOpen);

    onClickStop(timeline, (event) => {
      if (!hasDetails || timeline.disabled) {
        return;
      }
      detailsOpen = !detailsOpen;
      container.classList.toggle("trace-span--details-open", detailsOpen);
      timeline.setAttribute("aria-expanded", String(detailsOpen));
      if (detailsOpen) {
        spanState.expandedAttributes.add(spanId);
      } else {
        spanState.expandedAttributes.delete(spanId);
      }
    });
  } else {
    timeline.disabled = true;
    timeline.setAttribute("aria-disabled", "true");
    timeline.setAttribute("aria-expanded", "false");
  }
}

/**
 * Sets up lazy marker creation on hover for span summaries.
 * Markers are only created when hovering over the span summary.
 * @param {HTMLElement} summary - The span summary element
 * @param {HTMLElement} timeline - The timeline button element
 */
function setupLazyMarkers(summary, timeline) {
  const bar = timeline.querySelector('.trace-span__bar');
  if (!bar || !bar._markerData) {
    return;
  }

  const markersContainer = bar.querySelector('.trace-span__markers');
  if (!markersContainer) {
    return;
  }

  const { node, trace, timeWindow } = bar._markerData;
  let markersElement = null;

  summary.addEventListener('mouseenter', () => {
    // Create markers lazily on first hover
    if (!markersElement && markersContainer.childElementCount === 0) {
      markersElement = renderSpanMarkers(node, trace, timeWindow);
      if (markersElement) {
        markersContainer.appendChild(markersElement);
      }
    }
  });

  summary.addEventListener('mouseleave', () => {
    // Remove markers on mouseleave to save memory
    // They'll be recreated on next hover if needed
    if (markersElement && markersElement.parentNode) {
      markersElement.parentNode.removeChild(markersElement);
      markersElement = null;
    }
  });
}

/**
 * Renders a complete span node with summary, details, children, and interactions.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @param {import("../../core/stateManager.js").TraceViewState} state - The view state
 * @param {boolean} isLastChild - Whether this is the last child
 * @param {number} parentDepth - The parent depth
 * @returns {HTMLElement} The span node container element
 */
export function renderSpanNode(trace, node, state, isLastChild = false, parentDepth = -1) {
  const container = createSpanContainer(node, isLastChild);

  const timeWindow = {
    start: state?.timeWindowStart ?? 0,
    end: state?.timeWindowEnd ?? 100,
  };

  const spanState = state ?? {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
  };

  // Render summary
  const { summary, expander, service, timeline } = renderSpanSummary(
    trace,
    node,
    timeWindow,
    spanState.expandedChildren,
    state?.showRunlineX !== false,
    state?.showRunlineY !== false
  );
  container.append(summary);

  // Render details
  const detailSections = renderSpanDetails(node);
  const hasDetails = detailSections.childElementCount > 0;
  if (hasDetails) {
    detailSections.id = `trace-span-details-${node.span.spanId}`;
    container.append(detailSections);
  }

  // Render children
  const childrenResult = createSpanChildren(trace, node, spanState);
  let childrenContainer = null;
  if (childrenResult) {
    container.append(childrenResult.body);
    childrenContainer = childrenResult.childrenContainer;
  }

  // Set up interactions
  setupSpanInteractions(trace, node, state, container, summary, expander, service, timeline, childrenContainer, detailSections, hasDetails);

  // Set up lazy marker creation on hover
  setupLazyMarkers(summary, timeline);

  return container;
}

