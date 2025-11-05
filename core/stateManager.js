/**
 * State Manager
 * Centralized state creation and updates for trace viewer
 */

/**
 * @typedef {Object} TraceViewState
 * @property {Set<string>} expandedChildren - Set of expanded child span IDs
 * @property {Set<string>} expandedAttributes - Set of expanded attribute span IDs
 * @property {boolean} initializedChildren - Whether children have been initialized
 * @property {number} timeWindowStart - Time window start percentage (0-100)
 * @property {number} timeWindowEnd - Time window end percentage (0-100)
 * @property {boolean} showRunlineX - Show horizontal runlines inside spans
 * @property {boolean} showRunlineY - Show vertical runlines connecting parent to child
 * @property {Object} [preview] - Preview component reference
 */

/**
 * Collects all span IDs from a tree of nodes.
 * @param {Array<{span: {spanId: string}, children: Array}>} nodes - Array of nodes
 * @param {Set<string>} [bucket] - Set to collect IDs into
 * @returns {Set<string>} Set of span IDs
 */
function collectSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    bucket.add(node.span.spanId);
    collectSpanIds(node.children, bucket);
  });
  return bucket;
}

/**
 * Collects span IDs that have children (expandable).
 * @param {Array<{span: {spanId: string}, children: Array}>} nodes - Array of nodes
 * @param {Set<string>} [bucket] - Set to collect IDs into
 * @returns {Set<string>} Set of expandable span IDs
 */
function collectExpandableSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    if (node.children.length) {
      bucket.add(node.span.spanId);
      collectExpandableSpanIds(node.children, bucket);
    }
  });
  return bucket;
}

/**
 * Creates a new trace view state.
 * @param {import("../ui/trace.js").TraceModel} trace - The trace model
 * @returns {TraceViewState} New state object
 */
export function createViewState(trace) {
  const state = {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
    initializedChildren: false,
    timeWindowStart: 0, // Percentage of trace (0-100)
    timeWindowEnd: 100, // Percentage of trace (0-100)
    showRunlineX: true, // Show horizontal runlines inside spans
    showRunlineY: false, // Show vertical runlines connecting parent to child
  };
  
  // Expand all spans with children on first render
  ensureChildrenExpanded(trace, state);
  
  return state;
}

/**
 * Updates the expanded state for a span ID.
 * @param {TraceViewState} state - The state object
 * @param {string} spanId - The span ID
 * @param {boolean} expanded - Whether to expand (true) or collapse (false)
 * @param {'children'|'attributes'} type - Type of expansion ('children' or 'attributes')
 */
export function updateExpanded(state, spanId, expanded, type = 'children') {
  const set = type === 'children' ? state.expandedChildren : state.expandedAttributes;
  if (expanded) {
    set.add(spanId);
  } else {
    set.delete(spanId);
  }
}

/**
 * Prunes descendant state for a node (removes all nested expanded states).
 * @param {{span: {spanId: string}, children: Array}} node - The node to prune descendants from
 * @param {TraceViewState} state - The state object
 */
export function pruneDescendantState(node, state) {
  if (!state) {
    return;
  }
  node.children.forEach((child) => {
    state.expandedChildren.delete(child.span.spanId);
    state.expandedAttributes.delete(child.span.spanId);
    pruneDescendantState(child, state);
  });
}

/**
 * Prunes invalid state (removes IDs that no longer exist in the trace).
 * @param {import("../ui/trace.js").TraceModel} trace - The trace model
 * @param {TraceViewState} state - The state object
 */
export function pruneInvalidState(trace, state) {
  if (!state) {
    return;
  }
  const validIds = collectSpanIds(trace.roots);
  
  Array.from(state.expandedChildren).forEach((id) => {
    if (!validIds.has(id)) {
      state.expandedChildren.delete(id);
    }
  });
  
  Array.from(state.expandedAttributes).forEach((id) => {
    if (!validIds.has(id)) {
      state.expandedAttributes.delete(id);
    }
  });
}

/**
 * Ensures all expandable spans are expanded on first render.
 * @param {import("../ui/trace.js").TraceModel} trace - The trace model
 * @param {TraceViewState} state - The state object
 */
export function ensureChildrenExpanded(trace, state) {
  if (!state || state.initializedChildren) {
    return;
  }
  const expandableIds = collectExpandableSpanIds(trace.roots);
  expandableIds.forEach((id) => {
    state.expandedChildren.add(id);
  });
  state.initializedChildren = true;
}

/**
 * Validates state against a trace model.
 * @param {import("../ui/trace.js").TraceModel} trace - The trace model
 * @param {TraceViewState} state - The state object
 */
export function validateState(trace, state) {
  if (!state) {
    return;
  }
  pruneInvalidState(trace, state);
  ensureChildrenExpanded(trace, state);
}

