/**
 * Gravibe Sequence Diagram Generator
 * Generates Mermaid sequence diagrams from trace metamodel data.
 * Based on TraceLens.Server/generators/PlantUml/SequenceGenerator.cs
 */

import { createComponentKey } from "./metaModel.js";

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
  showAsync: false,
  showRecursion: false,
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
    renderChildren(lines, root, trace, cfg);
  });

  const diagram = lines.join("\n");
  console.log(`[generateSequenceDiagram] Generated diagram with ${lines.length} lines`);
  
  return diagram;
}

/**
 * Renders participants (components) from the metamodel
 * @param {string[]} lines - Output lines array
 * @param {TraceModel} trace - Trace model
 */
function renderParticipants(lines, trace) {
  // Track which components have been rendered to avoid duplicates
  const renderedComponentIds = new Set();
  
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
      lines.push(`    box ${groupName}`);
      
      groupComponents.forEach((component) => {
        // Only render if not already rendered
        if (!renderedComponentIds.has(component.id)) {
          const declaration = getComponentDeclaration(component);
          if (declaration) {
            lines.push(`        ${declaration}`);
            renderedComponentIds.add(component.id);
            console.log(`[renderParticipants] Added participant to group ${groupName}: ${declaration} (component.groupId: "${component.groupId}", id: ${component.id})`);
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

    if (!parentDesc || !childDesc) {
      renderChildren(lines, child, trace, config);
      return;
    }

    const parentComponentId = getComponentId(parent, trace);
    const childComponentId = getComponentId(child, trace);

    // Check if this is a client call (flatten) - render inline
    if (childDesc.isClient) {
      if (config.showAttributes) {
        renderAttributes(lines, child, trace, config);
      }
      renderChildren(lines, child, trace, config);
    } else {
      // Regular call - show as participant interaction
      const isRecursion = parentComponentId === childComponentId;

      if (!isRecursion || config.showRecursion) {
        renderCallStart(lines, child, parent, trace, config);
      }

      if (config.showAttributes) {
        renderAttributes(lines, child, trace, config);
      }

      renderChildren(lines, child, trace, config);

      if (!isRecursion || config.showRecursion) {
        renderCallEnd(lines, child, parent, trace, config);
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

  const componentId = createComponentKey(
    node.description.groupName || "",
    node.description.componentName || ""
  );

  const exists = trace.components.has(componentId);
  if (!exists) {
    console.warn(`[getComponentId] Component ${componentId} not found in trace.components (groupName: "${node.description.groupName}", componentName: "${node.description.componentName}")`);
  }
  
  return exists ? componentId : "unknown";
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
function escapeMermaid(text) {
  if (!text) {
    return "";
  }
  return String(text)
    .replace(/"/g, '&quot;')
    .replace(/\n/g, "<br/>")  // Convert newlines to <br/> tags (Mermaid supports this)
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/=/g, "&#61;");
  // Note: Mermaid does NOT support <b>bold</b> or other HTML formatting tags in sequence diagrams
  // Markdown **bold** also doesn't work - use uppercase text for emphasis instead
}

/**
 * Escapes special characters for Mermaid ID (alphanumeric + underscore only)
 * @param {string} id
 * @returns {string}
 */
function escapeMermaidId(id) {
  if (!id) {
    return "unknown";
  }
  // Mermaid IDs should be alphanumeric and underscores only
  // Replace colons, spaces, and other special chars with underscores
  return String(id)
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&"); // Cannot start with a number
}

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
    return { render: () => {}, update: () => {} };
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
        mermaid.initialize({ 
          startOnLoad: true,
          theme: config.theme || "dark",
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
          }
        });
        console.log("[initSequenceDiagram] Calling mermaid.contentLoaded()");
        mermaid.contentLoaded();
      } else {
        console.warn("[initSequenceDiagram] Mermaid.js not loaded. Include mermaid.js script.");
      }
    } catch (error) {
      console.error("[initSequenceDiagram] Error rendering diagram:", error);
      host.innerHTML = `<p>Error rendering sequence diagram: ${error.message}</p>`;
    }
  };

  const update = () => {
    // Re-render if needed (e.g., when palette changes)
    render();
  };

  // Initial render
  render();

  return { render, update };
}

