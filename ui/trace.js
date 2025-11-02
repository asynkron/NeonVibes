/**
 * Gravibe Trace Explorer Toolkit
 * Provides a lightweight data model that mirrors OpenTelemetry trace spans and
 * utilities to render a nested trace timeline inspired by the official proto
 * definitions.
 */

import { normalizeAnyValue, createLogAttribute, formatNanoseconds, resolveSeverityGroup, abbreviateLogLevel, buildTemplateFragment, createMetaSection, createLogCard } from "./logs.js";
import { createAttributeTable } from "./attributes.js";
import { hexToRgb, hexToRgba, normalizeColorBrightness } from "../core/colors.js";
import { getPaletteColors } from "../core/palette.js";
import { ComponentKind, extractSpanDescription, createComponentKey } from "./metaModel.js";
import { renderTracePreview } from "./tracePreview.js";

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
 * @typedef {{ id: string, name: string }} Group
 * @typedef {{ id: string, name: string, groupId: string, kind: string, componentStack: string }} Component
 * @typedef {{ groupName: string, componentName: string, operation: string, componentKind: string, componentStack: string, isClient?: boolean }} SpanDescription
 * @typedef {{ traceId: string, startTimeUnixNano: number, endTimeUnixNano: number, durationNano: number, spanCount: number, roots: TraceSpanNode[], serviceNameMapping: Map<string, number>, groups: Map<string, Group>, components: Map<string, Component> }} TraceModel
 * @typedef {{ span: TraceSpan, depth: number, children: TraceSpanNode[], description?: SpanDescription }} TraceSpanNode
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

