/**
 * Gravibe Trace Explorer Toolkit
 * Provides a lightweight data model that mirrors OpenTelemetry trace spans and
 * utilities to render a nested trace timeline inspired by the official proto
 * definitions.
 */

import { normalizeAnyValue, createLogAttribute, formatNanoseconds, resolveSeverityGroup, abbreviateLogLevel, buildTemplateFragment, createMetaSection, createLogCard } from "./logs.js";
import { createAttributeTable } from "./attributes.js";
import { hexToRgba } from "../core/colors.js";
import { getColorKeyFromNode } from "../core/identity.js";
import { ComponentKind, extractSpanDescription, createComponentKey, normalizeServiceAndGroup } from "./metaModel.js";
import { renderTracePreview } from "./tracePreview.js";
import { h, setStyles, setAttrs } from "../core/dom.js";
import { createViewState, pruneInvalidState, ensureChildrenExpanded, pruneDescendantState as pruneDescendantStateFromManager } from "../core/stateManager.js";
import { renderSpanSummary } from "./components/spanSummary.js";
import { renderSpanLogs } from "./components/spanLogs.js";
import { renderSpanNode } from "./components/spanNode.js";
import { renderTraceHeader } from "./components/traceHeader.js";

// Lazy import for sampleLogRows to avoid circular dependency with sampleData.js
// sampleData.js imports from trace.js, so we can't import it at module level
let _sampleLogRowsModule = null;
let _sampleLogRowsPromise = null;

// Pre-load sampleLogRows module after module initialization to break circular dependency
// Use queueMicrotask to ensure this runs after current module finishes loading
queueMicrotask(async () => {
  try {
    const module = await import("./sampleData.js");
    _sampleLogRowsModule = module;
  } catch (e) {
    console.error("[trace.js] Failed to load sampleLogRows module:", e);
  }
});

/**
 * Ensures sampleLogRows module is loaded and returns the logs array
 * This function will wait for the module to load if it hasn't been loaded yet
 * Note: This is synchronous and will return empty array if module not yet loaded
 * For async loading, use ensureSampleLogRowsLoaded() instead
 */
function getSampleLogRows() {
  // If we have the module cached, always return the current array reference
  // This ensures we get the same array that appendLogsFromSpans modifies
  if (_sampleLogRowsModule) {
    return _sampleLogRowsModule.sampleLogRows;
  }
  // Trigger load if not already started
  if (!_sampleLogRowsPromise) {
    _sampleLogRowsPromise = import("./sampleData.js").then((module) => {
      _sampleLogRowsModule = module;
      return module.sampleLogRows;
    }).catch((e) => {
      console.error("[trace.js] Failed to load sampleLogRows:", e);
      _sampleLogRowsModule = null;
      return [];
    });
  }
  // Return empty array if not loaded yet - will be populated after async load
  // The caller should ensure ensureSampleLogRowsLoaded() is called before render
  return [];
}

/**
 * Ensures sampleLogRows module is loaded asynchronously
 * Call this before initializing trace viewer to ensure logs are available
 */
export async function ensureSampleLogRowsLoaded() {
  if (_sampleLogRowsModule) {
    return _sampleLogRowsModule.sampleLogRows;
  }
  if (!_sampleLogRowsPromise) {
    _sampleLogRowsPromise = import("./sampleData.js").then((module) => {
      _sampleLogRowsModule = module;
      return module.sampleLogRows;
    }).catch((e) => {
      console.error("[trace.js] Failed to load sampleLogRows:", e);
      _sampleLogRowsModule = null;
      return [];
    });
  }
  return await _sampleLogRowsPromise;
}

/**
 * @typedef {ReturnType<typeof createTraceSpan>} TraceSpan
 * @typedef {ReturnType<typeof createTraceEvent>} TraceEvent
 * @typedef {import("./logs.js").LogRow} LogRow
 * @typedef {{ id: string, name: string }} Group
 * @typedef {{ id: string, name: string, groupId: string, kind: string, componentStack: string, serviceName?: string, entrypointType?: number }} Component
 * @typedef {{ groupName: string, componentName: string, operation: string, componentKind: string, componentStack: string, isClient?: boolean, entrypointType?: number }} SpanDescription
 * @typedef {{ traceId: string, startTimeUnixNano: number, endTimeUnixNano: number, durationNano: number, spanCount: number, roots: TraceSpanNode[], serviceNameMapping: Map<string, number>, groups: Map<string, Group>, components: Map<string, Component> }} TraceModel
 * @typedef {{ span: TraceSpan, depth: number, children: TraceSpanNode[], description?: SpanDescription, logs?: LogRow[], events?: TraceEvent[] }} TraceSpanNode
 */

export const SpanKind = Object.freeze({
  INTERNAL: "SPAN_KIND_INTERNAL",
  SERVER: "SPAN_KIND_SERVER",
  CLIENT: "SPAN_KIND_CLIENT",
  PRODUCER: "SPAN_KIND_PRODUCER",
  CONSUMER: "SPAN_KIND_CONSUMER",
});


/**
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.spanId
 * @param {string} params.traceId
 * @param {string=} params.parentSpanId
 * @param {SpanKind=} params.kind
 * @param {number|bigint} params.startTimeUnixNano
 * @param {number|bigint} params.endTimeUnixNano
 * @param {Array<{ key: string, value: import("./logs.js").LogAnyValue | Record<string, any> }>=} params.attributes
 * @param {TraceEvent[]=} params.events
 * @param {{ code: "STATUS_CODE_OK"|"STATUS_CODE_ERROR"|"STATUS_CODE_UNSET", message?: string }=} params.status
 * @param {{ name?: string, version?: string }=} params.instrumentationScope
 * @param {{ serviceName?: string, serviceNamespace?: string }=} params.resource
 * @returns {TraceSpan}
 */
export function createTraceSpan({
  name,
  spanId,
  traceId,
  parentSpanId = "",
  kind = SpanKind.INTERNAL,
  startTimeUnixNano,
  endTimeUnixNano,
  attributes = [],
  events = [],
  status = { code: "STATUS_CODE_UNSET" },
  instrumentationScope = {},
  resource = {},
}) {
  return {
    name,
    spanId,
    traceId,
    parentSpanId,
    kind,
    startTimeUnixNano,
    endTimeUnixNano,
    attributes: attributes.map(({ key, value, description = "" }) =>
      createLogAttribute(key, value, description)
    ),
    events,
    status,
    instrumentationScope,
    resource,
  };
}

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {number|bigint} params.timeUnixNano
 * @param {Array<{ key: string, value: import("./logs.js").LogAnyValue | Record<string, any> }>=} params.attributes
 * @returns {TraceEvent}
 */
export function createTraceEvent({ name, timeUnixNano, attributes = [] }) {
  return {
    name,
    timeUnixNano,
    attributes: attributes.map(({ key, value, description = "" }) =>
      createLogAttribute(key, value, description)
    ),
  };
}

