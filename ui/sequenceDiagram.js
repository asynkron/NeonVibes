/**
 * Gravibe Sequence Diagram Generator
 * Generates Mermaid sequence diagrams from trace metamodel data.
 * Based on TraceLens.Server/generators/PlantUml/SequenceGenerator.cs
 */

import { createComponentKey, ComponentKind } from "./metaModel.js";
import { escapeMermaid, escapeMermaidId } from "../core/strings.js";
import { colorPalettes } from "../core/config.js";
import { paletteState } from "../core/palette.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 * @typedef {import("./trace.js").TraceSpanNode} TraceSpanNode
 * @typedef {import("./metaModel.js").ComponentKind} ComponentKind
 */

/**
 * Configuration for sequence diagram rendering
 * @typedef {Object} SequenceConfig
 * @property {boolean} showAttributes - Show span attributes as notes
 * @property {boolean} showLogs - Show logs as notes
 * @property {boolean} showAsync - Show async call groups
 * @property {boolean} showRecursion - Show recursive calls (same component)
 * @property {string} theme - Mermaid theme (default, dark, forest, neutral)
 */

const DEFAULT_CONFIG = {
  showAttributes: true,
  showLogs: true,
  showAsync: true,
  showRecursion: true,
  theme: "dark",
};

/**
 * Generates a Mermaid sequence diagram from a trace model
 * @param {TraceModel} trace - The trace model with groups and components
 * @param {SequenceConfig=} config - Configuration options
 * @returns {string} Mermaid sequence diagram syntax
 */
