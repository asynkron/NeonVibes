/**
 * Identity Utilities
 * Shared helpers for extracting color keys (groupName || serviceName) consistently
 * across all components (trace, sequence diagram, trace preview)
 */

/**
 * Gets the color key from a trace span node.
 * Uses groupName from description if available, otherwise falls back to serviceName.
 * This is the key used in serviceNameMapping for color lookups.
 * @param {import("../ui/trace.js").TraceSpanNode} node - Trace span node with description
 * @returns {string} Color key (groupName || serviceName || "unknown-service")
 */
export function getColorKeyFromNode(node) {
  return node.description?.groupName || node.span.resource?.serviceName || "unknown-service";
}

/**
 * Gets the color key from a component in the trace model.
 * Uses group name if available, otherwise falls back to component's serviceName.
 * @param {import("../ui/trace.js").Component} component - Component from trace model
 * @param {import("../ui/trace.js").TraceModel} trace - Trace model with groups
 * @returns {string} Color key (groupName || serviceName || "unknown-service")
 */
export function getColorKeyFromComponent(component, trace) {
  const group = component.groupId ? trace.groups.get(component.groupId) : null;
  return (group?.name && group.name !== "") ? group.name : (component.serviceName || "unknown-service");
}

/**
 * Gets the color key from a group or component.
 * Uses group name if available and non-empty, otherwise falls back to component's serviceName.
 * @param {import("../ui/trace.js").Group} group - Group from trace model
 * @param {import("../ui/trace.js").Component} component - Component from trace model (optional)
 * @returns {string} Color key (groupName || serviceName || "unknown-service")
 */
export function getColorKeyFromGroupOrComponent(group, component) {
  return (group.name && group.name !== "") ? group.name : (component?.serviceName || "unknown-service");
}