export function toNumberTimestamp(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseFloat(value) || 0;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Collects unique service names from span nodes and creates an index mapping.
 * Uses groupName from description if available, otherwise falls back to serviceName from resource.
 * @param {Map<string, TraceSpanNode>} spanNodes - Map of span nodes with descriptions
 * @returns {Map<string, number>} Map from service name to index
 */
function buildServiceNameMapping(spanNodes) {
  const serviceNames = new Set();
  spanNodes.forEach((node) => {
    const serviceName = getColorKeyFromNode(node);
    serviceNames.add(serviceName);
  });

  const serviceArray = Array.from(serviceNames).sort();
  const mapping = new Map();
  serviceArray.forEach((name, index) => {
    mapping.set(name, index);
  });
  return mapping;
}



  /**
   * Creates virtual log entries for a span (span start, events as logs, span end).
   * These virtual logs represent span lifecycle and events in log format.
   * @param {TraceSpan} span
   * @returns {LogRow[]}
   */
function createVirtualSpanLogs(span) {
    const virtualLogs = [];

    // Convert the span start to a log row format
    const spanStartLog = {
      id: `span-start-${span.spanId}`,
      template: `Span start : ${span.name}`,
      timeUnixNano: span.startTimeUnixNano,
      severityNumber: undefined,
      severityText: "span",
      body: undefined,
      attributes: span.attributes || [],
      droppedAttributesCount: undefined,
      flags: undefined,
      traceId: span.traceId,
      spanId: span.spanId,
      observedTimeUnixNano: undefined,
    };
    virtualLogs.push(spanStartLog);

    // Convert span events to log row format
    const eventLogs = (span.events || []).map((event, index) => {
      return {
        id: `event-${span.spanId}-${index}`,
        template: event.name,
        timeUnixNano: event.timeUnixNano,
        severityNumber: undefined,
        severityText: "event",
        body: undefined,
        attributes: event.attributes || [],
        droppedAttributesCount: undefined,
        flags: undefined,
        traceId: span.traceId,
        spanId: span.spanId,
        observedTimeUnixNano: undefined,
      };
    });
    virtualLogs.push(...eventLogs);

    // Convert the span end to a log row format (if span has status)
    if (span.status?.code && span.status.code !== "STATUS_CODE_UNSET") {
      const statusText = span.status.message
        ? `${span.status.code.replace("STATUS_CODE_", "")}: ${span.status.message}`
        : span.status.code.replace("STATUS_CODE_", "");
      // Use "error" severity for spans with error status, otherwise "span"
      const severityText = span.status.code === "STATUS_CODE_ERROR" ? "error" : "span";
      const spanEndLog = {
        id: `span-end-${span.spanId}`,
        template: `Span ended : ${span.name}, status: ${statusText}`,
        timeUnixNano: span.endTimeUnixNano,
        severityNumber: undefined,
        severityText: severityText,
        body: undefined,
        attributes: [],
        droppedAttributesCount: undefined,
        flags: undefined,
        traceId: span.traceId,
        spanId: span.spanId,
        observedTimeUnixNano: undefined,
      };
      virtualLogs.push(spanEndLog);
    }

    return virtualLogs;
}

/**
 * Builds a map of spanId -> log rows for efficient lookup.
 * This includes regular logs AND virtual logs (span start, events as logs, span end).
 * @param {TraceSpan[]} spans - Array of spans
 * @param {LogRow[]=} logRows - Optional array of log rows
 * @returns {Map<string, LogRow[]>} Map from span ID to log rows
 */
function buildLogsMap(spans, logRows = null) {
  const logsBySpanId = new Map();
  
  // Add regular logs from logRows
  if (Array.isArray(logRows)) {
    logRows.forEach((logRow) => {
      if (logRow.spanId) {
        if (!logsBySpanId.has(logRow.spanId)) {
          logsBySpanId.set(logRow.spanId, []);
        }
        logsBySpanId.get(logRow.spanId).push(logRow);
      }
    });
  }

  // Ensure virtual logs (span start, events, span end) are included for each span
  // These may already be in logRows from appendLogsFromSpans(), but we ensure they're present
  spans.forEach((span) => {
    const spanId = span.spanId;
    if (!logsBySpanId.has(spanId)) {
      logsBySpanId.set(spanId, []);
    }
    const existingLogs = logsBySpanId.get(spanId);

    // Check if virtual logs are already present by looking for span-start log
    const hasSpanStart = existingLogs.some(log => log.id === `span-start-${spanId}`);

    if (!hasSpanStart) {
      // Create virtual logs for this span if they're not already present
      const virtualLogs = createVirtualSpanLogs(span);
      existingLogs.push(...virtualLogs);
    }
  });

  return logsBySpanId;
}

/**
 * Extracts groups and components from spans.
 * @param {TraceSpan[]} spans - Array of spans
 * @returns {{groups: Map<string, Group>, components: Map<string, Component>}} Groups and components maps
 */
function buildGroupsAndComponents(spans) {
  const groups = new Map();
  const components = new Map();

  spans.forEach((span) => {
    // Extract span description using extractors
    const serviceName = span.resource?.serviceName || "unknown-service";
    const description = extractSpanDescription(span, serviceName);

    // Normalize group and component names using shared normalizer
    const { groupName, componentName } = normalizeServiceAndGroup(description);

    // Create or get group
    const groupId = groupName || "";
    if (groupId && !groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        name: groupName,
      });
    }

    // Create or get component
    const componentId = createComponentKey(groupName, componentName);
    if (!components.has(componentId)) {
      components.set(componentId, {
        id: componentId,
        name: componentName,
        groupId: groupId,
        kind: description.componentKind,
        componentStack: description.componentStack || "",
        serviceName: serviceName, // Store service name for coloring participant headers
        entrypointType: description.entrypointType || 2, // Default to internal (2)
      });
    }
  });

  return { groups, components };
}

/**
 * Builds span nodes from spans and constructs the tree structure.
 * @param {TraceSpan[]} spans - Array of spans
 * @param {Map<string, LogRow[]>} logsBySpanId - Map from span ID to log rows
 * @returns {{spanNodes: Map<string, TraceSpanNode>, roots: TraceSpanNode[]}} Span nodes map and root nodes
 */