export function generateSequenceDiagram(trace, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const lines = [];

  console.log("[generateSequenceDiagram] Starting diagram generation");
  console.log("[generateSequenceDiagram] Trace model:", {
    traceId: trace.traceId,
    spanCount: trace.spanCount,
    rootsCount: trace.roots.length,
    groupsCount: trace.groups.size,
    componentsCount: trace.components.size,
  });

  lines.push("sequenceDiagram");
  lines.push("    autonumber");
  console.log("[generateSequenceDiagram] Added sequenceDiagram header and autonumber");

  // Render participants (components grouped by groups) FIRST
  // This ensures all participants are declared before being used in calls/notes
  renderParticipants(lines, trace);
  console.log("[generateSequenceDiagram] Rendered participants, total lines:", lines.length);

  // Verify all participant IDs that are declared
  const declaredParticipantIds = new Set();
  lines.forEach((line) => {
    // Extract participant IDs from declarations: "participant "Name" as id" or "actor "Name" as id"
    // Also handle lines with extra indentation inside boxes
    const participantMatch = line.match(/(?:participant|actor|database)\s+(?:"[^"]+"\s+)?as\s+(\w+)/);
    if (participantMatch) {
      const id = participantMatch[1];
      declaredParticipantIds.add(id);
      console.log(`[generateSequenceDiagram] Found declared participant: ${id} in line: ${line.trim()}`);
    }
  });
  console.log("[generateSequenceDiagram] All declared participant IDs:", Array.from(declaredParticipantIds).sort());

  // Render the sequence from root spans (calls and notes that reference participants)
  trace.roots.forEach((root, index) => {
    console.log(`[generateSequenceDiagram] Rendering root ${index + 1}/${trace.roots.length}`);
    // Create a call from "start" to the root span's first component
    renderRootCall(lines, root, trace, cfg);
    // Then render the children recursively
    renderChildren(lines, root, trace, cfg);
  });

  const diagram = lines.join("\n");
  console.log(`[generateSequenceDiagram] Generated diagram with ${lines.length} lines`);

  return diagram;
}

/**
 * Gets the currently active palette
 * @returns {Object|null} Active palette or null
 */
function getCurrentPalette() {
  const activeId = paletteState.activeId;
  return colorPalettes.find(p => p.id === activeId) || colorPalettes[0] || null;
}

/**
 * Gets component color CSS variable name based on component kind
 * @param {Component} component - Component to get color for
 * @returns {string|null} CSS variable name (e.g., "--component-service-positive-2") or null
 */
function getComponentColorCssVar(component) {
  // Map component kinds to palette component keys (same as component diagrams)
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

  const kind = (component.kind || ComponentKind.SERVICE).toLowerCase();
  const paletteKey = componentKindMap[kind] || "service";

  // Return CSS variable name with positive-2 variation (e.g., "--component-service-positive-2")
  return `--component-${paletteKey}-positive-2`;
}

/**
 * Renders participants (components) from the metamodel
 * @param {string[]} lines - Output lines array
 * @param {TraceModel} trace - Trace model
 */
function renderParticipants(lines, trace) {
  // Track which components have been rendered to avoid duplicates
  const renderedComponentIds = new Set();

  // Add "start" participant first - this represents the entry point for all root spans
  lines.push(`    participant start as "Start"`);
  renderedComponentIds.add("start");
  console.log(`[renderParticipants] Added start participant`);

  // Use centralized color service

  // Build a map of all components by their groupId for easier lookup
  const componentsByGroup = new Map();
  trace.components.forEach((component) => {
    const groupId = component.groupId || "";
    if (!componentsByGroup.has(groupId)) {
      componentsByGroup.set(groupId, []);
    }
    componentsByGroup.get(groupId).push(component);
  });

  // First, render components that are not in any group (no groupId or empty groupId)
  // OR components whose groupId doesn't exist in trace.groups
  const ungroupedComponents = componentsByGroup.get("") || [];
  ungroupedComponents.forEach((component) => {
    const declaration = getComponentDeclaration(component);
    if (declaration) {
      lines.push(`    ${declaration}`);
      renderedComponentIds.add(component.id);
      console.log(`[renderParticipants] Added ungrouped participant: ${declaration} (id: ${component.id})`);
    }
  });

  // Also check for components with groupIds that don't exist in groups
  trace.components.forEach((component) => {
    if (component.groupId && component.groupId !== "" && !trace.groups.has(component.groupId)) {
      if (!renderedComponentIds.has(component.id)) {
        const declaration = getComponentDeclaration(component);
        if (declaration) {
          lines.push(`    ${declaration}`);
          renderedComponentIds.add(component.id);
          console.log(`[renderParticipants] Added participant with invalid groupId: ${declaration} (groupId: ${component.groupId}, id: ${component.id})`);
        }
      }
    }
  });

  // Then, render groups with their components (Mermaid uses "box" not "group")
  trace.groups.forEach((group) => {
    const groupName = escapeMermaid(group.name);
    console.log(`[renderParticipants] Rendering group: ${groupName} (id: "${group.id}")`);

    // Get all components for this group
    const groupComponents = componentsByGroup.get(group.id) || [];
    console.log(`[renderParticipants] Found ${groupComponents.length} components for group ${groupName}`);

    if (groupComponents.length > 0) {
      // Mermaid box syntax: box "Group Name" (color applied via SVG post-processing)
      lines.push(`    box "${groupName}"`);
      console.log(`[renderParticipants] Box for group ${groupName}`);

      // Sort components by entrypointType: entrypoints (1) first, then internals (2), then exitpoints (3)
      const sortedComponents = [...groupComponents].sort((a, b) => {
        const aType = a.entrypointType || 2; // Default to internal
        const bType = b.entrypointType || 2; // Default to internal
        return aType - bType; // 1 (entrypoint) < 2 (internal) < 3 (exitpoint)
      });

      sortedComponents.forEach((component) => {
        // Only render if not already rendered
        if (!renderedComponentIds.has(component.id)) {
          const declaration = getComponentDeclaration(component);
          if (declaration) {
            lines.push(`        ${declaration}`);
            renderedComponentIds.add(component.id);
            console.log(`[renderParticipants] Added participant to group ${groupName}: ${declaration} (component.groupId: "${component.groupId}", id: ${component.id}, entrypointType: ${component.entrypointType || 2})`);
          }
        } else {
          console.warn(`[renderParticipants] Component ${component.id} (groupId: "${component.groupId}") already rendered, skipping duplicate`);
        }
      });

      lines.push(`    end`);
    } else {
      console.warn(`[renderParticipants] Group ${groupName} (id: "${group.id}") has no components`);
    }
  });

  const totalParticipants = lines.filter(l => l.includes('participant') || l.includes('actor') || l.includes('database')).length;
  console.log(`[renderParticipants] Summary - Total participant lines: ${totalParticipants}, Unique components rendered: ${renderedComponentIds.size}`);

  // Warn if we have duplicates
  if (totalParticipants !== renderedComponentIds.size) {
    console.warn(`[renderParticipants] WARNING: Possible duplicate participants! Lines: ${totalParticipants}, Unique: ${renderedComponentIds.size}`);
    // Log all component IDs for debugging
    console.log(`[renderParticipants] Rendered component IDs:`, Array.from(renderedComponentIds));
  }
}

/**
 * Gets the Mermaid participant declaration for a component
 * @param {import("./trace.js").Component} component
 * @returns {string|null}
 */
function getComponentDeclaration(component) {
  const name = escapeMermaid(component.name);
  // Mermaid IDs must be alphanumeric and cannot contain special characters like colons
  // Replace colons and other special chars with underscores
  const id = escapeMermaidId(component.id);

  // Mermaid sequence diagrams only support "participant" and "actor"
  // All other types (database, queue, etc.) must use "participant"
  // Correct syntax: participant id as "pretty name"
  switch (component.kind) {
    case "actor":
      return `actor ${id} as "${name}"`;
    case "endpoint":
    case "queue":
    case "database":
    case "databasestatement":
    case "queueconsumer":
    case "workflow":
    case "activity":
    case "start":
    default:
      // All types use "participant" (Mermaid sequence diagrams only support participant and actor)
      // Syntax: participant id as "pretty name"
      return `participant ${id} as "${name}"`;
  }
}

/**
 * Applies colors directly to participant header rectangles in the rendered SVG
 * Uses component kind-based colors from the palette (same as component diagrams)
 * @param {HTMLElement} host - Container element with the rendered Mermaid diagram
 * @param {TraceModel} trace - Trace model with components and serviceNameMapping
 */
function applyParticipantColors(host, trace) {
  if (!trace || !trace.components || !trace.serviceNameMapping) {
    console.warn("[applyParticipantColors] Missing trace data");
    return;
  }

  console.log("[applyParticipantColors] Applying colors to participant headers");

  const mermaidSvg = host.querySelector("svg");
  if (!mermaidSvg) {
    console.warn("[applyParticipantColors] Mermaid SVG not found");
    return;
  }

  // Find all participant header rectangles by their name attribute
  // Example: <rect class="actor actor-top" name="edge_gateway_Internal" ...>
  trace.components.forEach((component) => {
    // Get component color CSS variable name
    const colorCssVar = getComponentColorCssVar(component);

    const escapedId = escapeMermaidId(component.id);
    const rects = mermaidSvg.querySelectorAll(`rect[name="${escapedId}"]`);

    if (rects.length > 0) {
      rects.forEach((rect) => {
        // Use CSS variable directly
        rect.style.fill = `var(${colorCssVar})`;
        rect.style.stroke = `var(${colorCssVar})`;
        rect.style.strokeWidth = "2px";
      });

      console.log(`[applyParticipantColors] Applied CSS variable ${colorCssVar} to ${rects.length} rect(s) with name="${escapedId}" (kind: ${component.kind})`);
    } else {
      console.warn(`[applyParticipantColors] No rects found with name="${escapedId}"`);
    }
  });

  // Apply special color to "Start" participant using CSS variable with positive-2 variation
  const startRects = mermaidSvg.querySelectorAll(`rect[name="start"]`);
  if (startRects.length > 0) {
    startRects.forEach((rect) => {
      // Use CSS variable with positive-2 variation
      rect.style.fill = "var(--ui-success-positive-2)";
      rect.style.stroke = "var(--ui-success-positive-2)";
      rect.style.strokeWidth = "2px";
    });
    console.log(`[applyParticipantColors] Applied CSS variable --ui-success-positive-2 to ${startRects.length} rect(s) with name="start"`);
  } else {
    console.warn(`[applyParticipantColors] No rects found with name="start"`);
  }

  // Apply surface-positive-1 color to box backgrounds
  const rootStyles = getComputedStyle(document.documentElement);
  const surfacePositive1 = rootStyles.getPropertyValue('--ui-surface-positive-1').trim() || '#242933';

  // Mermaid creates boxes as <g> elements with class "boxGroup" or similar
  // The background is typically a <rect> inside the box group
  // Try different selectors to find box rectangles
  const boxRects = mermaidSvg.querySelectorAll('g.boxGroup rect, g.box rect, rect.box');
  if (boxRects.length > 0) {
    boxRects.forEach((rect) => {
      rect.style.fill = surfacePositive1;
    });
    console.log(`[applyParticipantColors] Applied surface-positive-1 color to ${boxRects.length} box rect(s)`);
  } else {
    // Alternative: look for rects that are children of groups that might be boxes
    // Mermaid boxes are typically in a structure like: <g class="boxGroup"><rect>...</rect></g>
    const allGroups = mermaidSvg.querySelectorAll('g');
    let boxCount = 0;
    allGroups.forEach((group) => {
      // Check if this group contains a rect that looks like a box background
      const rects = group.querySelectorAll('rect');
      rects.forEach((rect) => {
        // Box backgrounds are typically large rectangles that aren't participant headers
        // They usually have a fill color set by Mermaid's theme
        const rectFill = rect.getAttribute('fill') || '';
        // If it's a background-like rect (not a participant header), apply our color
        if (rectFill && !rect.hasAttribute('name') && rect.getBBox().width > 100) {
          rect.style.fill = surfacePositive1;
          boxCount++;
        }
      });
    });
    if (boxCount > 0) {
      console.log(`[applyParticipantColors] Applied surface-positive-1 color to ${boxCount} box background rect(s)`);
    } else {
      console.warn(`[applyParticipantColors] No box rectangles found to color`);
    }
  }
}

/**
 * Renders children recursively, creating calls between participants
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} parent - Parent node
 * @param {TraceModel} trace - Trace model
 * @param {SequenceConfig} config - Configuration
 */
function renderChildren(lines, parent, trace, config) {
  if (!parent.children || parent.children.length === 0) {
    return;
  }

  let startTime = 0;
  let endTime = parent.children[0]?.span.startTimeUnixNano || Number.MAX_SAFE_INTEGER;

  // Render logs before first child
  if (config.showLogs) {
    renderLogs(lines, parent, startTime, endTime, trace, config);
  }
  startTime = endTime;

  parent.children.forEach((child) => {
    endTime = child.span.startTimeUnixNano || Number.MAX_SAFE_INTEGER;

    // Render logs before this child call
    if (config.showLogs) {
      renderLogs(lines, parent, startTime, endTime, trace, config);
    }
    startTime = endTime;

    const parentDesc = parent.description;
    const childDesc = child.description;

    // Get component IDs even if descriptions are missing (will return "unknown" if missing)
    const parentComponentId = getComponentId(parent, trace);
    const childComponentId = getComponentId(child, trace);

    // Check if this is a recursion (same component calling itself)
    const isRecursion = parentComponentId === childComponentId;

    if (isRecursion) {
      console.log(`[renderChildren] Self-call detected: ${parentComponentId} -> ${childComponentId} (showRecursion: ${config.showRecursion})`);
    }

    // Render call if NOT a recursion OR showRecursion is enabled
    // Note: We render calls even if component IDs are "unknown" - they'll still be valid participants
    const shouldRenderCall = !isRecursion || config.showRecursion;

    if (shouldRenderCall) {
      // Render call start
      renderCallStart(lines, child, parent, trace, config);

      // Render attributes if enabled
      if (config.showAttributes && childDesc) {
        renderAttributes(lines, child, trace, config);
      }

      // Render children recursively
      renderChildren(lines, child, trace, config);

      // Render call end
      renderCallEnd(lines, child, parent, trace, config);
    } else {
      // Still render children even if call is skipped (for recursion or unknown components)
      if (!isRecursion || config.showRecursion) {
        // Only skip if it's a recursion and showRecursion is false
        if (config.showAttributes && childDesc) {
          renderAttributes(lines, child, trace, config);
        }
        renderChildren(lines, child, trace, config);
      } else {
        console.log(`[renderChildren] Skipping self-call rendering for ${parentComponentId} (showRecursion is false)`);
      }
    }
  });

  // Render logs after all children
  if (config.showLogs) {
    renderLogs(lines, parent, startTime, Number.MAX_SAFE_INTEGER, trace, config);
  }
}

/**
 * Gets the component ID for a node
 * @param {TraceSpanNode} node
 * @param {TraceModel} trace
 * @returns {string}
 */
function getComponentId(node, trace) {
  if (!node.description) {
    console.warn(`[getComponentId] Node ${node.span.spanId} has no description, returning "unknown"`);
    return "unknown";
  }

  // Apply the same normalization logic as buildTraceModel()
  // This ensures we use the same groupName/componentName that were used when creating the component
  let groupName = node.description.groupName || "";
  let componentName = node.description.componentName || "";

  // Normalize: if component is Service and group is empty, use component name as group
  // This matches the logic in buildTraceModel() lines 360-363
  if (node.description.componentKind === ComponentKind.SERVICE && !groupName) {
    groupName = componentName;
    componentName = "Internal";
  }
  if (!componentName) {
    componentName = "Unknown";
  }

  const componentId = createComponentKey(groupName, componentName);

  const exists = trace.components.has(componentId);
  if (!exists) {
    console.warn(`[getComponentId] Component ${componentId} not found in trace.components (original groupName: "${node.description.groupName}", original componentName: "${node.description.componentName}", normalized groupName: "${groupName}", normalized componentName: "${componentName}")`);
    // Log all available component IDs for debugging
    console.log(`[getComponentId] Available component IDs:`, Array.from(trace.components.keys()));
  }

  return exists ? componentId : "unknown";
}

/**
 * Renders a call from the "start" participant to the root span's component
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} root - Root node
 * @param {TraceModel} trace - Trace model
 * @param {SequenceConfig} config - Configuration
 */
function renderRootCall(lines, root, trace, config) {
  const rootComponentId = escapeMermaidId(getComponentId(root, trace));
  const operation = root.description?.operation || root.span.name || "Start";

  const escapedOperation = escapeMermaid(operation);

  console.log(`[renderRootCall] start -> ${rootComponentId}: ${escapedOperation}`);

  // Create call from start to root component
  lines.push(`    start->>+${rootComponentId}: ${escapedOperation}`);
}

/**
 * Renders a call start (request)
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} child - Child node making the call
 * @param {TraceSpanNode} parent - Parent node
 * @param {TraceModel} trace - Trace model
 * @param {SequenceConfig} config - Configuration
 */
function renderCallStart(lines, child, parent, trace, config) {
  const parentId = escapeMermaidId(getComponentId(parent, trace));
  const childId = escapeMermaidId(getComponentId(child, trace));
  const operation = child.description?.operation || child.span.name || "";

  // Determine if sync or async (simplified - could be enhanced)
  const isSync = true; // Default to sync, could check span kind or attributes

  const escapedOperation = escapeMermaid(operation);

  console.log(`[renderCallStart] ${parentId} -> ${childId}: ${escapedOperation}`);

  if (isSync) {
    lines.push(
      `    ${parentId}->>+${childId}: ${escapedOperation}`
    );
  } else {
    if (config.showAsync) {
      lines.push(`    box async`);
    }
    lines.push(
      `    ${parentId}-->>+${childId}: ${escapedOperation}`
    );
  }
}

/**
 * Renders a call end (response)
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} child - Child node
 * @param {TraceSpanNode} parent - Parent node
 * @param {TraceModel} trace - Trace model
 * @param {SequenceConfig} config - Configuration
 */
function renderCallEnd(lines, child, parent, trace, config) {
  const parentId = escapeMermaidId(getComponentId(parent, trace));
  const childId = escapeMermaidId(getComponentId(child, trace));
  const response = child.description?.operation || "return";

  const isSync = true; // Default to sync

  const escapedResponse = escapeMermaid(response);

  console.log(`[renderCallEnd] ${childId} -> ${parentId}: ${escapedResponse}`);

  if (isSync) {
    lines.push(
      `    ${childId}-->>-${parentId}: ${escapedResponse}`
    );
  } else {
    if (config.showAsync) {
      lines.push(`    end`);
    }
  }
}

/**
 * Renders attributes as notes
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} node - Node to render attributes for
 * @param {TraceModel} trace - Trace model (for getting component ID)
 * @param {SequenceConfig} config - Configuration
 */
function renderAttributes(lines, node, trace, config) {
  if (!config.showAttributes) {
    return;
  }

  const componentId = escapeMermaidId(getComponentId(node, trace));

  const attributes = [];
  if (node.span.attributes && Array.isArray(node.span.attributes)) {
    node.span.attributes.forEach((attr) => {
      const key = attr.key || "";
      const value = formatAttributeValue(attr.value);
      attributes.push(`${key}: ${value}`);
    });
  }
  /*
    if (attributes.length > 0) {
      // Use actual newlines (\n) which escapeMermaid will convert to <br/>
      // Mermaid doesn't support **bold** markdown, so use uppercase for emphasis
      const noteText = `ATTRIBUTES\n${attributes.join("\n")}`;
      const escapedNote = escapeMermaid(noteText);
      lines.push(`    Note over ${componentId}: ${escapedNote}`);
      console.log(`[renderAttributes] Added note over participant ID: ${componentId} (component.id lookup result)`);
    }
 
  // Special handling for HTTP URL
  const httpUrl = getSpanAttribute(node.span, "http.url");
  if (httpUrl) {
    // Use actual newline (\n) which escapeMermaid will convert to <br/>
    const escapedUrl = escapeMermaid(`URL\n${httpUrl}`);
    lines.push(`    Note over ${componentId}: ${escapedUrl}`);
  }

  // Special handling for SQL statements
  const sql = getSpanAttribute(node.span, "db.statement");
  if (sql) {
    // Use actual newline (\n) which escapeMermaid will convert to <br/>
    const escapedSql = escapeMermaid(`STATEMENT\n${sql}`);
    lines.push(`    Note over ${componentId}: ${escapedSql}`);
  }
     */
}

/**
 * Renders logs as notes
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} node - Node to render logs for
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @param {TraceModel} trace - Trace model (for getting component ID)
 * @param {SequenceConfig} config - Configuration
 */
function renderLogs(lines, node, startTime, endTime, trace, config) {
  if (!config.showLogs || !node.logs || !Array.isArray(node.logs)) {
    return;
  }

  // Filter logs by time range and exclude span/event logs
  const filteredLogs = node.logs.filter((log) => {
    const logTime = toNumberTimestamp(log.timeUnixNano);
    const severity = log.severityText?.toLowerCase() || "";
    return (
      logTime >= startTime &&
      logTime < endTime &&
      severity !== "span" &&
      severity !== "event" &&
      severity !== "diagnostics"
    );
  });

  if (filteredLogs.length === 0) {
    return;
  }

  const logTexts = [];
  filteredLogs.forEach((log) => {
    const text = formatLog(log);
    if (text) {
      logTexts.push(text);
    }
  });

  /*
  // Limit log length
  const logsText = logTexts.join("\n").substring(0, 600);
  if (logsText) {
    const componentId = escapeMermaidId(getComponentId(node, trace));
    // Use actual newline (\n) which escapeMermaid will convert to <br/>
    // Mermaid doesn't support **bold** markdown, so use uppercase for emphasis
    const escapedLogs = escapeMermaid(`LOGS\n${logsText}`);
    lines.push(`    Note over ${componentId}: ${escapedLogs}`);
    console.log(`[renderLogs] Added logs note over ${componentId}`);
  }
    */

  // Render error logs separately
  renderErrorLogs(lines, node, startTime, endTime, trace, config);
}

/**
 * Renders error logs as notes
 * @param {string[]} lines - Output lines array
 * @param {TraceSpanNode} node - Node to render error logs for
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @param {TraceModel} trace - Trace model (for getting component ID)
 * @param {SequenceConfig} config - Configuration
 */
function renderErrorLogs(lines, node, startTime, endTime, trace, config) {
  if (!config.showLogs || !node.logs || !Array.isArray(node.logs)) {
    return;
  }

  const errorLogs = node.logs.filter((log) => {
    const logTime = toNumberTimestamp(log.timeUnixNano);
    const severity = log.severityText?.toLowerCase() || "";
    return (
      logTime >= startTime &&
      logTime < endTime &&
      (severity === "error" || log.severityNumber >= 17)
    );
  });

  if (errorLogs.length === 0) {
    return;
  }

  const errorTexts = [];
  errorLogs.forEach((log) => {
    const text = formatLogWithAttributes(log);
    if (text) {
      errorTexts.push(text);
    }
  });

  /*
  const errorsText = errorTexts.join("\n").substring(0, 600);
  if (errorsText) {
    const componentId = escapeMermaidId(getComponentId(node, trace));
    // Use actual newline (\n) which escapeMermaid will convert to <br/>
    // Mermaid doesn't support **bold** markdown, so use uppercase for emphasis
    const escapedErrors = escapeMermaid(`ERRORS\n${errorsText}`);
    lines.push(
      `    Note over ${componentId}: ${escapedErrors}`
    );
    console.log(`[renderErrorLogs] Added error note over ${componentId}`);
  }
    */
}

/**
 * Formats a log entry for display
 * @param {import("./logs.js").LogRow} log
 * @returns {string}
 */
function formatLog(log) {
  const template = log.template || "";
  // Simple formatting - could be enhanced with attribute substitution
  return template;
}

/**
 * Formats a log entry with attributes
 * @param {import("./logs.js").LogRow} log
 * @returns {string}
 */
function formatLogWithAttributes(log) {
  let text = formatLog(log);
  if (log.attributes && Array.isArray(log.attributes)) {
    const attrs = log.attributes
      .map((attr) => {
        const key = attr.key || "";
        const value = formatAttributeValue(attr.value);
        return `${key}: ${value}`;
      })
      .join(", ");
    if (attrs) {
      text += ` (${attrs})`;
    }
  }
  return text;
}

/**
 * Gets a span attribute value
 * @param {import("./trace.js").TraceSpan} span
 * @param {string} key
 * @returns {string}
 */
function getSpanAttribute(span, key) {
  if (!span.attributes || !Array.isArray(span.attributes)) {
    return "";
  }
  const attr = span.attributes.find((a) => a.key === key);
  if (!attr || !attr.value) {
    return "";
  }
  if (typeof attr.value === "string") {
    return attr.value;
  }
  if (attr.value && typeof attr.value === "object" && "value" in attr.value) {
    return String(attr.value.value || "");
  }
  return String(attr.value || "");
}

/**
 * Formats an attribute value for display
 * @param {any} value
 * @returns {string}
 */
function formatAttributeValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "value" in value) {
    return String(value.value || "");
  }
  return String(value || "");
}