function toNumberTimestamp(value) {
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
 * Collects unique service names from spans and creates an index mapping.
 * @param {TraceSpan[]} spans
 * @returns {Map<string, number>} Map from service name to index
 */
function buildServiceNameMapping(spans) {
  const serviceNames = new Set();
  spans.forEach((span) => {
    const serviceName = span.resource?.serviceName || "unknown-service";
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
 * Builds a hierarchical trace model so spans become aware of their children
 * without mutating the original span definitions.
 * @param {TraceSpan[]} spans
 * @returns {TraceModel}
 */
export function buildTraceModel(spans) {
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

  const spanNodes = new Map();
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  let traceId = spans[0].traceId;

  // Maps to collect unique groups and components
  const groups = new Map();
  const components = new Map();

  spans.forEach((span) => {
    const start = toNumberTimestamp(span.startTimeUnixNano);
    const end = toNumberTimestamp(span.endTimeUnixNano);
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
    traceId = span.traceId || traceId;

    // Extract span description using extractors
    const serviceName = span.resource?.serviceName || "unknown-service";
    const description = extractSpanDescription(span, serviceName);

    // Normalize group name - if component is Service and group is empty, use component name as group
    let groupName = description.groupName;
    let componentName = description.componentName;
    if (description.componentKind === ComponentKind.SERVICE && !groupName) {
      groupName = componentName;
      componentName = "Internal";
    }
    if (!componentName) {
      componentName = "Unknown";
    }

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
      });
    }

    // Store description in node
    spanNodes.set(span.spanId, { span, depth: 0, children: [], description });
  });

  const serviceNameMapping = buildServiceNameMapping(spans);

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

  const banner = document.createElement("section");
  banner.className = "validation-banner";

  const title = document.createElement("h3");
  title.className = "validation-banner__title";
  title.textContent = hasErrors ? "Trace validation issues" : "Trace validation warnings";
  banner.append(title);

  const list = document.createElement("ul");
  list.className = "validation-banner__list";
  const entries = [...(validation.errors ?? []), ...(validation.warnings ?? [])];
  entries.forEach((issue) => {
    const item = document.createElement("li");
    item.className = `validation-banner__item validation-banner__item--${issue.level}`;
    item.textContent = issue.message;
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

function formatDurationNano(duration) {
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

function formatTimestamp(value) {
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
  const wrapper = document.createElement("div");
  wrapper.className = "trace-span-events";

  const heading = document.createElement("h4");
  heading.textContent = "Events";
  wrapper.append(heading);

  const list = document.createElement("ul");
  list.className = "trace-span-events__list";

  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = "trace-span-events__item";

    const title = document.createElement("div");
    title.className = "trace-span-events__title";
    title.textContent = `${formatTimestamp(event.timeUnixNano)} — ${event.name}`;
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
  const tooltip = document.createElement("div");
  tooltip.className = "trace-span__marker-tooltip";

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

function renderSpanMarkers(span, trace, timeWindow = { start: 0, end: 100 }) {
  // Collect all timestamps: logs and events with their data
  const markers = [];

  // Get logs for this span (lazy import to avoid circular dependency)
  const sampleLogRows = getSampleLogRows();
  const spanLogs = sampleLogRows.filter((logRow) => logRow.spanId === span.spanId);
  spanLogs.forEach((logRow) => {
    markers.push({
      timestamp: logRow.timeUnixNano,
      type: 'log',
      logRow: logRow,
    });
  });

  // Get events for this span
  if (span.events && span.events.length > 0) {
    span.events.forEach((event) => {
      markers.push({
        timestamp: event.timeUnixNano,
        type: 'event',
        event: event,
      });
    });
  }

  if (markers.length === 0) {
    return null;
  }

  // Calculate span duration and offsets
  const spanStart = toNumberTimestamp(span.startTimeUnixNano);
  const spanEnd = toNumberTimestamp(span.endTimeUnixNano);
  const spanDuration = spanEnd - spanStart;

  if (spanDuration <= 0) {
    return null;
  }

  // Apply time window to calculate visible span range
  const offsets = computeSpanOffsets(trace, span, timeWindow);
  if (offsets.widthPercent === 0) {
    return null;
  }

  const container = document.createElement("div");
  container.className = "trace-span__markers";

  // Calculate the visible span window boundaries
  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );
  const windowStart = timeWindow.start || 0;
  const windowEnd = timeWindow.end || 100;
  const windowWidth = windowEnd - windowStart;
  const traceStart = toNumberTimestamp(trace.startTimeUnixNano);
  const windowStartTime = traceStart + (totalDuration * windowStart / 100);
  const visibleSpanStart = Math.max(spanStart, windowStartTime);
  const visibleSpanEnd = Math.min(spanEnd, traceStart + (totalDuration * windowEnd / 100));
  const visibleSpanDuration = visibleSpanEnd - visibleSpanStart;

  // Create a tooltip container that will be reused
  let currentTooltip = null;

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

    // Calculate position within the visible span (0-100% of visible span duration)
    const positionWithinVisibleSpan = visibleSpanDuration > 0
      ? ((markerTimestamp - visibleSpanStart) / visibleSpanDuration) * 100
      : 50; // Fallback to center if span has no visible duration

    const markerElement = document.createElement("div");

    // For log markers, determine severity and apply color class
    if (marker.type === 'log') {
      const severityGroup = resolveSeverityGroup(marker.logRow);
      markerElement.className = `trace-span__marker trace-span__marker--log trace-span__marker--severity-${severityGroup}`;
    } else {
      markerElement.className = `trace-span__marker trace-span__marker--${marker.type}`;
    }

    markerElement.style.left = `${positionWithinVisibleSpan}%`;

    // Create tooltip for this marker and append to document.body instead
    const tooltip = createMarkerTooltip(marker);
    tooltip.style.display = "none";
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.transform = "translateX(-50%) translateY(-4px)";
    document.body.appendChild(tooltip);
    markerElement.dataset.tooltipId = `tooltip-${Date.now()}-${Math.random()}`;

    // Store timeout reference for cleanup
    let hideTimeout = null;

    // Add hover handlers
    markerElement.addEventListener("mouseenter", (e) => {
      // Cancel any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      // Remove any existing tooltip
      if (currentTooltip && currentTooltip !== tooltip) {
        currentTooltip.classList.remove("show");
        // Wait for fade out before hiding
        setTimeout(() => {
          currentTooltip.style.display = "none";
        }, 300);
      }

      // Set display first so we can measure
      tooltip.style.display = "block";
      currentTooltip = tooltip;

      // Position tooltip relative to cursor
      const updateTooltipPosition = (event, skipTransition = false) => {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Get tooltip dimensions
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

        // Apply transform - if skipping transition, set directly without animation
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
      };

      // Position first with transition disabled to set initial state
      updateTooltipPosition(e, true);

      // Show immediately - don't wait for animation frame
      tooltip.classList.add("show");
      updateTooltipPosition(e);

      const moveHandler = (event) => {
        updateTooltipPosition(event);
      };

      markerElement.addEventListener("mousemove", moveHandler);
      markerElement._moveHandler = moveHandler;
    });

    markerElement.addEventListener("mouseleave", () => {
      // Only hide if mouse is actually leaving
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
      if (currentTooltip === tooltip) {
        currentTooltip = null;
      }

      // Wait for fade out before hiding
      hideTimeout = setTimeout(() => {
        // Double-check that mouse is not on the element
        if (!markerElement.matches(":hover")) {
          tooltip.style.display = "none";
        }
        hideTimeout = null;
      }, 300);
    });

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

function renderSpanLogs(span) {
  // Filter logs by span ID - virtual entries (span start, events, span end) are already in the array
  const sampleLogRows = getSampleLogRows();
  const allLogs = sampleLogRows.filter((logRow) => logRow.spanId === span.spanId);

  if (allLogs.length === 0) {
    return null;
  }

  // Sort all logs by time
  const sortedLogs = [...allLogs].sort((a, b) => {
    const timeA = typeof a.timeUnixNano === "bigint" ? Number(a.timeUnixNano) : a.timeUnixNano;
    const timeB = typeof b.timeUnixNano === "bigint" ? Number(b.timeUnixNano) : b.timeUnixNano;
    return timeA - timeB;
  });

  const logsSection = document.createElement("section");
  logsSection.className = "trace-span-logs";

  const logsList = document.createElement("div");
  logsList.className = "trace-span-logs__list";

  // Create a Set to track expanded log IDs
  const expandedLogIds = new Set();

  sortedLogs.forEach((logRow) => {
    const logElement = document.createElement("details");
    logElement.className = `log-row log-row--severity-${resolveSeverityGroup(logRow)}`;
    logElement.dataset.rowId = logRow.id;
    if (expandedLogIds.has(logRow.id)) {
      logElement.open = true;
    }

    const summary = document.createElement("summary");
    summary.className = "log-row-summary";

    const expanderWrapper = document.createElement("span");
    expanderWrapper.className = "log-row__expander-wrapper";
    const expander = document.createElement("button");
    expander.className = "log-row__expander";
    expander.type = "button";
    expander.setAttribute("aria-expanded", String(logElement.open));
    expanderWrapper.appendChild(expander);

    const severity = document.createElement("span");
    severity.className = "log-row-severity";
    const severityGroup = resolveSeverityGroup(logRow);
    const severityToDisplay = logRow.severityText ?? severityGroup;
    severity.textContent = abbreviateLogLevel(severityToDisplay);

    const timestamp = document.createElement("time");
    timestamp.className = "log-row-timestamp";
    timestamp.dateTime =
      typeof logRow.timeUnixNano === "bigint"
        ? new Date(Number(logRow.timeUnixNano / 1000000n)).toISOString()
        : new Date((logRow.timeUnixNano ?? 0) / 1e6).toISOString();
    timestamp.textContent = formatNanoseconds(logRow.timeUnixNano);

    const message = document.createElement("span");
    message.className = "log-row-message";
    message.appendChild(buildTemplateFragment(logRow));

    summary.append(expanderWrapper, timestamp, severity, message);
    logElement.appendChild(summary);
    logElement.appendChild(createMetaSection(logRow));

    logElement.addEventListener("toggle", () => {
      if (logElement.open) {
        expandedLogIds.add(logRow.id);
      } else {
        expandedLogIds.delete(logRow.id);
      }
      expander.setAttribute("aria-expanded", String(logElement.open));
    });

    logsList.append(logElement);
  });

  logsSection.append(logsList);
  return logsSection;
}

function renderSpanDetails(span) {
  const details = document.createElement("div");
  details.className = "trace-span__details";

  // Add logs section filtered by span ID (includes span start, events, logs, and span end converted to log rows)
  const logsSection = renderSpanLogs(span);
  if (logsSection) {
    details.append(logsSection);
  }

  return details;
}

function renderSpanSummary(trace, node, timeWindow = { start: 0, end: 100 }) {
  const summary = document.createElement("div");
  summary.className = "trace-span__summary";
  summary.dataset.depth = String(node.depth);
  summary.style.setProperty("--depth", String(node.depth));

  // Create wrapper for expander and service that can be indented
  const leftSection = document.createElement("div");
  leftSection.className = "trace-span__left";
  leftSection.style.paddingLeft = `calc(var(--depth) * var(--trace-indent-width, 1rem))`;

  const expander = document.createElement("button");
  expander.type = "button";
  expander.className = "trace-span__expander";
  expander.setAttribute(
    "aria-label",
    node.children.length ? "Toggle child spans" : "No child spans"
  );
  expander.disabled = !node.children.length;
  leftSection.append(expander);

  const service = document.createElement("button");
  service.type = "button";
  service.className = "trace-span__service";
  const serviceName = node.span.resource?.serviceName || "unknown-service";
  const namespace = node.span.resource?.serviceNamespace;
  const scope = node.span.instrumentationScope?.name;

  // Get service color for indicator (will compute for bar later too)
  const getServiceColor = (serviceName) => {
    const serviceIdx = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const paletteCols = getPaletteColors();
    const paletteLen = paletteCols.length;
    const colorIdx = serviceIdx % paletteLen;
    const palColor = paletteCols[colorIdx];
    const normColor = normalizeColorBrightness(palColor, 50, 0.7);
    return hexToRgb(normColor);
  };

  const serviceRgb = getServiceColor(serviceName);
  let serviceColorStyle = "";
  if (serviceRgb) {
    serviceColorStyle = `background-color: rgba(${serviceRgb.r}, ${serviceRgb.g}, ${serviceRgb.b}, 0.6);`;
  }

  service.innerHTML = `
    <span class="trace-span__service-indicator" style="${serviceColorStyle}"></span>
    <span class="trace-span__service-name">${serviceName}</span>
    ${namespace ? `<span class="trace-span__service-namespace">${namespace}</span>` : ""}
    ${scope ? `<span class="trace-span__scope">${scope}</span>` : ""}
  `;
  if (!node.children.length) {
    service.disabled = true;
    service.setAttribute("aria-disabled", "true");
  }
  leftSection.append(service);

  summary.append(leftSection);

  const timeline = document.createElement("button");
  timeline.type = "button";
  timeline.className = "trace-span__timeline";
  timeline.setAttribute("aria-label", "Toggle span details");
  const offsets = computeSpanOffsets(trace, node.span, timeWindow);
  timeline.style.setProperty("--span-start", `${offsets.startPercent}%`);
  timeline.style.setProperty("--span-width", `${offsets.widthPercent}%`);

  // Timeline markers are added at trace-span-list level, not per timeline

  const bar = document.createElement("div");
  bar.className = "trace-span__bar";

  // Hide the bar if span is fully outside the time window
  if (offsets.widthPercent === 0) {
    bar.style.display = "none";
  }

  // Get palette color based on service name index
  const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
  const paletteColors = getPaletteColors();
  const paletteLength = paletteColors.length;
  const colorIndex = serviceIndex % paletteLength;
  // Normalize color to lighter shade with reduced saturation for subtle effect
  const paletteColor = paletteColors[colorIndex];
  const normalizedColor = normalizeColorBrightness(paletteColor, 50, 0.7); // Lighter (50%) and desaturated (70% of original saturation)

  // Convert hex to RGB for rgba with opacity
  const rgb = hexToRgb(normalizedColor);
  if (rgb) {
    // Use rgba with 0.6 opacity for less intense colors
    bar.style.setProperty("--service-color", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
    bar.style.setProperty("--service-shadow", `0 0 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  }

  const name = document.createElement("span");
  name.className = "trace-span__name";
  name.textContent = node.span.name;
  bar.append(name);

  const duration = document.createElement("span");
  duration.className = "trace-span__duration";
  duration.textContent = formatDurationNano(
    toNumberTimestamp(node.span.endTimeUnixNano) -
    toNumberTimestamp(node.span.startTimeUnixNano)
  );

  bar.append(duration);

  // Add markers for logs and events
  const markers = renderSpanMarkers(node.span, trace, timeWindow);
  if (markers) {
    bar.append(markers);
  }

  timeline.append(bar);
  summary.append(timeline);

  return { summary, expander, service, timeline };
}

// Ensure collapsing a span clears state for all nested spans so we do not
// accidentally reopen them on the next render.
function pruneDescendantState(node, state) {
  if (!state) {
    return;
  }
  node.children.forEach((child) => {
    state.expandedChildren.delete(child.span.spanId);
    state.expandedAttributes.delete(child.span.spanId);
    pruneDescendantState(child, state);
  });
}

function renderSpanNode(trace, node, state, isLastChild = false, parentDepth = -1) {
  const container = document.createElement("div");
  container.className = "trace-span";
  const hasChildren = node.children.length > 0;
  if (!hasChildren) {
    container.classList.add("trace-span--leaf");
  }

  // Set depth as CSS variable for tree line positioning
  container.style.setProperty("--depth", node.depth);

  // Mark if this is the last child for tree line styling
  if (isLastChild) {
    container.classList.add("trace-span--last-child");
  }

  // Mark if this has a parent (depth > 0) for tree line continuation
  if (node.depth > 0) {
    container.classList.add("trace-span--has-parent");
  }

  const timeWindow = {
    start: state?.timeWindowStart ?? 0,
    end: state?.timeWindowEnd ?? 100,
  };

  const { summary, expander, service, timeline } = renderSpanSummary(
    trace,
    node,
    timeWindow
  );
  container.append(summary);

  const spanState = state ?? {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
  };

  const detailSections = renderSpanDetails(node.span);
  const hasDetails = detailSections.childElementCount > 0;
  if (hasDetails) {
    detailSections.id = `trace-span-details-${node.span.spanId}`;
    container.append(detailSections);
  }

  let childrenContainer = null;
  if (hasChildren) {
    const body = document.createElement("div");
    body.className = "trace-span__body";
    childrenContainer = document.createElement("div");
    childrenContainer.className = "trace-span__children";
    childrenContainer.id = `trace-span-children-${node.span.spanId}`;
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1;
      childrenContainer.append(renderSpanNode(trace, child, spanState, isLast, node.depth));
    });
    body.append(childrenContainer);
    container.append(body);
  }

  const spanId = node.span.spanId;
  const childrenOpen = hasChildren && spanState.expandedChildren.has(spanId);
  if (childrenContainer) {
    container.classList.toggle("trace-span--children-open", childrenOpen);
    childrenContainer.hidden = !childrenOpen;
    expander.setAttribute("aria-controls", childrenContainer.id);
    expander.setAttribute("aria-expanded", String(childrenOpen));
    service.setAttribute("aria-controls", childrenContainer.id);
    service.setAttribute("aria-expanded", String(childrenOpen));
  } else {
    expander.setAttribute("aria-expanded", "false");
    service.setAttribute("aria-expanded", "false");
  }

  let detailsOpen = hasDetails && spanState.expandedAttributes.has(spanId);
  if (hasDetails) {
    timeline.setAttribute("aria-controls", detailSections.id);
    // Don't use hidden - let CSS handle the fade-in animation
    timeline.setAttribute("aria-expanded", String(detailsOpen));
    container.classList.toggle("trace-span--details-open", detailsOpen);
  } else {
    timeline.disabled = true;
    timeline.setAttribute("aria-disabled", "true");
    timeline.setAttribute("aria-expanded", "false");
  }

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
    } else {
      spanState.expandedChildren.delete(spanId);
      pruneDescendantState(node, spanState);
    }
  };

  expander.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleChildren();
  });

  service.addEventListener("click", (event) => {
    if (service.disabled) {
      return;
    }
    event.stopPropagation();
    toggleChildren();
  });

  timeline.addEventListener("click", (event) => {
    if (!hasDetails || timeline.disabled) {
      return;
    }
    event.stopPropagation();
    detailsOpen = !detailsOpen;
    container.classList.toggle("trace-span--details-open", detailsOpen);
    // Don't use hidden - let CSS handle the animation
    timeline.setAttribute("aria-expanded", String(detailsOpen));
    if (detailsOpen) {
      spanState.expandedAttributes.add(spanId);
    } else {
      spanState.expandedAttributes.delete(spanId);
    }
  });

  return container;
}

function collectSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    bucket.add(node.span.spanId);
    collectSpanIds(node.children, bucket);
  });
  return bucket;
}

// Gather every span that has children so we can expand the whole tree by default.
function collectExpandableSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    if (node.children.length) {
      bucket.add(node.span.spanId);
      collectExpandableSpanIds(node.children, bucket);
    }
  });
  return bucket;
}

function pruneInvalidState(trace, state) {
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

// Expand all spans with children on first render so the entire trace is visible.
function ensureChildrenExpanded(trace, state) {
  if (!state || state.initializedChildren) {
    return;
  }
  const expandableIds = collectExpandableSpanIds(trace.roots);
  expandableIds.forEach((id) => {
    state.expandedChildren.add(id);
  });
  state.initializedChildren = true;
}

function createTraceViewState(trace) {
  const state = {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
    initializedChildren: false,
    timeWindowStart: 0, // Percentage of trace (0-100)
    timeWindowEnd: 100, // Percentage of trace (0-100)
  };
  ensureChildrenExpanded(trace, state);
  return state;
}


export function renderTrace(host, trace, state) {
  const viewState = state ?? createTraceViewState(trace);
  if (!host) {
    return viewState;
  }
  pruneInvalidState(trace, viewState);
  ensureChildrenExpanded(trace, viewState);

  host.innerHTML = "";

  const header = document.createElement("header");
  header.className = "trace-header";

  const title = document.createElement("h3");
  title.textContent = `Trace ${trace.traceId}`;
  header.append(title);

  const meta = document.createElement("p");
  meta.className = "trace-meta";
  meta.textContent = `Spans: ${trace.spanCount} • Window: ${formatTimestamp(
    trace.startTimeUnixNano
  )} – ${formatTimestamp(trace.endTimeUnixNano)}`;
  header.append(meta);

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

  const list = document.createElement("div");
  list.className = "trace-span-list";

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
  const container = document.createElement("div");
  container.className = "trace-timeline-markers";

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

    const marker = document.createElement("div");
    marker.className = "trace-timeline-marker";
    marker.style.left = `${position}%`;

    // Add top label
    const topLabel = document.createElement("div");
    topLabel.className = "trace-timeline-marker__label trace-timeline-marker__label--top";
    topLabel.textContent = formatDurationMs(absoluteTimeDelta);
    marker.append(topLabel);

    // Add bottom label
    const bottomLabel = document.createElement("div");
    bottomLabel.className = "trace-timeline-marker__label trace-timeline-marker__label--bottom";
    bottomLabel.textContent = formatDurationMs(absoluteTimeDelta);
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
  const splitter = document.createElement("div");
  splitter.className = "trace-viewer__splitter";
  splitter.setAttribute("aria-label", "Resize service column");

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

export function initTraceViewer(host, spans) {
  console.log("[initTraceViewer] Called, host:", host);
  if (!host) {
    console.log("[initTraceViewer] No host, returning empty functions");
    return { render: () => { }, update: () => { } };
  }
  const trace = buildTraceModel(spans);
  let viewState = renderTrace(host, trace);
  let previewComponent = viewState.preview; // Store preview reference
  console.log("[initTraceViewer] Trace viewer initialized, previewComponent:", previewComponent);

  /**
   * Recomputes and updates all computed colors in the trace viewer
   * without full re-rendering. Updates:
   * - Service color indicators in span summaries
   * - Span bar colors (CSS custom properties)
   * - SVG preview background color
   * - SVG preview span rectangle fill colors
   */
  const update = () => {
    console.log("[Trace Viewer Update] update() method called!");
    // Force a reflow to ensure CSS variables are applied
    void host.offsetWidth;

    // Always get the latest preview component reference
    const currentPreview = viewState?.preview || previewComponent;

    // Read fresh palette colors from CSS variables
    const paletteColors = getPaletteColors();
    console.log("[Trace Viewer Update] Palette colors read:", paletteColors);
    if (paletteColors.length === 0) {
      // If no palette colors available, skip update
      console.warn("[Trace Viewer Update] No palette colors available, skipping update");
      return;
    }
    const paletteLength = paletteColors.length;

    // Helper to compute service color
    const computeServiceColor = (serviceName) => {
      const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
      const colorIndex = serviceIndex % paletteLength;
      const paletteColor = paletteColors[colorIndex];
      if (!paletteColor) {
        // Fallback if palette color is missing
        return "#61afef";
      }
      return normalizeColorBrightness(paletteColor, 50, 0.7);
    };

    // Update service color indicators in span summaries
    const serviceButtons = host.querySelectorAll(".trace-span__service");
    console.log(`[Trace Viewer Update] Found ${serviceButtons.length} service buttons to update`);
    let updateCount = 0;
    serviceButtons.forEach((serviceButton) => {
      const serviceName = serviceButton.querySelector(".trace-span__service-name")?.textContent || "unknown-service";
      const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
      const normalizedColor = computeServiceColor(serviceName);
      const rgb = hexToRgb(normalizedColor);

      if (rgb) {
        const serviceColorStyle = `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6);`;
        const indicator = serviceButton.querySelector(".trace-span__service-indicator");
        if (indicator) {
          indicator.style.cssText = serviceColorStyle;
          updateCount++;
          if (updateCount <= 3) { // Log first 3 to avoid spam
            console.log(`[Trace Viewer Update] Service indicator: service="${serviceName}", index=${serviceIndex}, color="${normalizedColor}", rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
          }
        }
      }
    });
    console.log(`[Trace Viewer Update] Updated ${updateCount} service indicators`);

    // Update span bar colors (CSS custom properties)
    const bars = host.querySelectorAll(".trace-span__bar");
    console.log(`[Trace Viewer Update] Found ${bars.length} span bars to update`);
    let barUpdateCount = 0;
    bars.forEach((bar) => {
      // Find the service name from the parent span
      const summary = bar.closest(".trace-span__summary");
      if (!summary) return;

      const serviceButton = summary.querySelector(".trace-span__service");
      if (!serviceButton) return;

      const serviceName = serviceButton.querySelector(".trace-span__service-name")?.textContent || "unknown-service";
      const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
      const normalizedColor = computeServiceColor(serviceName);
      const rgb = hexToRgb(normalizedColor);

      if (rgb) {
        const colorValue = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        const shadowValue = `0 0 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
        bar.style.setProperty("--service-color", colorValue);
        bar.style.setProperty("--service-shadow", shadowValue);
        barUpdateCount++;
        if (barUpdateCount <= 3) { // Log first 3 to avoid spam
          console.log(`[Trace Viewer Update] Span bar: service="${serviceName}", index=${serviceIndex}, color="${normalizedColor}", --service-color="${colorValue}"`);
        }
      }
    });
    console.log(`[Trace Viewer Update] Updated ${barUpdateCount} span bars`);

    // Update SVG preview component using its update method
    if (currentPreview && typeof currentPreview.update === "function") {
      currentPreview.update();
    } else {
      // Fallback: try to find and update preview via DOM query
      const previewElement = host.querySelector(".trace-preview");
      if (previewElement && previewElement.__previewComponent) {
        previewElement.__previewComponent.update();
      }
    }
  };

  const render = () => {
    viewState = renderTrace(host, trace, viewState);
    // Update preview reference after re-render
    previewComponent = viewState.preview;
  };

  return { render, update };
}

// sampleTraceSpans moved to ui/sampleData.js
export { sampleTraceSpans } from "./sampleData.js";