function buildSpanNodes(spans, logsBySpanId) {
  const spanNodes = new Map();

  // Create span nodes from spans
  spans.forEach((span) => {
    // Extract span description using extractors
    const serviceName = span.resource?.serviceName || "unknown-service";
    const description = extractSpanDescription(span, serviceName);

    // Look up logs for this span (includes regular logs + virtual logs: span start, events as logs, span end)
    const spanLogs = logsBySpanId.get(span.spanId) || [];

    // Get events from span (original events - also available as logs in spanLogs)
    // We store both:
    // - node.logs: all log entries (regular + virtual span start/end + events as logs)
    // - node.events: original events from span.events (for direct event access)
    const spanEvents = span.events || [];

    // Store description, logs (including virtual logs), and events in node
    spanNodes.set(span.spanId, {
      span,
      depth: 0,
      children: [],
      description,
      logs: spanLogs,
      events: spanEvents,
    });
  });

  // Build tree structure
  const roots = [];
  spanNodes.forEach((node) => {
    const parentId = node.span.parentSpanId;
    if (parentId && spanNodes.has(parentId)) {
      const parentNode = spanNodes.get(parentId);
      node.depth = parentNode.depth + 1;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by start time
  const sortChildren = (node) => {
    node.children.sort(
      (a, b) =>
        toNumberTimestamp(a.span.startTimeUnixNano) -
        toNumberTimestamp(b.span.startTimeUnixNano)
    );
    node.children.forEach((child) => sortChildren(child));
  };

  roots.sort(
    (a, b) =>
      toNumberTimestamp(a.span.startTimeUnixNano) -
      toNumberTimestamp(b.span.startTimeUnixNano)
  );
  roots.forEach((root) => sortChildren(root));

  return { spanNodes, roots };
}

/**
 * Builds a hierarchical trace model so spans become aware of their children
 * without mutating the original span definitions.
 * 
 * During build, this function:
 * - Extracts span descriptions to build groups and components
 * - Merges logs and events into span nodes (same lookup as trace component used to do)
 * - Creates virtual logs for span start, events (as logs), and span end if not already present
 * - Builds the hierarchical tree structure
 * 
 * @param {TraceSpan[]} spans
 * @param {LogRow[]=} logRows - Optional array of log rows to merge into span nodes.
 *   Should include regular logs + virtual logs (span start, events as logs, span end).
 *   If virtual logs are missing, they will be created automatically during build.
 * @returns {TraceModel}
 */
export function buildTraceModel(spans, logRows = null) {
  if (!Array.isArray(spans) || spans.length === 0) {
    return {
      traceId: "",
      startTimeUnixNano: 0,
      endTimeUnixNano: 0,
      durationNano: 0,
      spanCount: 0,
      roots: [],
      serviceNameMapping: new Map(),
      groups: new Map(),
      components: new Map(),
    };
  }

  // Build logs map (includes virtual logs)
  const logsBySpanId = buildLogsMap(spans, logRows);

  // Extract groups and components
  const { groups, components } = buildGroupsAndComponents(spans);

  // Build span nodes and tree structure
  const { spanNodes, roots } = buildSpanNodes(spans, logsBySpanId);

  // Calculate trace time bounds
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  let traceId = spans[0].traceId;
  
  spans.forEach((span) => {
    const start = toNumberTimestamp(span.startTimeUnixNano);
    const end = toNumberTimestamp(span.endTimeUnixNano);
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
    traceId = span.traceId || traceId;
  });

  // Build service name mapping
  const serviceNameMapping = buildServiceNameMapping(spanNodes);
  console.log(serviceNameMapping);

  const startTimeUnixNano = Number.isFinite(minStart) ? minStart : 0;
  const endTimeUnixNano = Number.isFinite(maxEnd) ? maxEnd : startTimeUnixNano;

  return {
    traceId,
    startTimeUnixNano,
    endTimeUnixNano,
    durationNano: Math.max(endTimeUnixNano - startTimeUnixNano, 0),
    spanCount: spans.length,
    roots,
    serviceNameMapping,
    groups,
    components,
  };
}

export function validateTraceSpans(spans) {
  const result = { errors: [], warnings: [] };

  if (!Array.isArray(spans)) {
    result.errors.push({ level: "error", message: "Trace data must be an array of spans." });
    return result;
  }

  const spanIds = new Set();
  const traceIds = new Set();

  spans.forEach((span, index) => {
    const context = span?.spanId ? `Span "${span.spanId}"` : `Span @ index ${index}`;

    if (!span || typeof span !== "object") {
      result.errors.push({ level: "error", message: `${context}: Span must be an object.` });
      return;
    }

    if (!span.spanId) {
      result.errors.push({ level: "error", message: `${context}: Missing spanId.` });
    } else if (spanIds.has(span.spanId)) {
      result.errors.push({ level: "error", message: `${context}: Duplicate spanId detected.` });
    } else {
      spanIds.add(span.spanId);
    }

    if (!span.traceId) {
      result.errors.push({ level: "error", message: `${context}: Missing traceId.` });
    } else {
      traceIds.add(span.traceId);
    }

    if (!span.name) {
      result.errors.push({ level: "error", message: `${context}: Missing span name.` });
    }

    const start = toNumberTimestamp(span.startTimeUnixNano);
    const end = toNumberTimestamp(span.endTimeUnixNano);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      result.errors.push({ level: "error", message: `${context}: Invalid start or end timestamp.` });
    } else if (end < start) {
      result.errors.push({ level: "error", message: `${context}: endTimeUnixNano occurs before startTimeUnixNano.` });
    }

    if (span.parentSpanId && span.parentSpanId === span.spanId) {
      result.errors.push({ level: "error", message: `${context}: span cannot be its own parent.` });
    }

    const attributes = Array.isArray(span.attributes) ? span.attributes : [];
    const attributeKeys = new Set();
    attributes.forEach((attribute, attrIndex) => {
      if (!attribute || typeof attribute !== "object") {
        result.errors.push({ level: "error", message: `${context}: Attribute at index ${attrIndex} must be an object.` });
        return;
      }
      if (!attribute.key) {
        result.errors.push({ level: "error", message: `${context}: Attribute at index ${attrIndex} is missing key.` });
      } else if (attributeKeys.has(attribute.key)) {
        result.warnings.push({ level: "warning", message: `${context}: Duplicate attribute key "${attribute.key}".` });
      } else {
        attributeKeys.add(attribute.key);
      }
    });

    const events = Array.isArray(span.events) ? span.events : [];
    events.forEach((event, eventIndex) => {
      if (!event || typeof event !== "object") {
        result.errors.push({ level: "error", message: `${context}: Event at index ${eventIndex} must be an object.` });
        return;
      }
      const eventTime = toNumberTimestamp(event.timeUnixNano);
      if (!Number.isFinite(eventTime)) {
        result.warnings.push({ level: "warning", message: `${context}: Event @${eventIndex} has invalid timestamp.` });
      } else if (eventTime < start || eventTime > end) {
        result.warnings.push({ level: "warning", message: `${context}: Event "${event.name ?? eventIndex}" is outside the span time window.` });
      }
    });
  });

  if (traceIds.size > 1) {
    result.warnings.push({ level: "warning", message: "Multiple traceIds detected in span collection." });
  }

  return result;
}

function renderValidationBanner(host, validation) {
  const hasErrors = validation.errors?.length;
  const hasWarnings = validation.warnings?.length;
  if (!hasErrors && !hasWarnings) {
    return;
  }

  const banner = h('section', { className: 'validation-banner' });

  const title = h('h3', {
    className: 'validation-banner__title',
    textContent: hasErrors ? "Trace validation issues" : "Trace validation warnings"
  });
  banner.append(title);

  const list = h('ul', { className: 'validation-banner__list' });
  const entries = [...(validation.errors ?? []), ...(validation.warnings ?? [])];
  entries.forEach((issue) => {
    const item = h('li', {
      className: `validation-banner__item validation-banner__item--${issue.level}`,
      textContent: issue.message
    });
    list.append(item);
  });

  host.append(banner);
}

/**
 * Computes percentage offsets for rendering a span bar relative to the trace
 * duration. Returns values between 0 and 100.
 * @param {TraceModel} trace
 * @param {TraceSpan} span
 */
export function computeSpanOffsets(trace, span, timeWindow = { start: 0, end: 100 }) {
  const totalDuration = trace.durationNano ||
    Math.max(
      toNumberTimestamp(trace.endTimeUnixNano) -
      toNumberTimestamp(trace.startTimeUnixNano),
      1
    );

  const startOffset =
    toNumberTimestamp(span.startTimeUnixNano) - trace.startTimeUnixNano;
  const endOffset =
    toNumberTimestamp(span.endTimeUnixNano) - trace.startTimeUnixNano;

  const startPercent = clamp(startOffset / totalDuration, 0, 1) * 100;
  const endPercent = clamp(endOffset / totalDuration, 0, 1) * 100;

  // Apply time window filter - remap to window range
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const windowWidth = windowEnd - windowStart;

  // If span is outside the window, return zero width
  if (endPercent < windowStart || startPercent > windowEnd) {
    return {
      startPercent: 0,
      widthPercent: 0,
      endPercent: 0,
    };
  }

  // Clamp span to window boundaries
  const clampedStart = Math.max(startPercent, windowStart);
  const clampedEnd = Math.min(endPercent, windowEnd);

  // Remap to 0-100% relative to the window
  const remappedStart = ((clampedStart - windowStart) / windowWidth) * 100;
  const remappedEnd = ((clampedEnd - windowStart) / windowWidth) * 100;
  const width = Math.max(remappedEnd - remappedStart, 0);

  return {
    startPercent: remappedStart,
    widthPercent: width,
    endPercent: remappedEnd,
  };
}

export function formatDurationNano(duration) {
  if (!Number.isFinite(duration) || duration < 0) {
    return "0 ns";
  }
  if (duration >= 1e9) {
    return `${(duration / 1e9).toFixed(2)} s`;
  }
  if (duration >= 1e6) {
    return `${(duration / 1e6).toFixed(2)} ms`;
  }
  if (duration >= 1e3) {
    return `${(duration / 1e3).toFixed(2)} μs`;
  }
  return `${duration.toFixed(0)} ns`;
}

export function formatTimestamp(value) {
  const date = new Date(toNumberTimestamp(value) / 1e6);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(date);
}

function renderSpanEvents(events) {
  if (!events || events.length === 0) {
    return null;
  }
  const wrapper = h('div', { className: 'trace-span-events' });

  const heading = h('h4', { textContent: 'Events' });
  wrapper.append(heading);

  const list = h('ul', { className: 'trace-span-events__list' });

  events.forEach((event) => {
    const item = h('li', { className: 'trace-span-events__item' });

    const title = h('div', {
      className: 'trace-span-events__title',
      textContent: `${formatTimestamp(event.timeUnixNano)} — ${event.name}`
    });
    item.append(title);

    if (event.attributes?.length) {
      const meta = createAttributeTable(event.attributes);
      meta.classList.add("trace-span-events__meta");
      item.append(meta);
    }

    list.append(item);
  });

  wrapper.append(list);
  return wrapper;
}

function createMarkerTooltip(data) {
  const tooltip = h('div', { className: 'trace-span__marker-tooltip' });

  if (data.type === 'log') {
    const logRow = data.logRow;
    const card = createLogCard(logRow);
    tooltip.append(card);
  } else if (data.type === 'event') {
    const event = data.event;
    // Convert event to log row format (same as in renderSpanLogs)
    const eventLogRow = {
      id: `event-${event.timeUnixNano}-tooltip`,
      template: event.name,
      timeUnixNano: event.timeUnixNano,
      severityNumber: undefined,
      severityText: "event",
      body: undefined,
      attributes: event.attributes || [],
      droppedAttributesCount: undefined,
      flags: undefined,
      traceId: undefined,
      spanId: undefined,
      observedTimeUnixNano: undefined,
    };
    const card = createLogCard(eventLogRow);
    tooltip.append(card);
  }

  return tooltip;
}

/**
 * Collects all markers (logs and events) from a span node.
 * @param {TraceSpanNode} node - The span node
 * @returns {Array} Array of marker objects with timestamp, type, and data
 */
function collectMarkers(node) {
  const markers = [];
  const spanLogs = node.logs || [];
  spanLogs.forEach((logRow) => {
    markers.push({
      timestamp: logRow.timeUnixNano,
      type: 'log',
      logRow: logRow,
    });
  });

  const spanEvents = node.events || [];
  spanEvents.forEach((event) => {
    markers.push({
      timestamp: event.timeUnixNano,
      type: 'event',
      event: event,
    });
  });

  return markers;
}

/**
 * Calculates the visible span window boundaries within the time window.
 * @param {TraceModel} trace - The trace model
 * @param {TraceSpan} span - The span
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @returns {{visibleSpanStart: number, visibleSpanEnd: number, visibleSpanDuration: number}} Visible span boundaries
 */
function calculateVisibleSpanWindow(trace, span, timeWindow) {
  const spanStart = toNumberTimestamp(span.startTimeUnixNano);
  const spanEnd = toNumberTimestamp(span.endTimeUnixNano);
  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const traceStart = toNumberTimestamp(trace.startTimeUnixNano);
  const windowStartTime = traceStart + (totalDuration * windowStart / 100);
  const visibleSpanStart = Math.max(spanStart, windowStartTime);
  const visibleSpanEnd = Math.min(spanEnd, traceStart + (totalDuration * windowEnd / 100));
  const visibleSpanDuration = visibleSpanEnd - visibleSpanStart;

  return { visibleSpanStart, visibleSpanEnd, visibleSpanDuration };
}

/**
 * Calculates the position of a marker within the visible span.
 * @param {number} markerTimestamp - The marker timestamp
 * @param {number} visibleSpanStart - The visible span start time
 * @param {number} visibleSpanDuration - The visible span duration
 * @returns {number} Position percentage (0-100)
 */
function calculateMarkerPosition(markerTimestamp, visibleSpanStart, visibleSpanDuration) {
  if (visibleSpanDuration <= 0) {
    return 50; // Fallback to center if span has no visible duration
  }
  return ((markerTimestamp - visibleSpanStart) / visibleSpanDuration) * 100;
}

/**
 * Positions a tooltip relative to the cursor, adjusting for viewport boundaries.
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {MouseEvent} event - The mouse event
 * @param {boolean} skipTransition - Whether to skip transition animation
 */
function positionTooltip(tooltip, event, skipTransition = false) {
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const tooltipRect = tooltip.getBoundingClientRect();

  // Position tooltip below and slightly offset from cursor
  let left = mouseX;
  let top = mouseY + 12;

  // Adjust if tooltip goes off screen horizontally
  const tooltipLeft = mouseX - tooltipRect.width / 2;
  const tooltipRight = mouseX + tooltipRect.width / 2;

  if (tooltipLeft < 8) {
    left = tooltipRect.width / 2 + 8;
  } else if (tooltipRight > viewportWidth - 8) {
    left = viewportWidth - tooltipRect.width / 2 - 8;
  }

  // Adjust if tooltip goes off screen vertically
  const tooltipBottom = top + tooltipRect.height;
  if (tooltipBottom > viewportHeight - 8) {
    top = mouseY - tooltipRect.height - 12;
  }

  // Set position
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  // Apply transform
  if (skipTransition) {
    tooltip.style.transition = "none";
  }
  const isShowing = tooltip.classList.contains("show");
  tooltip.style.transform = `translateX(-50%) translateY(${isShowing ? "0" : "-4px"})`;

  // Re-enable transition after setting initial position
  if (skipTransition) {
    requestAnimationFrame(() => {
      tooltip.style.transition = "";
    });
  }
}

/**
 * Sets up hover event handlers for a marker.
 * @param {HTMLElement} markerElement - The marker element
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {Object} currentTooltip - Reference to current tooltip (mutable object)
 */
function setupMarkerHover(markerElement, tooltip, currentTooltip) {
  let hideTimeout = null;

  markerElement.addEventListener("mouseenter", (e) => {
    // Cancel any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // Remove any existing tooltip
    if (currentTooltip.value && currentTooltip.value !== tooltip) {
      currentTooltip.value.classList.remove("show");
      setTimeout(() => {
        currentTooltip.value.style.display = "none";
      }, 300);
    }

    // Set display first so we can measure
    tooltip.style.display = "block";
    currentTooltip.value = tooltip;

    // Position first with transition disabled to set initial state
    positionTooltip(tooltip, e, true);

    // Show immediately
    tooltip.classList.add("show");
    positionTooltip(tooltip, e);

    const moveHandler = (event) => {
      positionTooltip(tooltip, event);
    };

    markerElement.addEventListener("mousemove", moveHandler);
    markerElement._moveHandler = moveHandler;
  });

  markerElement.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");

    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    if (markerElement._moveHandler) {
      markerElement.removeEventListener("mousemove", markerElement._moveHandler);
      markerElement._moveHandler = null;
    }

    // Clear currentTooltip immediately if this is the current tooltip
    if (currentTooltip.value === tooltip) {
      currentTooltip.value = null;
    }

    // Wait for fade out before hiding
    hideTimeout = setTimeout(() => {
      if (!markerElement.matches(":hover")) {
        tooltip.style.display = "none";
      }
      hideTimeout = null;
    }, 300);
  });
}

