/**
 * Gravibe Component Diagram Generator
 * Generates Mermaid component diagrams from trace metamodel data.
 * Based on TraceLens.Server/generators/PlantUml/Component1Generator.cs
 * Ported from PlantUML to Mermaid.js
 */

import { createComponentKey, ComponentKind } from "./metaModel.js";
import { escapeMermaid, escapeMermaidId } from "../core/strings.js";
import { buildTraceModel } from "./trace.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 * @typedef {import("./trace.js").TraceSpanNode} TraceSpanNode
 * @typedef {import("./trace.js").Component} Component
 * @typedef {import("./trace.js").Group} Group
 */

/**
 * Configuration for component diagram rendering
 * @typedef {Object} ComponentConfig
 * @property {boolean} curvedLines - Use curved lines (not supported in Mermaid, kept for compatibility)
 * @property {boolean} leftToRight - Render left to right (default: true)
 * @property {string} theme - Mermaid theme (default, dark, forest, neutral)
 */

const DEFAULT_CONFIG = {
  curvedLines: false,
  leftToRight: true,
  theme: "dark",
};

/**
 * Represents a call between components
 * @typedef {Object} Call
 * @property {string} fromId - Source component ID
 * @property {string} toId - Target component ID
 * @property {string} operation - Operation name (for subcomponents)
 * @property {string} kind - Call kind ("sync" or "async")
 * @property {number} callCount - Number of calls
 * @property {Call|null} parentCall - Parent call reference
 */

/**
 * Builds a component model with calls from the trace model
 * @param {TraceModel} trace - Trace model
 * @returns {{components: Map<string, Component>, groups: Map<string, Group>, calls: Call[]}} Component model
 */
function buildComponentModel(trace) {
  const components = new Map(trace.components);
  const groups = new Map(trace.groups);
  const calls = [];

  // Build calls from trace spans
  const buildCalls = (parent, parentCall) => {
    if (!parent || !parent.children) return;

    parent.children.forEach((child) => {
      // Skip client spans if flattening (not implemented yet)
      const childDescription = child.description;
      if (!childDescription) {
        // Still process children even if description is missing
        buildCalls(child, parentCall);
        return;
      }

      const parentComponentId = parent.description?.componentName
        ? createComponentKey(parent.description.groupName, parent.description.componentName)
        : "";
      const fromId = parentCall ? parentCall.toId : parentComponentId;
      const toId = childDescription.componentName
        ? createComponentKey(childDescription.groupName, childDescription.componentName)
        : "";
      const operation = childDescription.operation || "";
      
      // Determine call kind (simplified - could check span attributes)
      const kind = child.span.kind === "SPAN_KIND_PRODUCER" || child.span.kind === "SPAN_KIND_CONSUMER" 
        ? "async" 
        : "sync";

      if (toId && fromId) {
        // Find existing call or create new one
        const existingCall = calls.find(
          (c) =>
            c.fromId === fromId &&
            c.toId === toId &&
            c.operation === operation &&
            c.kind === kind
        );

        if (existingCall) {
          existingCall.callCount++;
        } else {
          const newCall = {
            fromId,
            toId,
            operation,
            kind,
            callCount: 1,
            parentCall,
          };
          calls.push(newCall);
          // Recursively build calls for children with this call as parent
          buildCalls(child, newCall);
          return;
        }
      }

      // Recursively build calls for children
      buildCalls(child, parentCall);
    });
  };

  // Build calls starting from root spans
  trace.roots.forEach((root) => {
    const rootId = root.description?.componentName
      ? createComponentKey(root.description.groupName, root.description.componentName)
      : "";
    if (rootId) {
      const rootCall = {
        fromId: "",
        toId: rootId,
        operation: "",
        kind: "sync",
        callCount: 1,
        parentCall: null,
      };
      buildCalls(root, rootCall);
    } else {
      // Still process children even if root has no description
      buildCalls(root, null);
    }
  });

  return { components, groups, calls };
}

/**
 * Gets a subcomponent ID (component ID + operation)
 * @param {string} componentId - Component ID
 * @param {string|null} operation - Operation name
 * @returns {string} Subcomponent ID
 */
function getSubComponentId(componentId, operation) {
  if (!operation || operation === "") {
    return componentId;
  }
  return `${componentId}:${operation}`;
}

/**
 * Gets the component declaration string for Mermaid
 * @param {Component} component - Component
 * @returns {string} Mermaid component declaration
 */
function getComponentDeclaration(component) {
  const escapedId = escapeMermaidId(component.id);
  const escapedName = escapeMermaid(component.name);
  const kind = (component.kind || ComponentKind.SERVICE).toLowerCase();

  // Map component kinds to Mermaid shapes
  // Mermaid flowcharts support different shapes via classDef, but we'll use standard rectangles
  // and apply styling via classDef later
  return `${escapedId}["${escapedName}"]`;
}