/**
 * Converts timestamp to number
 * @param {number|bigint} value
 * @returns {number}
 */
function toNumberTimestamp(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseFloat(value) || 0;
}

/**
 * Escapes special characters for Mermaid syntax (for labels and text)
 * Mermaid sequence diagrams support <br/> for line breaks but NOT HTML tags like <b> for bold
 * @param {string} text
 * @returns {string}
 */
// escapeMermaid and escapeMermaidId are now imported from core/strings.js

/**
 * Initializes the sequence diagram viewer component
 * @param {HTMLElement} host - Container element for the diagram
 * @param {import("./trace.js").TraceSpan[]} spans - Trace spans
 * @param {SequenceConfig=} config - Configuration options
 * @returns {{ render: () => void, update: () => void }}
 */
export function initSequenceDiagram(host, spans, config = {}) {
  console.log("[initSequenceDiagram] Called, host:", host);
  if (!host) {
    console.log("[initSequenceDiagram] No host, returning empty functions");
    return { render: () => { }, update: () => { } };
  }

  // Import trace building function
  let trace = null;
  let mermaidDiagram = "";

  const render = async () => {
    if (!spans || spans.length === 0) {
      host.innerHTML = "<p>No trace data available</p>";
      return;
    }

    try {
      // Import and build trace model
      const traceModule = await import("./trace.js");
      const { buildTraceModel, ensureSampleLogRowsLoaded } = traceModule;

      // Ensure log rows are loaded (already loaded by appendLogsFromSpans)
      await ensureSampleLogRowsLoaded();

      // Get log rows via the sampleData module (same as trace viewer does)
      const { sampleLogRows } = await import("./sampleData.js");

      // Build trace model with logs merged
      trace = buildTraceModel(spans, sampleLogRows);

      // Generate Mermaid diagram
      mermaidDiagram = generateSequenceDiagram(trace, config);

      // Log the generated Mermaid diagram for debugging
      console.log("[initSequenceDiagram] Generated Mermaid diagram:");
      console.log("=".repeat(80));
      console.log(mermaidDiagram);
      console.log("=".repeat(80));

      // Render Mermaid diagram
      host.innerHTML = `<div class="mermaid">${mermaidDiagram}</div>`;

      // Initialize Mermaid if available
      if (typeof mermaid !== "undefined") {
        console.log("[initSequenceDiagram] Initializing Mermaid with theme:", config.theme || "dark");

        // Get CSS variables for styling
        const rootStyles = getComputedStyle(document.documentElement);
        const surface2 = rootStyles.getPropertyValue('--ui-surface').trim() || '#1e2129';
        const borderColor = rootStyles.getPropertyValue('--ui-border').trim() || rootStyles.getPropertyValue('--border').trim() || '#3a3a3a';

        console.log("[initSequenceDiagram] Note styling - surface:", surface2, "border:", borderColor);

        mermaid.initialize({
          startOnLoad: true,
          theme: config.theme || "dark",
          themeVariables: {
            // Set main background to surface
            mainBkg: surface2,
            // Set actor fill to transparent so we can control it
            actorBkg: 'transparent',
            actorBorder: '#81B1DB',
            // Style notes with surface and border variables
            noteBkgColor: surface2,
            noteBorderColor: borderColor,
            noteTextColor: '#ffffff',
          },
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35,
            noteAlign: 'left', // Left-align note text
            noteFontSize: '12px', // Smaller font for notes
            noteFontWeight: 'normal', // Normal weight instead of bold
            fontSize: 14, // Overall font size for the diagram
          }
        });
        console.log("[initSequenceDiagram] Calling mermaid.contentLoaded()");

        // Render the Mermaid diagram
        mermaid.contentLoaded();

        // Apply colors to participant headers after rendering
        setTimeout(() => {
          applyParticipantColors(host, trace);
        }, 100);
      } else {
        console.warn("[initSequenceDiagram] Mermaid.js not loaded. Include mermaid.js script.");
      }
    } catch (error) {
      console.error("[initSequenceDiagram] Error rendering diagram:", error);
      host.innerHTML = `<p>Error rendering sequence diagram: ${error.message}</p>`;
    }
  };

  const update = () => {
    // Re-apply colors when palette changes (faster than full re-render)
    if (trace) {
      console.log("[initSequenceDiagram] Updating participant colors");
      applyParticipantColors(host, trace);
    } else {
      // If trace not built yet, do full render
      render();
    }
  };

  // Initial render
  render();

  return { render, update };
}