/**
 * Creates a span marker element.
 * @param {Object} marker - The marker data
 * @param {number} positionPercent - The position percentage (0-100)
 * @returns {HTMLElement} The marker element
 */
function createSpanMarker(marker, positionPercent) {
  const markerClassName = marker.type === 'log'
    ? `trace-span__marker trace-span__marker--log trace-span__marker--severity-${resolveSeverityGroup(marker.logRow)}`
    : `trace-span__marker trace-span__marker--${marker.type}`;

  const markerElement = h('div', { className: markerClassName });
  markerElement.style.left = `${positionPercent}%`;

  return markerElement;
}

export function renderSpanMarkers(node, trace, timeWindow = { start: 0, end: 100 }) {
  const markers = collectMarkers(node);

  if (markers.length === 0) {
    return null;
  }

  const span = node.span;
  const spanStart = toNumberTimestamp(span.startTimeUnixNano);
  const spanEnd = toNumberTimestamp(span.endTimeUnixNano);
  const spanDuration = spanEnd - spanStart;

  if (spanDuration <= 0) {
    return null;
  }

  const offsets = computeSpanOffsets(trace, span, timeWindow);
  if (offsets.widthPercent === 0) {
    return null;
  }

  const container = h('div', { className: 'trace-span__markers' });
  const { visibleSpanStart, visibleSpanEnd, visibleSpanDuration } = calculateVisibleSpanWindow(trace, span, timeWindow);

  // Create a tooltip container that will be reused (using mutable object pattern)
  const currentTooltip = { value: null };

  // Create markers for each timestamp
  markers.forEach((marker) => {
    const markerTimestamp = toNumberTimestamp(marker.timestamp);

    // Skip markers outside the span's time range
    if (markerTimestamp < spanStart || markerTimestamp > spanEnd) {
      return;
    }

    // Skip markers outside the visible window
    if (markerTimestamp < visibleSpanStart || markerTimestamp > visibleSpanEnd) {
      return;
    }

    // Calculate position within the visible span
    const positionPercent = calculateMarkerPosition(markerTimestamp, visibleSpanStart, visibleSpanDuration);

    // Create marker element
    const markerElement = createSpanMarker(marker, positionPercent);

    // Create tooltip
    const tooltip = createMarkerTooltip(marker);
    tooltip.style.display = "none";
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.transform = "translateX(-50%) translateY(-4px)";
    document.body.appendChild(tooltip);
    markerElement.dataset.tooltipId = `tooltip-${Date.now()}-${Math.random()}`;

    // Setup hover handlers
    setupMarkerHover(markerElement, tooltip, currentTooltip);

    // Clean up tooltip when marker is removed
    markerElement._cleanupTooltip = () => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };

    container.append(markerElement);
  });

  return container.childElementCount > 0 ? container : null;
}