/**
 * Generates a Mermaid component diagram from a trace model
 * @param {TraceModel} trace - Trace model
 * @param {ComponentConfig=} config - Configuration options
 * @returns {string} Mermaid component diagram syntax
 */
export function generateComponentDiagram(trace, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const lines = [];

  console.log("[generateComponentDiagram] Starting diagram generation");
  console.log("[generateComponentDiagram] Trace model:", {
    traceId: trace.traceId,
    spanCount: trace.spanCount,
    rootsCount: trace.roots.length,
    groupsCount: trace.groups.size,
    componentsCount: trace.components.size,
  });

  // Build component model with calls
  const { components, groups, calls } = buildComponentModel(trace);
  console.log("[generateComponentDiagram] Built component model:", {
    componentsCount: components.size,
    groupsCount: groups.size,
    callsCount: calls.length,
  });

  // Start flowchart diagram with LR direction
  lines.push("flowchart LR");

  // Render groups and components
  renderGroups(lines, components, groups, calls);

  // Render calls between components
  renderCalls(lines, components, calls);

  // Apply styling
  applyStyling(lines, components, groups, calls);

  const diagram = lines.join("\n");
  console.log(`[generateComponentDiagram] Generated diagram with ${lines.length} lines`);

  return diagram;
}

/**
 * Renders groups and components
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 * @param {Call[]} calls - Calls array
 */
function renderGroups(lines, components, groups, calls) {
  const renderedSubcomponents = new Set();

  // First, render components that are not in any group
  components.forEach((component) => {
    const group = groups.get(component.groupId);
    if (!group && component.name !== "nginx") {
      // Component not in a group
      const componentId = escapeMermaidId(component.id);
      lines.push(`    ${getComponentDeclaration(component)}`);

      // Find subcomponents (operations) for this component
      const subcomponents = calls
        .filter((call) => call.toId === component.id && call.operation && call.operation !== "")
        .map((call) => getSubComponentId(component.id, call.operation))
        .filter((id) => {
          if (renderedSubcomponents.has(id)) return false;
          renderedSubcomponents.add(id);
          return true;
        });

      subcomponents.forEach((subId) => {
        const call = calls.find(
          (c) => getSubComponentId(component.id, c.operation) === subId
        );
        if (call) {
          const escapedSubId = escapeMermaidId(subId);
          const escapedOperation = escapeMermaid(call.operation);
          lines.push(`    ${escapedSubId}["${escapedOperation}"]`);
          lines.push(`    ${escapedSubId} -.-> ${componentId}`);
        }
      });
    }
  });

  // Then render groups with their components
  groups.forEach((group) => {
    const groupId = escapeMermaidId(group.id);
    const escapedGroupName = escapeMermaid(group.name);
    
    lines.push(`    subgraph ${groupId}["${escapedGroupName}"]`);
    
    // Render components in this group
    components.forEach((component) => {
      if (component.groupId === group.id) {
        const componentId = escapeMermaidId(component.id);
        lines.push(`        ${getComponentDeclaration(component)}`);

        // Find subcomponents (operations) for this component
        const subcomponents = calls
          .filter((call) => call.toId === component.id && call.operation && call.operation !== "")
          .map((call) => getSubComponentId(component.id, call.operation))
          .filter((id) => {
            if (renderedSubcomponents.has(id)) return false;
            renderedSubcomponents.add(id);
            return true;
          });

        subcomponents.forEach((subId) => {
          const call = calls.find(
            (c) => getSubComponentId(component.id, c.operation) === subId
          );
          if (call) {
            const escapedSubId = escapeMermaidId(subId);
            const escapedOperation = escapeMermaid(call.operation);
            lines.push(`        ${escapedSubId}["${escapedOperation}"]`);
            lines.push(`        ${escapedSubId} -.-> ${componentId}`);
          }
        });
      }
    });

    lines.push(`    end`);
  });
}

/**
 * Renders calls between components
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Call[]} calls - Calls array
 */
function renderCalls(lines, components, calls) {
  const renderedCalls = new Set();

  calls.forEach((call) => {
    const fromId = call.parentCall
      ? getSubComponentId(call.parentCall.toId, call.parentCall.operation)
      : call.fromId;
    const toId = call.operation && call.operation !== ""
      ? getSubComponentId(call.toId, call.operation)
      : call.toId;

    if (fromId === toId) return;

    const callKey = `${fromId}->${toId}`;
    if (renderedCalls.has(callKey)) return;
    renderedCalls.add(callKey);

    const escapedFromId = escapeMermaidId(fromId);
    const escapedToId = escapeMermaidId(toId);
    const escapedLabel = escapeMermaid(`${call.callCount} calls`);

    // Use different arrow styles for sync vs async
    if (call.kind === "async") {
      lines.push(`    ${escapedFromId} -.->|"${escapedLabel}"| ${escapedToId}`);
    } else {
      lines.push(`    ${escapedFromId} -->|"${escapedLabel}"| ${escapedToId}`);
    }
  });
}

