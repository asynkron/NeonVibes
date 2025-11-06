/**
 * Gravibe Component Diagram Generator
 * Generates Mermaid component diagrams from trace metamodel data.
 * Based on TraceLens.Server/generators/PlantUml/Component1Generator.cs, Component2Generator.cs, and Component3Generator.cs
 * Ported from PlantUML to Mermaid.js
 * 
 * Component2Generator: Shows only component-to-component relationships without subcomponents (operations)
 * Component3Generator: Shows individual spans as components with operations as subcomponents (currently active)
 */

import { createComponentKey, ComponentKind } from "./metaModel.js";
import { escapeMermaid, escapeMermaidId } from "../core/strings.js";
import { buildTraceModel } from "./trace.js";
import { hexToRgb } from "../core/colors.js";
import { colorPalettes } from "../core/config.js";
import { paletteState } from "../core/palette.js";

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
 * @property {number} generator - Generator version (1, 2, or 3) - default: 3
 */

const DEFAULT_CONFIG = {
  curvedLines: false,
  leftToRight: true,
  theme: "dark",
  generator: 3, // Default to Component3Generator
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
 * Gets the current active palette
 * @returns {Object|null} The active palette object or null if not found
 */
function getCurrentPalette() {
  const activeId = paletteState.activeId;
  return colorPalettes.find(p => p.id === activeId) || colorPalettes[0] || null;
}

/**
 * Generates classDef statements for component kinds using palette colors
 * @param {string[]} lines - Output lines array
 */
function generateComponentClassDefs(lines) {
  const palette = getCurrentPalette();
  if (!palette || !palette.components) {
    // Fallback to default colors if palette not available
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
    return;
  }

  // Helper function to darken a color for stroke
  const darkenColor = (hex, factor = 0.8) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.floor(rgb.r * factor).toString(16).padStart(2, '0');
    const g = Math.floor(rgb.g * factor).toString(16).padStart(2, '0');
    const b = Math.floor(rgb.b * factor).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  // Map component kinds to palette component keys
  const componentKindMap = {
    start: "start",
    endpoint: "endpoint",
    service: "service",
    actor: "actor",
    queue: "queue",
    queueconsumer: "queue-consumer",
    workflow: "workflow",
    activity: "activity",
    database: "database",
    databasestatement: "database-statement",
    subcomponent: "subcomponent",
  };

  // Generate classDef for each component kind
  Object.entries(componentKindMap).forEach(([kind, paletteKey]) => {
    const color = palette.components[paletteKey];
    if (color) {
      const strokeColor = kind === "subcomponent"
        ? darkenColor(color, 0.7)
        : darkenColor(color, 0.8);
      const strokeWidth = kind === "subcomponent" ? "1px" : "2px";
      const strokeDasharray = kind === "subcomponent" ? ",stroke-dasharray: 3 3" : "";
      lines.push(`    classDef ${kind} fill:${color},stroke:${strokeColor},stroke-width:${strokeWidth}${strokeDasharray}`);
    } else {
      // Fallback if palette doesn't have this component type
      console.warn(`[generateComponentClassDefs] Palette ${palette.id} missing component color for "${paletteKey}"`);
    }
  });
}

/**
 * Generates a Mermaid component diagram from a trace model
 * Supports three generator versions: Component1Generator, Component2Generator, Component3Generator
 * @param {TraceModel} trace - Trace model
 * @param {ComponentConfig=} config - Configuration options
 * @returns {string} Mermaid component diagram syntax
 */
export function generateComponentDiagram(trace, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const generator = cfg.generator || 3;

  console.log(`[generateComponentDiagram] Starting diagram generation (Component${generator}Generator)`);
  console.log("[generateComponentDiagram] Trace model:", {
    traceId: trace.traceId,
    spanCount: trace.spanCount,
    rootsCount: trace.roots.length,
    groupsCount: trace.groups.size,
    componentsCount: trace.components.size,
  });

  // Route to appropriate generator
  switch (generator) {
    case 1:
      return generateComponent1Diagram(trace, cfg);
    case 2:
      return generateComponent2Diagram(trace, cfg);
    case 3:
      return generateComponent3Diagram(trace, cfg);
    default:
      console.warn(`[generateComponentDiagram] Unknown generator version ${generator}, using Component3Generator`);
      return generateComponent3Diagram(trace, cfg);
  }
}

/**
 * Generates a Mermaid component diagram using Component1Generator style
 * Shows components with subcomponents (operations) and calls between subcomponents
 * @param {TraceModel} trace - Trace model
 * @param {ComponentConfig} config - Configuration options
 * @returns {string} Mermaid component diagram syntax
 */
function generateComponent1Diagram(trace, config) {
  const lines = [];
  const { components, groups, calls } = buildComponentModel(trace);
  const direction = config.leftToRight !== false ? "LR" : "TB"; // Default to LR if not specified

  lines.push(`flowchart ${direction}`);
  renderGroupsWithSubcomponents(lines, components, groups, calls);
  renderCallsWithSubcomponents(lines, components, calls);
  applyStylingWithSubcomponents(lines, components, groups, calls, trace);

  // Add linkStyle to set arrow stroke width to 2px and color to text color
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = rootStyles.getPropertyValue('--ui-text').trim() || '#d7dce3';
  lines.push(`    linkStyle default stroke-width:2px,stroke:${textColor}`);

  return lines.join("\n");
}

/**
 * Generates a Mermaid component diagram using Component2Generator style
 * Shows only component-to-component relationships without subcomponents
 * @param {TraceModel} trace - Trace model
 * @param {ComponentConfig} config - Configuration options
 * @returns {string} Mermaid component diagram syntax
 */
function generateComponent2Diagram(trace, config) {
  const lines = [];
  const { components, groups, calls } = buildComponentModel(trace);
  const direction = config.leftToRight !== false ? "LR" : "TB"; // Default to LR if not specified

  lines.push(`flowchart ${direction}`);
  renderGroupsWithoutSubcomponents(lines, components, groups);
  renderCallsComponentToComponent(lines, components, calls);
  applyStylingWithoutSubcomponents(lines, components, groups, trace);

  // Add linkStyle to set arrow stroke width to 2px and color to text color
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = rootStyles.getPropertyValue('--ui-text').trim() || '#d7dce3';
  lines.push(`    linkStyle default stroke-width:2px,stroke:${textColor}`);

  return lines.join("\n");
}

/**
 * Generates a Mermaid component diagram using Component3Generator style
 * Shows individual spans as components with operations as subcomponents
 * @param {TraceModel} trace - Trace model
 * @param {ComponentConfig} config - Configuration options
 * @returns {string} Mermaid component diagram syntax
 */
function generateComponent3Diagram(trace, config) {
  const lines = [];
  const direction = config.leftToRight !== false ? "LR" : "TB"; // Default to LR if not specified

  lines.push(`flowchart ${direction}`);
  renderSpans(lines, trace);
  renderSpanCalls(lines, trace);
  applySpanStyling(lines, trace);

  // Add linkStyle to set arrow stroke width to 2px and color to text color
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = rootStyles.getPropertyValue('--ui-text').trim() || '#d7dce3';
  lines.push(`    linkStyle default stroke-width:2px,stroke:${textColor}`);

  return lines.join("\n");
}

/**
 * Renders groups and components with subcomponents (Component1Generator style)
 * Components with subcomponents are rendered as subgraphs containing the subcomponents
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 * @param {Call[]} calls - Calls array
 */
function renderGroupsWithSubcomponents(lines, components, groups, calls) {
  const renderedSubcomponents = new Set();

  // First, render components that are not in any group
  components.forEach((component) => {
    const group = groups.get(component.groupId);
    if (!group && component.name !== "nginx") {
      // Component not in a group
      const componentId = escapeMermaidId(component.id);
      const escapedComponentName = escapeMermaid(component.name);

      // Find subcomponents (operations) for this component
      const subcomponents = calls
        .filter((call) => call.toId === component.id && call.operation && call.operation !== "")
        .map((call) => getSubComponentId(component.id, call.operation))
        .filter((id) => {
          if (renderedSubcomponents.has(id)) return false;
          renderedSubcomponents.add(id);
          return true;
        });

      // If component has subcomponents, render as subgraph; otherwise render as simple component
      if (subcomponents.length > 0) {
        // Render component as subgraph containing subcomponents
        lines.push(`    subgraph ${componentId}["${escapedComponentName}"]`);

        subcomponents.forEach((subId) => {
          const call = calls.find(
            (c) => getSubComponentId(component.id, c.operation) === subId
          );
          if (call) {
            const escapedSubId = escapeMermaidId(subId);
            const escapedOperation = escapeMermaid(call.operation);
            lines.push(`        ${escapedSubId}["${escapedOperation}"]`);
          }
        });

        lines.push(`    end`);
      } else {
        // No subcomponents, render as simple component
        lines.push(`    ${getComponentDeclaration(component)}`);
      }
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
        const escapedComponentName = escapeMermaid(component.name);

        // Find subcomponents (operations) for this component
        const subcomponents = calls
          .filter((call) => call.toId === component.id && call.operation && call.operation !== "")
          .map((call) => getSubComponentId(component.id, call.operation))
          .filter((id) => {
            if (renderedSubcomponents.has(id)) return false;
            renderedSubcomponents.add(id);
            return true;
          });

        // If component has subcomponents, render as subgraph; otherwise render as simple component
        if (subcomponents.length > 0) {
          // Render component as subgraph containing subcomponents
          lines.push(`        subgraph ${componentId}["${escapedComponentName}"]`);

          subcomponents.forEach((subId) => {
            const call = calls.find(
              (c) => getSubComponentId(component.id, c.operation) === subId
            );
            if (call) {
              const escapedSubId = escapeMermaidId(subId);
              const escapedOperation = escapeMermaid(call.operation);
              lines.push(`            ${escapedSubId}["${escapedOperation}"]`);
            }
          });

          lines.push(`        end`);
        } else {
          // No subcomponents, render as simple component
          lines.push(`        ${getComponentDeclaration(component)}`);
        }
      }
    });

    lines.push(`    end`);
  });
}