/**
 * Creates a single log row element.
 * @param {LogRow} logRow - The log row data
 * @param {Set<string>} expandedLogIds - Set of expanded log IDs
 * @returns {{element: HTMLElement, expander: HTMLElement, summary: HTMLElement, metaSection: HTMLElement}} Log row components
 */
// Log rendering moved to ui/components/spanLogs.js

export function renderSpanDetails(node) {
  const details = h('div', { className: 'trace-span__details' });

  // Add logs section (logs already merged during metamodel build)
  const logsSection = renderSpanLogs(node);
  if (logsSection) {
    details.append(logsSection);
  }

  return details;
}

/**
 * Collects all descendant spans recursively from a node.
 * @param {TraceSpanNode} node - The span node
 * @param {Array<{start: number, end: number}>} result - Array to collect results
 * @returns {Array<{start: number, end: number}>} Array of {start, end} time ranges in nanoseconds
 */
function collectDescendantTimeRanges(node, result = []) {
  // Add direct children
  node.children.forEach((child) => {
    const start = toNumberTimestamp(child.span.startTimeUnixNano);
    const end = toNumberTimestamp(child.span.endTimeUnixNano);
    result.push({ start, end });
    // Recursively collect descendants
    collectDescendantTimeRanges(child, result);
  });
  return result;
}

/**
 * Calculates visible segments of a span (excluding child span time ranges).
 * Returns segments as percentages relative to the visible span bar's width (0-100%).
 * Accounts for time window filtering.
 * @param {TraceSpanNode} node - The span node
 * @param {TraceModel} trace - The trace model
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @returns {Array<{startPercent: number, widthPercent: number}>} Array of visible segments (relative to visible span bar)
 */
function calculateVisibleSegments(node, trace, timeWindow) {
  const spanStart = toNumberTimestamp(node.span.startTimeUnixNano);
  const spanEnd = toNumberTimestamp(node.span.endTimeUnixNano);
  const spanDuration = spanEnd - spanStart;

  if (spanDuration <= 0) {
    return [];
  }

  // Calculate the visible portion of the span within the time window
  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const traceStart = toNumberTimestamp(trace.startTimeUnixNano);
  const windowStartTime = traceStart + (totalDuration * windowStart / 100);
  const windowEndTime = traceStart + (totalDuration * windowEnd / 100);

  // Calculate visible span boundaries (clamped to time window)
  const visibleSpanStart = Math.max(spanStart, windowStartTime);
  const visibleSpanEnd = Math.min(spanEnd, windowEndTime);
  const visibleSpanDuration = visibleSpanEnd - visibleSpanStart;

  // If span is not visible in the time window, return empty segments
  if (visibleSpanDuration <= 0) {
    return [];
  }

  // Collect all descendant span time ranges
  const childRanges = collectDescendantTimeRanges(node);

  // If no children, the entire visible span is one segment (0-100% of visible span width)
  if (childRanges.length === 0) {
    return [{
      startPercent: 0,
      widthPercent: 100,
    }];
  }

  // Filter child ranges to only those that overlap with the visible span
  const visibleChildRanges = childRanges
    .map(range => ({
      start: Math.max(range.start, visibleSpanStart),
      end: Math.min(range.end, visibleSpanEnd),
    }))
    .filter(range => range.end > range.start);

  if (visibleChildRanges.length === 0) {
    // No visible children, entire visible span is one segment
    return [{
      startPercent: 0,
      widthPercent: 100,
    }];
  }

  // Sort child ranges by start time
  visibleChildRanges.sort((a, b) => a.start - b.start);

  // Calculate visible segments by subtracting child ranges from visible span
  // Segments are relative to the visible span bar (0-100% of visible span width)
  const segments = [];
  let currentStart = visibleSpanStart;

  visibleChildRanges.forEach((childRange) => {
    // If child starts after current position, there's a visible segment before it
    if (childRange.start > currentStart) {
      const segmentStart = currentStart;
      const segmentEnd = childRange.start;
      if (segmentEnd > segmentStart) {
        // Calculate percentage relative to visible span bar width
        const segmentStartPercent = ((segmentStart - visibleSpanStart) / visibleSpanDuration) * 100;
        const segmentEndPercent = ((segmentEnd - visibleSpanStart) / visibleSpanDuration) * 100;
        const segmentWidthPercent = segmentEndPercent - segmentStartPercent;

        segments.push({
          startPercent: segmentStartPercent,
          widthPercent: segmentWidthPercent,
        });
      }
    }
    // Update current position to after this child range
    currentStart = Math.max(currentStart, childRange.end);
  });

  // Add final segment if there's remaining time after all children
  if (currentStart < visibleSpanEnd) {
    const segmentStart = currentStart;
    const segmentEnd = visibleSpanEnd;
    const segmentStartPercent = ((segmentStart - visibleSpanStart) / visibleSpanDuration) * 100;
    const segmentEndPercent = ((segmentEnd - visibleSpanStart) / visibleSpanDuration) * 100;
    const segmentWidthPercent = segmentEndPercent - segmentStartPercent;

    segments.push({
      startPercent: segmentStartPercent,
      widthPercent: segmentWidthPercent,
    });
  }

  return segments;
}

/**
 * Renders runline-x elements in the center of a span bar, interrupted by child spans.
 * @param {TraceSpanNode} node - The span node
 * @param {TraceModel} trace - The trace model
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @returns {HTMLElement|null} Container with runline-x elements, or null if no segments
 */
export function renderRunlineX(node, trace, timeWindow) {
  const segments = calculateVisibleSegments(node, trace, timeWindow);
  if (segments.length === 0) {
    return null;
  }

  const container = h('div', { className: 'trace-span__runline-x-container' });

  segments.forEach((segment) => {
    const line = h('div', {
      className: 'trace-span__runline-x',
      style: {
        left: `${segment.startPercent}%`,
        width: `${segment.widthPercent}%`
      }
    });
    container.append(line);
  });

  return container;
}

/**
 * Calculates the vertical distance from parent summary to child span by measuring actual DOM elements.
 * @param {HTMLElement} parentSummary - The parent summary element
 * @param {string} childSpanId - The child span ID
 * @returns {number|null} Distance in pixels, or null if elements not found
 */
function calculateChildVerticalOffset(parentSummary, childSpanId) {
  // Find parent container
  const parentContainer = parentSummary.closest('.trace-span');
  if (!parentContainer) {
    return null;
  }

  // Find child span by its ID
  const childSpan = parentContainer.querySelector(`[data-span-id="${childSpanId}"]`);
  if (!childSpan) {
    return null;
  }

  // Get positions
  const parentRect = parentSummary.getBoundingClientRect();
  const childRect = childSpan.getBoundingClientRect();

  // Calculate distance: child y-screen-position minus parent y-screen-position
  const distance = childRect.top - parentRect.top;

  return distance;
}

/**
 * Gets the runline container and parent elements.
 * @param {HTMLElement} parentSummary - The parent summary element
 * @returns {{runlineYContainer: HTMLElement, parentContainer: HTMLElement, parentSummaryRect: DOMRect, timelineAreaRect: DOMRect, barBottomOffset: number}|null} Container data or null
 */