/**
 * Applies styling to components based on their kind
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 * @param {Call[]} calls - Calls array
 */
function applyStyling(lines, components, groups, calls) {
  // Add class definitions for different component kinds
  lines.push("");
  lines.push("    classDef start fill:#61afef,stroke:#4a90e2,stroke-width:2px");
  lines.push("    classDef endpoint fill:#98c379,stroke:#7ba05a,stroke-width:2px");
  lines.push("    classDef service fill:#c678dd,stroke:#9b59b6,stroke-width:2px");
  lines.push("    classDef actor fill:#e5c07b,stroke:#d19a66,stroke-width:2px");
  lines.push("    classDef queue fill:#e86671,stroke:#c0392b,stroke-width:2px");
  lines.push("    classDef queueconsumer fill:#3498db,stroke:#2980b9,stroke-width:2px");
  lines.push("    classDef workflow fill:#1abc9c,stroke:#16a085,stroke-width:2px");
  lines.push("    classDef activity fill:#f39c12,stroke:#e67e22,stroke-width:2px");
  lines.push("    classDef database fill:#95a5a6,stroke:#7f8c8d,stroke-width:2px");
  lines.push("    classDef subcomponent fill:#34495e,stroke:#2c3e50,stroke-width:1px,stroke-dasharray: 3 3");

  // Apply styles to components
  components.forEach((component) => {
    const componentId = escapeMermaidId(component.id);
    const kind = (component.kind || ComponentKind.SERVICE).toLowerCase();
    const classMap = {
      start: "start",
      endpoint: "endpoint",
      service: "service",
      actor: "actor",
      queue: "queue",
      queueconsumer: "queueconsumer",
      workflow: "workflow",
      activity: "activity",
      database: "database",
      databasestatement: "database",
    };
    const className = classMap[kind] || "service";
    lines.push(`    class ${componentId} ${className}`);
  });

  // Apply subcomponent style to all subcomponents (operations)
  // This is done by finding all operation nodes
  const subcomponentIds = [];
  calls.forEach((call) => {
    if (call.operation && call.operation !== "") {
      const subId = getSubComponentId(call.toId, call.operation);
      if (!subcomponentIds.includes(subId)) {
        subcomponentIds.push(subId);
      }
    }
  });

  subcomponentIds.forEach((subId) => {
    const escapedSubId = escapeMermaidId(subId);
    lines.push(`    class ${escapedSubId} subcomponent`);
  });
}

/**
 * Initializes the component diagram viewer
 * @param {HTMLElement} host - Container element for the diagram
 * @param {import("./trace.js").TraceSpan[]} spans - Trace spans
 * @param {ComponentConfig=} config - Configuration options
 * @returns {{ render: () => void, update: () => void }}
 */
export function initComponentDiagram(host, spans, config = {}) {
  console.log("[initComponentDiagram] Called, host:", host);
  if (!host) {
    console.log("[initComponentDiagram] No host, returning empty functions");
    return { render: () => {}, update: () => {} };
  }

  let mermaidDiagram = "";
  let trace = null;

  const render = async () => {
    if (!spans || spans.length === 0) {
      host.innerHTML = "<p>No trace data available</p>";
      return;
    }

    try {
      // Import and build trace model
      const traceModule = await import("./trace.js");
      const { buildTraceModel, ensureSampleLogRowsLoaded } = traceModule;

      // Ensure log rows are loaded
      await ensureSampleLogRowsLoaded();

      // Get log rows via the sampleData module
      const { sampleLogRows } = await import("./sampleData.js");

      // Build trace model with logs merged
      trace = buildTraceModel(spans, sampleLogRows);

      // Generate Mermaid diagram
      mermaidDiagram = generateComponentDiagram(trace, config);

      // Log the generated Mermaid diagram for debugging
      console.log("[initComponentDiagram] Generated Mermaid diagram:");
      console.log("=".repeat(80));
      console.log(mermaidDiagram);
      console.log("=".repeat(80));

      // Render Mermaid diagram
      host.innerHTML = `<div class="mermaid">${mermaidDiagram}</div>`;

      // Initialize Mermaid if available
      if (typeof mermaid !== "undefined") {
        mermaid.initialize({
          startOnLoad: true,
          theme: config.theme || "dark",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis", // Always use smooth curved lines
          },
        });
        mermaid.run();
      } else {
        console.warn("[initComponentDiagram] Mermaid.js not loaded");
      }
    } catch (error) {
      console.error("[initComponentDiagram] Error rendering diagram:", error);
      host.innerHTML = `<p>Error rendering component diagram: ${error.message}</p>`;
    }
  };

  const update = () => {
    // Re-render if needed (e.g., on palette change)
    render();
  };

  // Initial render
  render();

  return { render, update };
}