/**
 * Renders groups and components without subcomponents (Component2Generator style)
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 */
function renderGroupsWithoutSubcomponents(lines, components, groups) {
  // First, render components that are not in any group
  components.forEach((component) => {
    const group = groups.get(component.groupId);
    if (!group && component.name !== "nginx") {
      // Component not in a group
      lines.push(`    ${getComponentDeclaration(component)}`);
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
        lines.push(`        ${getComponentDeclaration(component)}`);
      }
    });

    lines.push(`    end`);
  });
}

/**
 * Renders calls between components with subcomponents (Component1Generator style)
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Call[]} calls - Calls array
 */
function renderCallsWithSubcomponents(lines, components, calls) {
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
 * Renders calls between components (Component2Generator style - component-to-component only)
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Call[]} calls - Calls array
 */
function renderCallsComponentToComponent(lines, components, calls) {
  const renderedCalls = new Set();

  // Group calls by component-to-component pairs (ignoring operations)
  const componentCalls = new Map();

  calls.forEach((call) => {
    const fromId = call.fromId;
    const toId = call.toId;

    if (fromId === toId || !fromId || !toId) return;

    const callKey = `${fromId}->${toId}`;
    if (!componentCalls.has(callKey)) {
      componentCalls.set(callKey, {
        fromId,
        toId,
        kind: call.kind,
        callCount: 0,
      });
    }

    const componentCall = componentCalls.get(callKey);
    componentCall.callCount += call.callCount;
    // Use async if any call is async
    if (call.kind === "async") {
      componentCall.kind = "async";
    }
  });

  // Render component-to-component calls
  componentCalls.forEach((call) => {
    const callKey = `${call.fromId}->${call.toId}`;
    if (renderedCalls.has(callKey)) return;
    renderedCalls.add(callKey);

    const escapedFromId = escapeMermaidId(call.fromId);
    const escapedToId = escapeMermaidId(call.toId);
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
 * Applies styling to components with subcomponents (Component1Generator style)
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 * @param {Call[]} calls - Calls array
 * @param {TraceModel} trace - Trace model for color lookup
 */
function applyStylingWithSubcomponents(lines, components, groups, calls, trace) {
  // Generate class definitions for different component kinds using palette colors
  lines.push("");
  generateComponentClassDefs(lines);

  // Create classDef for each group using surface-1 color
  if (groups && groups.size > 0) {
    // Get surface-1 color for all groups
    const rootStyles = getComputedStyle(document.documentElement);
    const surface1 = rootStyles.getPropertyValue('--ui-surface-1').trim() || '#242933';
    const borderColor = rootStyles.getPropertyValue('--ui-border').trim() || '#3a3a3a';

    groups.forEach((group) => {
      const groupId = escapeMermaidId(group.id);
      const groupClassDefName = `group_${groupId}`;
      // Use surface-1 color for all groups
      lines.push(`    classDef ${groupClassDefName} fill:${surface1},stroke:${borderColor},stroke-width:2px,rx:8px,ry:8px`);
    });
  }

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

    // Check if this component has subcomponents (rendered as subgraph)
    const hasSubcomponents = calls.some(
      (call) => call.toId === component.id && call.operation && call.operation !== ""
    );

    if (hasSubcomponents) {
      // Component is rendered as a subgraph, apply rounded border styling
      // Create a classDef for this component subgraph with rounded borders
      const componentSubgraphClassDefName = `component_subgraph_${componentId}`;
      const rootStyles = getComputedStyle(document.documentElement);
      const borderColor = rootStyles.getPropertyValue('--ui-border').trim() || '#3a3a3a';
      // Get the component's fill color from palette
      const palette = getCurrentPalette();
      const componentKindMap = {
        start: "start",
        endpoint: "endpoint",
        service: "service",
        actor: "actor",
        queue: "queue",
        queueconsumer: "queue-consumer",
        workflow: "workflow",
        activity: "activity",
        database: "database",
        databasestatement: "database-statement",
      };
      const paletteKey = componentKindMap[kind] || "service";
      const fillColor = palette?.components?.[paletteKey] || '#c678dd';

      // Create classDef for component subgraph with rounded borders
      lines.push(`    classDef ${componentSubgraphClassDefName} fill:${fillColor},stroke:${borderColor},stroke-width:2px,rx:8px,ry:8px`);
      lines.push(`    class ${componentId} ${componentSubgraphClassDefName}`);
    } else {
      // Regular component node
      lines.push(`    class ${componentId} ${className}`);
    }
  });

  // Apply group styles to group subgraphs
  // Mermaid syntax: class <subgraph-id> <classdef-name>
  if (groups && groups.size > 0) {
    groups.forEach((group) => {
      const groupId = escapeMermaidId(group.id);
      const groupClassDefName = `group_${groupId}`;
      lines.push(`    class ${groupId} ${groupClassDefName}`);
    });
  }

  // Apply subcomponent style to all subcomponents (operations)
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
 * Applies styling to components without subcomponents (Component2Generator style)
 * @param {string[]} lines - Output lines array
 * @param {Map<string, Component>} components - Components map
 * @param {Map<string, Group>} groups - Groups map
 * @param {TraceModel} trace - Trace model for color lookup
 */
function applyStylingWithoutSubcomponents(lines, components, groups, trace) {
  // Generate class definitions for different component kinds using palette colors
  lines.push("");
  generateComponentClassDefs(lines);

  // Create classDef for each group using surface-1 color
  if (groups && groups.size > 0) {
    // Get surface-1 color for all groups
    const rootStyles = getComputedStyle(document.documentElement);
    const surface1 = rootStyles.getPropertyValue('--ui-surface-1').trim() || '#242933';
    const borderColor = rootStyles.getPropertyValue('--ui-border').trim() || '#3a3a3a';

    groups.forEach((group) => {
      const groupId = escapeMermaidId(group.id);
      const groupClassDefName = `group_${groupId}`;
      // Use surface-1 color for all groups
      lines.push(`    classDef ${groupClassDefName} fill:${surface1},stroke:${borderColor},stroke-width:2px,rx:8px,ry:8px`);
    });
  }

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

  // Apply group styles to group subgraphs
  // Mermaid syntax: class <subgraph-id> <classdef-name>
  if (groups && groups.size > 0) {
    groups.forEach((group) => {
      const groupId = escapeMermaidId(group.id);
      const groupClassDefName = `group_${groupId}`;
      lines.push(`    class ${groupId} ${groupClassDefName}`);
    });
  }
}

/**
 * Renders spans as components (Component3Generator style)
 * Each span becomes a component, and operations become subcomponents
 * @param {string[]} lines - Output lines array
 * @param {TraceModel} trace - Trace model
 */
function renderSpans(lines, trace) {
  // Collect all spans
  const allSpans = [];
  const collectSpans = (node) => {
    allSpans.push(node);
    if (node.children) {
      node.children.forEach(collectSpans);
    }
  };
  trace.roots.forEach(collectSpans);

  allSpans.forEach((spanNode) => {
    const span = spanNode.span;
    const description = spanNode.description;
    if (!description) return;

    const component = trace.components.get(
      createComponentKey(description.groupName, description.componentName)
    );
    if (!component) return;

    const spanId = escapeMermaidId(span.spanId);
    const escapedComponentName = escapeMermaid(component.name);

    // If span has an operation, render as subgraph containing the operation
    // (similar to Component1Generator rendering components with subcomponents as subgraphs)
    if (description.operation && description.operation !== "") {
      const operationId = escapeMermaidId(span.spanId + "op");
      const escapedOperation = escapeMermaid(description.operation);

      // Render component as subgraph containing the operation
      lines.push(`    subgraph ${spanId}["${escapedComponentName}"]`);
      lines.push(`        ${operationId}["${escapedOperation}"]`);
      lines.push(`    end`);
    } else {
      // No operation, render as simple component
      lines.push(`    ${spanId}["${escapedComponentName}"]`);
    }
  });
}

/**
 * Renders calls between spans (Component3Generator style)
 * Each call is between span IDs, using operation IDs if operations exist
 * @param {string[]} lines - Output lines array
 * @param {TraceModel} trace - Trace model
 */
function renderSpanCalls(lines, trace) {
  // Collect all spans with their children
  const allSpans = [];
  const collectSpans = (node) => {
    allSpans.push(node);
    if (node.children) {
      node.children.forEach(collectSpans);
    }
  };
  trace.roots.forEach(collectSpans);

  allSpans.forEach((spanNode) => {
    if (!spanNode.children || spanNode.children.length === 0) return;

    const parentSpan = spanNode.span;
    const parentDescription = spanNode.description;
    if (!parentDescription) return;

    // Determine from ID: use spanId + "op" if operation exists, otherwise just spanId
    const fromId = parentDescription.operation && parentDescription.operation !== ""
      ? escapeMermaidId(parentSpan.spanId + "op")
      : escapeMermaidId(parentSpan.spanId);

    spanNode.children.forEach((childNode) => {
      const childSpan = childNode.span;
      const childDescription = childNode.description;
      if (!childDescription) return;

      // Determine call kind
      const callKind = childSpan.kind === "SPAN_KIND_PRODUCER" || childSpan.kind === "SPAN_KIND_CONSUMER"
        ? "async"
        : "sync";

      // Determine to ID: use spanId + "op" if operation exists, otherwise just spanId
      const toId = childDescription.operation && childDescription.operation !== ""
        ? escapeMermaidId(childSpan.spanId + "op")
        : escapeMermaidId(childSpan.spanId);

      // Render call (Component3Generator shows empty label)
      if (callKind === "async") {
        lines.push(`    ${fromId} -.-> ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    });
  });
}

/**
 * Applies styling to spans based on their component kind (Component3Generator style)
 * @param {string[]} lines - Output lines array
 * @param {TraceModel} trace - Trace model
 */
function applySpanStyling(lines, trace) {
  // Generate class definitions for different component kinds using palette colors
  lines.push("");
  generateComponentClassDefs(lines);

  // Collect all spans and apply styling
  const allSpans = [];
  const collectSpans = (node) => {
    allSpans.push(node);
    if (node.children) {
      node.children.forEach(collectSpans);
    }
  };
  trace.roots.forEach(collectSpans);

  const styledComponents = new Set();

  allSpans.forEach((spanNode) => {
    const span = spanNode.span;
    const description = spanNode.description;
    if (!description) return;

    const component = trace.components.get(
      createComponentKey(description.groupName, description.componentName)
    );
    if (!component) return;

    const spanId = escapeMermaidId(span.spanId);

    // Apply style to span component (only once per component)
    if (!styledComponents.has(spanId)) {
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
      lines.push(`    class ${spanId} ${className}`);
      styledComponents.add(spanId);
    }

    // Apply subcomponent style to operation if it exists
    if (description.operation && description.operation !== "") {
      const operationId = escapeMermaidId(span.spanId + "op");
      if (!styledComponents.has(operationId)) {
        lines.push(`    class ${operationId} subcomponent`);
        styledComponents.add(operationId);
      }
    }
  });
}

/**
 * Applies colors to group subgraph backgrounds in the rendered SVG
 * Mermaid doesn't support styling subgraphs via classDef, so we need to post-process the SVG
 * @param {HTMLElement} host - Container element with the rendered Mermaid diagram
 * @param {TraceModel} trace - Trace model with groups and components
 */
function applyGroupSubgraphColors(host, trace) {
  if (!trace || !trace.groups || !trace.serviceNameMapping) {
    return;
  }

  const mermaidSvg = host.querySelector("svg");
  if (!mermaidSvg) {
    return;
  }

  // Get surface-1 color for all groups
  const rootStyles = getComputedStyle(document.documentElement);
  const surface1 = rootStyles.getPropertyValue('--ui-surface-1').trim() || '#242933';

  // Mermaid renders subgraphs as <g> elements with class "cluster"
  trace.groups.forEach((group) => {
    const escapedGroupId = escapeMermaidId(group.id);

    // Use surface-1 color for all groups
    const fillColor = surface1;

    // Find cluster groups - Mermaid uses class "cluster" for subgraphs
    // Try multiple selectors to find the right cluster
    let clusterGroup = null;

    // Method 1: Find by ID containing the group ID
    const idMatch = mermaidSvg.querySelector(`g[id*="${escapedGroupId}"]`);
    if (idMatch && idMatch.classList.contains('cluster')) {
      clusterGroup = idMatch;
    }

    // Method 2: Find all clusters and match by text content (group name)
    if (!clusterGroup) {
      const allClusters = mermaidSvg.querySelectorAll('g.cluster');
      allClusters.forEach((cluster) => {
        const textElements = cluster.querySelectorAll('text');
        for (const textEl of textElements) {
          if (textEl.textContent.trim() === group.name) {
            clusterGroup = cluster;
            break;
          }
        }
      });
    }

    // Method 3: Find by position/order if we have a reliable way
    if (!clusterGroup && trace.groups.size > 0) {
      const allClusters = Array.from(mermaidSvg.querySelectorAll('g.cluster'));
      const groupIndex = Array.from(trace.groups.values()).indexOf(group);
      if (groupIndex >= 0 && groupIndex < allClusters.length) {
        clusterGroup = allClusters[groupIndex];
      }
    }

    if (clusterGroup) {
      // Find the background rectangle (largest rect in the cluster)
      const rects = clusterGroup.querySelectorAll('rect');
      let backgroundRect = null;
      let maxArea = 0;

      rects.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') || '0');
        const height = parseFloat(rect.getAttribute('height') || '0');
        const area = width * height;
        if (area > maxArea && area > 100) {
          maxArea = area;
          backgroundRect = rect;
        }
      });

      if (backgroundRect) {
        backgroundRect.setAttribute('fill', fillColor);
        backgroundRect.style.fill = fillColor;
        backgroundRect.removeAttribute('fill-opacity');
      }
    }
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
    return { render: () => { }, update: () => { } };
  }

  // Find the generator selector dropdown
  const section = host.closest('.component-diagram-section');
  const generatorSelect = section?.querySelector('.component-diagram-generator-select');
  const directionSelect = section?.querySelector('.component-diagram-direction-select');

  let currentConfig = { ...DEFAULT_CONFIG, ...config };
  let mermaidDiagram = "";
  let trace = null;

  // Update config when generator selector changes
  if (generatorSelect) {
    generatorSelect.addEventListener('change', (event) => {
      const generatorValue = parseInt(event.target.value, 10);
      currentConfig = { ...currentConfig, generator: generatorValue };
      console.log(`[initComponentDiagram] Generator changed to ${generatorValue}`);
      render();
    });

    // Initialize selector value from config
    const initialGenerator = currentConfig.generator || 3;
    generatorSelect.value = initialGenerator.toString();
  }

  // Update config when direction selector changes
  if (directionSelect) {
    directionSelect.addEventListener('change', (event) => {
      const directionValue = event.target.value;
      currentConfig = { ...currentConfig, leftToRight: directionValue === 'LR' };
      console.log(`[initComponentDiagram] Direction changed to ${directionValue}`);
      render();
    });

    // Initialize selector value from config
    const initialDirection = currentConfig.leftToRight !== false ? 'LR' : 'TB';
    directionSelect.value = initialDirection;
  }

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

      // Generate Mermaid diagram with current config
      mermaidDiagram = generateComponentDiagram(trace, currentConfig);

      // Log the generated Mermaid diagram for debugging
      console.log("[initComponentDiagram] Generated Mermaid diagram:");
      console.log("=".repeat(80));
      console.log(mermaidDiagram);
      console.log("=".repeat(80));

      // Render Mermaid diagram
      host.innerHTML = `<div class="mermaid">${mermaidDiagram}</div>`;

      // Initialize Mermaid if available
      if (typeof mermaid !== "undefined") {
        // Get CSS variables for styling
        const rootStyles = getComputedStyle(document.documentElement);
        const borderColor = rootStyles.getPropertyValue('--ui-border').trim() || '#3a3a3a';
        const textColor = rootStyles.getPropertyValue('--ui-text').trim() || '#d7dce3';
        const surface1 = rootStyles.getPropertyValue('--ui-surface-1').trim() || '#242933';
        const surface2 = rootStyles.getPropertyValue('--ui-surface-2').trim() || '#1e2129';
        const surface3 = rootStyles.getPropertyValue('--ui-surface-3').trim() || '#12161e';
        const fontFamily = rootStyles.getPropertyValue('--font-base').trim() || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        const fontSize = rootStyles.getPropertyValue('--font-size-base').trim() || '1rem';

        mermaid.initialize({
          startOnLoad: true,
          theme: currentConfig.theme || "dark",
          themeVariables: {
            // Font styling
            fontSize: fontSize,
            fontFamily: fontFamily,

            // Main background colors
            mainBkg: surface1,
            secondaryBkg: surface2,
            tertiaryBkg: surface3,

            // Cluster/subgraph styling
            clusterBkg: 'transparent', // We'll set this via classDef per group
            clusterBorder: borderColor,
            clusterText: textColor,
            clusterTextColor: textColor,

            // Flowchart node styling
            primaryColor: '#c678dd',
            primaryTextColor: textColor,
            primaryBorderColor: borderColor,
            secondaryColor: '#98c379',
            secondaryTextColor: textColor,
            secondaryBorderColor: borderColor,
            tertiaryColor: '#61afef',
            tertiaryTextColor: textColor,
            tertiaryBorderColor: borderColor,

            // Edge/link styling
            lineColor: textColor, // Arrow/edge color matches text color
            defaultLinkColor: textColor,
            edgeLabelBackground: surface2,

            // Title styling
            titleColor: textColor,

            // Color scale variables (cScale0-cScale11)
            cScale0: '#c678dd',
            cScale1: '#98c379',
            cScale2: '#61afef',
            cScale3: '#e5c07b',
            cScale4: '#d19a66',
            cScale5: '#e86671',
            cScale6: '#00c0ff',
            cScale7: '#9b59b6',
            cScale8: '#2ecc71',
            cScale9: '#f39c12',
            cScale10: '#e74c3c',
            cScale11: '#3498db',
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis", // Always use smooth curved lines
            padding: 20, // Add padding around flowchart elements
            nodeSpacing: 50, // Horizontal spacing between nodes (increased to prevent overlap)
            rankSpacing: 50, // Vertical spacing between ranks (increased to prevent overlap)
            diagramMarginX: 50, // Horizontal margin around the diagram
            diagramMarginY: 10, // Vertical margin around the diagram
            wrap: false, // Enable text wrapping for node labels
            wrapPadding: 10, // Padding for wrapped text
            wrapWidth: 150, // Width before wrapping
            subGraphTitleMargin: {
              top: 30, // Increased top margin to prevent title from being hidden
              bottom: 15, // Increased bottom margin for better spacing
            },
          },
        });

        // Render the Mermaid diagram
        mermaid.contentLoaded();

        // Apply colors to group subgraphs after rendering (only for generators 1 and 2)
        // Note: Mermaid's classDef doesn't work reliably for clusters, so we still need SVG post-processing for colors
        const generator = currentConfig.generator || 3;
        if ((generator === 1 || generator === 2) && trace) {
          // Wait for Mermaid to fully render the SVG before applying colors
          const tryApplyColors = (attempt = 0) => {
            const mermaidSvg = host.querySelector("svg");
            if (mermaidSvg) {
              applyGroupSubgraphColors(host, trace);
            } else if (attempt < 10) {
              setTimeout(() => tryApplyColors(attempt + 1), 100 * (attempt + 1));
            }
          };

          // Initial attempt after 500ms
          setTimeout(() => tryApplyColors(0), 500);
        }
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