function getRunlineContainerData(parentSummary) {
  const runlineYContainer = parentSummary.querySelector('.trace-span__runline-y-container');
  if (!runlineYContainer) {
    return null;
  }

  const parentSummaryRect = parentSummary.getBoundingClientRect();
  const parentContainer = parentSummary.closest('.trace-span');
  if (!parentContainer) {
    return null;
  }

  const timelineAreaRect = runlineYContainer.getBoundingClientRect();
  const parentBar = parentSummary.querySelector('.trace-span__bar');
  if (!parentBar) {
    return null;
  }

  const parentBarRect = parentBar.getBoundingClientRect();
  const barBottomOffset = parentBarRect.bottom - parentSummaryRect.top;

  return {
    runlineYContainer,
    parentContainer,
    parentSummaryRect,
    timelineAreaRect,
    barBottomOffset,
  };
}

/**
 * Gets the child bar element and its position.
 * @param {HTMLElement} parentContainer - The parent container element
 * @param {string} childSpanId - The child span ID
 * @returns {{childBarRect: DOMRect, xPosition: number}|null} Child bar data or null
 */
function getChildBarData(parentContainer, childSpanId, position, timelineAreaRect) {
  const childSpan = parentContainer.querySelector(`[data-span-id="${childSpanId}"]`);
  if (!childSpan) {
    return null;
  }

  const childSummary = childSpan.querySelector('.trace-span__summary');
  if (!childSummary) {
    return null;
  }

  const childBar = childSummary.querySelector('.trace-span__bar');
  if (!childBar) {
    return null;
  }

  const childBarRect = childBar.getBoundingClientRect();

  // Check if child bar is visible (has valid dimensions)
  if (childBarRect.width === 0 || childBarRect.height === 0) {
    return null;
  }

  // Calculate X position based on start or end of child bar
  const xPosition = position === "end"
    ? childBarRect.right - timelineAreaRect.left
    : childBarRect.left - timelineAreaRect.left;

  return { childBarRect, xPosition };
}

/**
 * Updates a single runline-y element's position and visibility.
 * @param {HTMLElement} line - The line element
 * @param {HTMLElement} parentSummary - The parent summary element
 * @param {HTMLElement} parentContainer - The parent container element
 * @param {DOMRect} timelineAreaRect - The timeline area rectangle
 * @param {number} barBottomOffset - The offset from parent summary top to bar bottom
 */
function updateRunlineElement(line, parentSummary, parentContainer, timelineAreaRect, barBottomOffset) {
  const childSpanId = line.dataset.childSpanId;
  const position = line.dataset.position; // "start" or "end"

  if (!childSpanId) {
    line.style.display = 'none';
    return;
  }

  const childBarData = getChildBarData(parentContainer, childSpanId, position, timelineAreaRect);
  if (!childBarData) {
    line.style.display = 'none';
    return;
  }

  const { xPosition } = childBarData;
  const totalDistance = calculateChildVerticalOffset(parentSummary, childSpanId);

  // One span-line height = 32px (2rem)
  const spanLineHeight = 32;

  if (totalDistance !== null && totalDistance > barBottomOffset && !isNaN(xPosition) && xPosition >= 0) {
    const lineHeight = totalDistance - barBottomOffset + spanLineHeight - 4;
    line.style.top = `${barBottomOffset - 1}px`;
    line.style.height = `${lineHeight}px`;
    line.style.left = `${xPosition}px`;
    line.style.display = 'block';
  } else {
    line.style.display = 'none';
  }
}

/**
 * Updates the heights and X positions of runline-y elements by measuring actual DOM positions.
 * @param {HTMLElement} parentSummary - The parent summary element
 */
export function updateRunlineYHeights(parentSummary) {
  const containerData = getRunlineContainerData(parentSummary);
  if (!containerData) {
    return;
  }

  const { runlineYContainer, parentContainer, timelineAreaRect, barBottomOffset } = containerData;
  const lines = runlineYContainer.querySelectorAll('.trace-span__runline-y');

  lines.forEach((line) => {
    updateRunlineElement(line, parentSummary, parentContainer, timelineAreaRect, barBottomOffset);
  });
}

/**
 * Renders runline-y elements in the timeline area connecting parent span to child spans.
 * Creates vertical lines from the parent span bar down to each child span bar.
 * @param {TraceSpanNode} node - The parent span node
 * @param {TraceModel} trace - The trace model
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @param {Set<string>} expandedChildren - Set of expanded child span IDs
 * @returns {HTMLElement|null} Container with runline-y elements, or null if no children
 */
export function renderRunlineY(node, trace, timeWindow, expandedChildren = new Set()) {
  if (!node.children || node.children.length === 0) {
    return null;
  }

  const container = h('div', { className: 'trace-span__runline-y-container' });

  // Calculate parent span offsets to get the visible portion and position within timeline area
  const parentOffsets = computeSpanOffsets(trace, node.span, timeWindow);
  if (parentOffsets.widthPercent === 0) {
    return null;
  }

  // Calculate visible span boundaries
  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const traceStart = toNumberTimestamp(trace.startTimeUnixNano);
  const windowStartTime = traceStart + (totalDuration * windowStart / 100);
  const windowEndTime = traceStart + (totalDuration * windowEnd / 100);

  const parentSpanStart = toNumberTimestamp(node.span.startTimeUnixNano);
  const parentSpanEnd = toNumberTimestamp(node.span.endTimeUnixNano);
  const visibleParentStart = Math.max(parentSpanStart, windowStartTime);
  const visibleParentEnd = Math.min(parentSpanEnd, windowEndTime);
  const visibleParentDuration = visibleParentEnd - visibleParentStart;

  if (visibleParentDuration <= 0) {
    return null;
  }

  // Create a line for each child at its start position
  node.children.forEach((child) => {
    const childStart = toNumberTimestamp(child.span.startTimeUnixNano);
    const childEnd = toNumberTimestamp(child.span.endTimeUnixNano);

    // Skip if child is completely outside the visible window
    if (childEnd < windowStartTime || childStart > windowEndTime) {
      return;
    }

    // Clamp child start to visible window
    const visibleChildStart = Math.max(childStart, windowStartTime);
    const visibleChildEnd = Math.min(childEnd, windowEndTime);

    // Calculate position relative to visible parent span (0-100% of parent span width)
    const positionPercentWithinParent = ((visibleChildStart - visibleParentStart) / visibleParentDuration) * 100;

    // Create line at start position if child start is within visible parent span
    if (positionPercentWithinParent >= 0 && positionPercentWithinParent <= 100) {
      // Create line at start - X position will be set based on actual child DOM position after children are rendered
      const lineStart = h('div', {
        className: 'trace-span__runline-y',
        dataset: { childSpanId: child.span.spanId, position: 'start' },
        style: { display: 'none' } // Hidden until height and position are set
      });
      container.append(lineStart);
    }

    // Calculate position for end of child span
    const positionPercentEndWithinParent = ((visibleChildEnd - visibleParentStart) / visibleParentDuration) * 100;

    // Create line at end position if child end is within visible parent span
    if (positionPercentEndWithinParent >= 0 && positionPercentEndWithinParent <= 100) {
      // Create line at end - X position will be set based on actual child DOM position after children are rendered
      const lineEnd = h('div', {
        className: 'trace-span__runline-y',
        dataset: { childSpanId: child.span.spanId, position: 'end' },
        style: { display: 'none' } // Hidden until height and position are set
      });
      container.append(lineEnd);
    }
  });

  return container.childElementCount > 0 ? container : null;
}

// Span summary rendering moved to ui/components/spanSummary.js

// Re-export pruneDescendantState from state manager for backward compatibility
const pruneDescendantState = pruneDescendantStateFromManager;

// Span node rendering moved to ui/components/spanNode.js

// Re-export state manager functions for backward compatibility
const createTraceViewState = createViewState;

/**
 * Creates a live cursor marker that follows the cursor position.
 * @param {TraceModel} trace - The trace model
 * @param {Object} timeWindow - Time window { start: 0-100, end: 0-100 }
 * @param {HTMLElement} listContainer - The trace-span-list container
 * @returns {Object} Object with marker element and update function
 */
function createLiveCursorMarker(trace, timeWindow, listContainer) {
  const marker = h('div', {
    className: 'trace-timeline-marker trace-timeline-marker--cursor',
    style: { display: 'none' } // Hidden by default, shown on hover
  });

  // Add top label
  const topLabel = h('div', {
    className: 'trace-timeline-marker__label trace-timeline-marker__label--top',
    textContent: ''
  });
  marker.append(topLabel);

  // Add bottom label
  const bottomLabel = h('div', {
    className: 'trace-timeline-marker__label trace-timeline-marker__label--bottom',
    textContent: ''
  });
  marker.append(bottomLabel);

  const updatePosition = (positionPercent, timestamp) => {
    marker.style.left = `${positionPercent}%`;
    const timestampText = formatDurationMs(timestamp);
    topLabel.textContent = timestampText;
    bottomLabel.textContent = timestampText;
  };

  return {
    marker,
    updatePosition,
  };
}

/**
 * Sets up cursor tracking to update the live cursor marker.
 * @param {HTMLElement} listContainer - The trace-span-list container
 * @param {Object} liveCursorMarker - Object with marker element and updatePosition function
 * @param {TraceModel} trace - The trace model
 * @param {Object} viewState - View state containing timeWindowStart and timeWindowEnd
 */
function setupCursorTracking(listContainer, liveCursorMarker, trace, viewState) {
  let isHovering = false;

  // Get the timeline markers container to calculate the timeline area bounds
  const timelineMarkersContainer = listContainer.querySelector(".trace-timeline-markers");
  if (!timelineMarkersContainer) {
    return;
  }

  const handleMouseMove = (e) => {
    if (!isHovering) {
      return;
    }

    const markersRect = timelineMarkersContainer.getBoundingClientRect();

    // Check if cursor is over the timeline area (not the service column)
    const mouseX = e.clientX;
    if (mouseX < markersRect.left || mouseX > markersRect.right) {
      liveCursorMarker.marker.style.display = "none";
      return;
    }

    // Calculate position relative to timeline markers container
    const relativeX = mouseX - markersRect.left;
    const markersWidth = markersRect.width;
    const positionPercent = (relativeX / markersWidth) * 100;

    // Calculate timestamp from position
    const totalDuration = trace.durationNano || Math.max(
      toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
      1
    );

    // Read time window from viewState dynamically
    const windowStart = viewState?.timeWindowStart ?? 0;
    const windowEnd = viewState?.timeWindowEnd ?? 100;
    const windowWidth = windowEnd - windowStart;

    // Convert position within timeline area (0-100%) to absolute position in trace (0-100%)
    const absolutePosition = windowStart + (positionPercent * windowWidth) / 100;

    // Calculate absolute time delta from trace start
    const absoluteTimeDelta = (totalDuration * absolutePosition) / 100;

    // Update marker position and label
    liveCursorMarker.updatePosition(positionPercent, absoluteTimeDelta);
    liveCursorMarker.marker.style.display = "block";
  };

  const handleMouseEnter = () => {
    isHovering = true;
  };

  const handleMouseLeave = () => {
    isHovering = false;
    liveCursorMarker.marker.style.display = "none";
  };

  // Listen for mouse events on the list container
  listContainer.addEventListener("mousemove", handleMouseMove);
  listContainer.addEventListener("mouseenter", handleMouseEnter);
  listContainer.addEventListener("mouseleave", handleMouseLeave);
}


export function renderTrace(host, trace, state) {
  const viewState = state ?? createViewState(trace);
  if (!host) {
    return viewState;
  }
  // Validate and prune state using state manager
  pruneInvalidState(trace, viewState);
  ensureChildrenExpanded(trace, viewState);

  host.innerHTML = "";

  // Render header using component
  const header = renderTraceHeader(trace, viewState, host, renderTrace);
  host.append(header);

  // Add preview trace component
  const preview = renderTracePreview(
    trace,
    (startPercent, endPercent) => {
      // Update time window in view state
      viewState.timeWindowStart = startPercent;
      viewState.timeWindowEnd = endPercent;
      // Re-render the trace with the new time window
      renderTrace(host, trace, viewState);
    },
    {
      start: viewState.timeWindowStart ?? 0,
      end: viewState.timeWindowEnd ?? 100,
    }
  );
  host.append(preview.element);

  // Store preview reference in viewState for later updates
  viewState.preview = preview;

  const list = h('div', { className: 'trace-span-list' });

  // Create timeline markers (vertical lines) that span all timelines
  const timeWindow = {
    start: viewState.timeWindowStart ?? 0,
    end: viewState.timeWindowEnd ?? 100,
  };
  const timelineMarkers = createTimelineMarkers(trace, 3, timeWindow);
  list.append(timelineMarkers);

  trace.roots.forEach((root, index) => {
    const isLast = index === trace.roots.length - 1;
    list.append(renderSpanNode(trace, root, viewState, isLast, -1));
  });

  host.append(list);

  // Create and add the splitter for resizing service column
  // Splitter is positioned relative to trace-span-list, not the full trace-viewer
  const splitter = createSplitter(list);
  list.append(splitter);

  // Create live cursor swimlane that follows the cursor
  const liveCursorMarker = createLiveCursorMarker(trace, timeWindow, list);
  timelineMarkers.append(liveCursorMarker.marker);

  // Track mouse movement over the timeline area
  // Pass viewState so cursor tracking can access updated time window
  setupCursorTracking(list, liveCursorMarker, trace, viewState);

  return viewState;
}

/**
 * Formats duration in nanoseconds to milliseconds string
 * @param {number} durationNano - Duration in nanoseconds
 * @returns {string} Formatted duration in ms
 */
function formatDurationMs(durationNano) {
  const ms = durationNano / 1e6;
  return `${ms.toFixed(2)} ms`;
}

/**
 * Creates vertical timeline markers showing time divisions/swimlanes.
 * @param {TraceModel} trace - The trace model
 * @param {number} numberOfSwimlanes - Number of swimlanes (default 3)
 * @returns {HTMLElement} Container element with timeline markers
 */
function createTimelineMarkers(trace, numberOfSwimlanes = 3, timeWindow = { start: 0, end: 100 }) {
  const container = h('div', { className: 'trace-timeline-markers' });

  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );

  // Calculate time window boundaries
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const windowWidth = windowEnd - windowStart;
  const windowDuration = (totalDuration * windowWidth) / 100;
  const windowStartTime = (totalDuration * windowStart) / 100;

  // Create markers at intervals within the time window
  const interval = 100 / numberOfSwimlanes;
  for (let i = 0; i <= numberOfSwimlanes; i++) {
    // Position relative to window (0-100% within window)
    const position = i * interval;

    // Calculate absolute position in trace (0-100%)
    const absolutePosition = windowStart + (position * windowWidth) / 100;

    // Calculate absolute time delta from trace start (not window start)
    const absoluteTimeDelta = (totalDuration * absolutePosition) / 100;

    const marker = h('div', {
      className: 'trace-timeline-marker',
      style: { left: `${position}%` }
    });

    // Add top label
    const topLabel = h('div', {
      className: 'trace-timeline-marker__label trace-timeline-marker__label--top',
      textContent: formatDurationMs(absoluteTimeDelta)
    });
    marker.append(topLabel);

    // Add bottom label
    const bottomLabel = h('div', {
      className: 'trace-timeline-marker__label trace-timeline-marker__label--bottom',
      textContent: formatDurationMs(absoluteTimeDelta)
    });
    marker.append(bottomLabel);

    container.append(marker);
  }

  return container;
}

/**
 * Creates a resizable splitter element for adjusting service column width.
 * @param {HTMLElement} container - The trace-viewer container
 * @returns {HTMLElement} The splitter element
 */
function createSplitter(container) {
  const splitter = h('div', {
    className: 'trace-viewer__splitter',
    attrs: { 'aria-label': 'Resize service column' }
  });

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  const startDrag = (e) => {
    isDragging = true;
    startX = e.clientX || e.touches?.[0]?.clientX || 0;
    const root = document.documentElement;
    const currentWidth = root.style.getPropertyValue("--trace-span-service-width") ||
      getComputedStyle(root).getPropertyValue("--trace-span-service-width") ||
      "16rem";
    startWidth = parseFloat(currentWidth) || 16;
    // Make splitter visible when dragging
    splitter.style.opacity = "1";
    splitter.style.background = "rgba(148, 163, 184, 0.5)";
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchmove", doDrag);
    document.addEventListener("touchend", stopDrag);
    e.preventDefault();
  };

  const doDrag = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX || e.touches?.[0]?.clientX || 0;
    const diff = currentX - startX;
    // Convert pixels to rem (assuming 1rem = 16px)
    const diffRem = diff / 16;
    const newWidth = Math.max(8, Math.min(40, startWidth + diffRem)); // Min 8rem, max 40rem
    const root = document.documentElement;
    root.style.setProperty("--trace-span-service-width", `${newWidth}rem`);
    e.preventDefault();
  };

  const stopDrag = () => {
    isDragging = false;
    // Fade out splitter after a short delay when not dragging
    setTimeout(() => {
      if (!isDragging) {
        splitter.style.opacity = "";
        splitter.style.background = "";
      }
    }, 150);
    document.removeEventListener("mousemove", doDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", doDrag);
    document.removeEventListener("touchend", stopDrag);
  };

  splitter.addEventListener("mousedown", startDrag);
  splitter.addEventListener("touchstart", startDrag);

  return splitter;
}

/**
 * Computes service color from palette colors.
 * @param {string} serviceName - The service name
 * @param {TraceModel} trace - The trace model
 * @param {Array<string>} paletteColors - Array of palette colors
 * @returns {string} The computed color hex
 */
/**
 * Gets the CSS variable name for a service color based on its index.
 * Maps service index to palette color CSS variables (primary, secondary, tertiary, etc.)
 * @param {string} serviceName - Service name to look up
 * @param {TraceModel} trace - Trace model with serviceNameMapping
 * @returns {string} CSS variable name (e.g., "--primary-positive-2")
 */
function getServiceColorCssVar(serviceName, trace) {
  const paletteColorNames = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary"];
  const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
  const colorIndex = serviceIndex % paletteColorNames.length;
  const colorName = paletteColorNames[colorIndex];
  return `--${colorName}-positive-2`;
}

/**
 * Gets the RGB CSS variable name for a service color.
 * @param {string} serviceName - Service name to look up
 * @param {TraceModel} trace - Trace model with serviceNameMapping
 * @returns {string} RGB CSS variable name (e.g., "--primary-positive-2-rgb")
 */
function getServiceColorRgbCssVar(serviceName, trace) {
  const paletteColorNames = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary"];
  const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
  const colorIndex = serviceIndex % paletteColorNames.length;
  const colorName = paletteColorNames[colorIndex];
  return `--${colorName}-positive-2-rgb`;
}

/**
 * Updates service color indicators in span summaries using CSS variables.
 * @param {HTMLElement} host - The host element
 * @param {TraceModel} trace - The trace model
 */
function updateServiceColors(host, trace) {
  const serviceButtons = host.querySelectorAll(".trace-span__service");
  console.log(`[Trace Viewer Update] Found ${serviceButtons.length} service buttons to update`);
  let updateCount = 0;
  const rootStyles = getComputedStyle(document.documentElement);
  
  serviceButtons.forEach((serviceButton) => {
    const serviceName = serviceButton.querySelector(".trace-span__service-name")?.textContent || "unknown-service";
    const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const rgbCssVar = getServiceColorRgbCssVar(serviceName, trace);
    const rgbValue = rootStyles.getPropertyValue(rgbCssVar).trim();

    if (rgbValue) {
      const [r, g, b] = rgbValue.split(/\s+/).map(v => parseInt(v, 10));
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const serviceColorStyle = `background-color: rgba(${r}, ${g}, ${b}, 0.6);`;
        const indicator = serviceButton.querySelector(".trace-span__service-indicator");
        if (indicator) {
          indicator.style.cssText = serviceColorStyle;
          updateCount++;
          if (updateCount <= 3) {
            console.log(`[Trace Viewer Update] Service indicator: service="${serviceName}", index=${serviceIndex}, rgb="${rgbValue}", rgba(${r}, ${g}, ${b}, 0.6)`);
          }
        }
      }
    }
  });
  console.log(`[Trace Viewer Update] Updated ${updateCount} service indicators`);
}

/**
 * Updates span bar colors using CSS variables.
 * @param {HTMLElement} host - The host element
 * @param {TraceModel} trace - The trace model
 */
function updateSpanBars(host, trace) {
  const bars = host.querySelectorAll(".trace-span__bar");
  console.log(`[Trace Viewer Update] Found ${bars.length} span bars to update`);
  let barUpdateCount = 0;
  const rootStyles = getComputedStyle(document.documentElement);
  
  bars.forEach((bar) => {
    const summary = bar.closest(".trace-span__summary");
    if (!summary) return;

    const serviceButton = summary.querySelector(".trace-span__service");
    if (!serviceButton) return;

    const serviceName = serviceButton.querySelector(".trace-span__service-name")?.textContent || "unknown-service";
    const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const rgbCssVar = getServiceColorRgbCssVar(serviceName, trace);
    const rgbValue = rootStyles.getPropertyValue(rgbCssVar).trim();

    if (rgbValue) {
      const [r, g, b] = rgbValue.split(/\s+/).map(v => parseInt(v, 10));
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const colorValue = `rgba(${r}, ${g}, ${b}, 0.6)`;
        const shadowValue = `0 0 18px rgba(${r}, ${g}, ${b}, 0.25)`;
        bar.style.setProperty("--service-color", colorValue);
        bar.style.setProperty("--service-shadow", shadowValue);
        barUpdateCount++;
        if (barUpdateCount <= 3) {
          console.log(`[Trace Viewer Update] Span bar: service="${serviceName}", index=${serviceIndex}, rgb="${rgbValue}", --service-color="${colorValue}"`);
        }
      }
    }
  });
  console.log(`[Trace Viewer Update] Updated ${barUpdateCount} span bars`);
}

/**
 * Updates the SVG preview component.
 * @param {HTMLElement} host - The host element
 * @param {Object} viewState - The view state
 * @param {Object} previewComponent - The preview component reference
 */
function updatePreview(host, viewState, previewComponent) {
  const currentPreview = viewState?.preview || previewComponent;
  if (currentPreview && typeof currentPreview.update === "function") {
    currentPreview.update();
  } else {
    const previewElement = host.querySelector(".trace-preview");
    if (previewElement && previewElement.__previewComponent) {
      previewElement.__previewComponent.update();
    }
  }
}

/**
 * Creates the update function for the trace viewer.
 * @param {HTMLElement} host - The host element
 * @param {TraceModel} trace - The trace model
 * @param {Object} viewState - The view state (mutable reference)
 * @param {Object} previewComponent - The preview component reference (mutable reference)
 * @returns {Function} The update function
 */
function createTraceViewerUpdate(host, trace, viewState, previewComponent) {
  return () => {
    console.log("[Trace Viewer Update] update() method called!");
    void host.offsetWidth;

    updateServiceColors(host, trace);
    updateSpanBars(host, trace);
    updatePreview(host, viewState, previewComponent);
  };
}

export function initTraceViewer(host, spans, logRows = null) {
  console.log("[initTraceViewer] Called, host:", host);
  if (!host) {
    console.log("[initTraceViewer] No host, returning empty functions");
    return { render: () => { }, update: () => { } };
  }

  const finalLogRows = logRows || getSampleLogRows();
  const trace = buildTraceModel(spans, finalLogRows);
  let viewState = renderTrace(host, trace);
  let previewComponent = viewState.preview;
  console.log("[initTraceViewer] Trace viewer initialized, previewComponent:", previewComponent);

  const update = createTraceViewerUpdate(host, trace, viewState, previewComponent);

  const render = () => {
    viewState = renderTrace(host, trace, viewState);
    previewComponent = viewState.preview;
  };

  return { render, update };
}

// sampleTraceSpans moved to ui/sampleData.js
export { sampleTraceSpans } from "./sampleData.js";
