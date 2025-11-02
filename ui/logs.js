/**
 * Gravibe Log Console Toolkit
 * Provides lightweight data model helpers and rendering utilities inspired by
 * the OpenTelemetry Logs v1 protobuf definition. The goal is to keep the
 * structure mappable from the proto payloads while remaining ergonomic in JS.
 */

import { formatAnyValueInline, formatAnyValueMultiline, createAttributeTable } from "./attributes.js";

/**
 * @typedef {Object} LogAnyValue
 * @property {"string"|"boolean"|"int"|"double"|"bytes"|"array"|"kvlist"|"empty"} kind
 * @property {string|number|boolean|Uint8Array|LogAnyValue[]|Array<{key:string,value:LogAnyValue}>|null} value
 */

/**
 * @typedef {Object} LogAttribute
 * @property {string} key
 * @property {LogAnyValue} value
 * @property {string=} description
 */

/**
 * @typedef {Object} LogRow
 * @property {string} id
 * @property {bigint|number} timeUnixNano
 * @property {bigint|number=} observedTimeUnixNano
 * @property {number=} severityNumber
 * @property {string=} severityText
 * @property {LogAnyValue=} body
 * @property {LogAttribute[]} attributes
 * @property {number=} droppedAttributesCount
 * @property {number=} flags
 * @property {string=} traceId
 * @property {string=} spanId
 * @property {string} template
 */

export const LogAnyValueKind = Object.freeze({
  STRING: "string",
  BOOLEAN: "boolean",
  INT: "int",
  DOUBLE: "double",
  BYTES: "bytes",
  ARRAY: "array",
  KVLIST: "kvlist",
  EMPTY: "empty",
});

function asUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }
  if (typeof value === "string") {
    const clean = value.replace(/[^0-9a-fA-F]/g, "");
    if (clean.length % 2 !== 0) {
      return new Uint8Array();
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16) & 0xff;
    }
    return bytes;
  }
  return new Uint8Array();
}

/**
 * Normalizes an AnyValue like structure so templates can use a consistent shape.
 * The converter accepts already-normalized values or a proto-like object with the
 * canonical field names (string_value, bool_value, etc).
 * @param {LogAnyValue | Record<string, any> | null | undefined} input
 * @returns {LogAnyValue}
 */
export function normalizeAnyValue(input) {
  if (!input || typeof input !== "object") {
    return { kind: LogAnyValueKind.EMPTY, value: null };
  }

  if ("kind" in input && "value" in input) {
    const kind = input.kind;
    if (kind === LogAnyValueKind.BYTES) {
      return { kind, value: asUint8Array(input.value) };
    }
    if (kind === LogAnyValueKind.ARRAY && Array.isArray(input.value)) {
      return {
        kind,
        value: input.value.map((item) => normalizeAnyValue(item)),
      };
    }
    if (kind === LogAnyValueKind.KVLIST && Array.isArray(input.value)) {
      return {
        kind,
        value: input.value.map(({ key, value }) => ({
          key,
          value: normalizeAnyValue(value),
        })),
      };
    }
    return input;
  }

  if (Object.prototype.hasOwnProperty.call(input, "string_value")) {
    return { kind: LogAnyValueKind.STRING, value: input.string_value ?? "" };
  }
  if (Object.prototype.hasOwnProperty.call(input, "bool_value")) {
    return { kind: LogAnyValueKind.BOOLEAN, value: Boolean(input.bool_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "int_value")) {
    return { kind: LogAnyValueKind.INT, value: Number(input.int_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "double_value")) {
    return { kind: LogAnyValueKind.DOUBLE, value: Number(input.double_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "bytes_value")) {
    return { kind: LogAnyValueKind.BYTES, value: asUint8Array(input.bytes_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "array_value")) {
    const rawValues = Array.isArray(input.array_value?.values)
      ? input.array_value.values
      : [];
    return {
      kind: LogAnyValueKind.ARRAY,
      value: rawValues.map((item) => normalizeAnyValue(item)),
    };
  }
  if (Object.prototype.hasOwnProperty.call(input, "kvlist_value")) {
    const rawList = Array.isArray(input.kvlist_value?.values)
      ? input.kvlist_value.values
      : [];
    return {
      kind: LogAnyValueKind.KVLIST,
      value: rawList.map((entry) => ({
        key: entry?.key ?? "",
        value: normalizeAnyValue(entry?.value ?? null),
      })),
    };
  }

  return { kind: LogAnyValueKind.EMPTY, value: null };
}

/**
 * Creates a LogAttribute aligned with the proto KeyValue definition.
 * @param {string} key
 * @param {LogAnyValue | Record<string, any> | null | undefined} rawValue
 * @param {string=} description
 * @returns {LogAttribute}
 */
export function createLogAttribute(key, rawValue, description = "") {
  return {
    key,
    value: normalizeAnyValue(rawValue),
    description,
  };
}

/**
 * Creates a structured log row. The shape mirrors LogRecord while injecting a
 * template useful for formatted rendering.
 * @param {Omit<LogRow, "attributes"> & { attributes: Array<LogAttribute | { key: string; value: any; description?: string }> }} params
 * @returns {LogRow}
 */
export function createLogRow(params) {
  const {
    attributes = [],
    id,
    template,
    timeUnixNano,
    observedTimeUnixNano,
    severityNumber,
    severityText,
    body,
    droppedAttributesCount,
    flags,
    traceId,
    spanId,
  } = params;

  if (!id) {
    throw new Error("LogRow requires an id");
  }
  if (!template) {
    throw new Error("LogRow requires a template string");
  }
  if (typeof timeUnixNano !== "bigint" && typeof timeUnixNano !== "number") {
    throw new Error("LogRow requires timeUnixNano as number or bigint");
  }

  const normalizedAttributes = attributes.map((attribute) => {
    if (attribute && typeof attribute === "object" && "key" in attribute && "value" in attribute) {
      return {
        key: attribute.key,
        value: normalizeAnyValue(attribute.value),
        description: attribute.description ?? "",
      };
    }
    if (attribute && typeof attribute === "object" && "key" in attribute) {
      return createLogAttribute(attribute.key, attribute.value, attribute.description ?? "");
    }
    throw new Error(`Invalid attribute provided for log row ${id}`);
  });

  return {
    id,
    template,
    timeUnixNano,
    observedTimeUnixNano,
    severityNumber,
    severityText,
    body: body ? normalizeAnyValue(body) : undefined,
    attributes: normalizedAttributes,
    droppedAttributesCount,
    flags,
    traceId,
    spanId,
  };
}

function extractTemplatePlaceholders(template) {
  if (!template || typeof template !== "string") {
    return new Set();
  }
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set();
  let match = regex.exec(template);
  while (match) {
    if (match[1]) {
      matches.add(match[1].trim());
    }
    match = regex.exec(template);
  }
  return matches;
}

function describeAttribute(attribute) {
  if (!attribute) {
    return "";
  }
  return attribute.key || "";
}

function isValidSeverityNumber(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 24;
}

function validateTraceContext(row) {
  const issues = [];
  if (row.traceId && typeof row.traceId === "string" && row.traceId.trim()) {
    if (row.traceId.length !== 32) {
      issues.push({ level: "warning", message: `TraceId should be 32 characters, found ${row.traceId.length}.` });
    }
  }
  if (row.spanId && typeof row.spanId === "string" && row.spanId.trim()) {
    if (row.spanId.length !== 16) {
      issues.push({ level: "warning", message: `SpanId should be 16 characters, found ${row.spanId.length}.` });
    }
  }
  if (row.traceId && !row.spanId) {
    issues.push({ level: "warning", message: "TraceId provided without a spanId." });
  }
  return issues;
}

export function validateLogRows(rows) {
  const result = { errors: [], warnings: [] };
  if (!Array.isArray(rows)) {
    result.errors.push({ level: "error", message: "Log rows must be provided as an array." });
    return result;
  }

  const ids = new Set();

  rows.forEach((row, index) => {
    const context = row?.id ? `Log "${row.id}"` : `Log @ index ${index}`;

    if (!row || typeof row !== "object") {
      result.errors.push({ level: "error", message: `${context}: Row must be an object.` });
      return;
    }

    if (!row.id) {
      result.errors.push({ level: "error", message: `${context}: Missing required id.` });
    } else if (ids.has(row.id)) {
      result.warnings.push({ level: "warning", message: `${context}: Duplicate id detected.` });
    } else {
      ids.add(row.id);
    }

    if (typeof row.timeUnixNano !== "number" && typeof row.timeUnixNano !== "bigint") {
      result.errors.push({ level: "error", message: `${context}: timeUnixNano must be a number or bigint.` });
    }

    if (
      row.observedTimeUnixNano !== undefined &&
      typeof row.observedTimeUnixNano !== "number" &&
      typeof row.observedTimeUnixNano !== "bigint"
    ) {
      result.warnings.push({ level: "warning", message: `${context}: observedTimeUnixNano should be a number or bigint.` });
    }

    if (
      typeof row.timeUnixNano === "number" &&
      typeof row.observedTimeUnixNano === "number" &&
      row.observedTimeUnixNano < row.timeUnixNano
    ) {
      result.warnings.push({ level: "warning", message: `${context}: observedTimeUnixNano occurs before timeUnixNano.` });
    }

    if (row.severityNumber !== undefined && !isValidSeverityNumber(row.severityNumber)) {
      result.warnings.push({
        level: "warning",
        message: `${context}: severityNumber should be an integer between 1 and 24.`,
      });
    }

    const attributes = Array.isArray(row.attributes) ? row.attributes : [];
    const attributeKeys = new Set();
    attributes.forEach((attribute, attrIndex) => {
      if (!attribute || typeof attribute !== "object") {
        result.errors.push({
          level: "error",
          message: `${context}: Attribute at index ${attrIndex} must be an object.`,
        });
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

    const placeholders = extractTemplatePlaceholders(row.template ?? "");
    placeholders.forEach((placeholder) => {
      if (!attributeKeys.has(placeholder)) {
        result.warnings.push({
          level: "warning",
          message: `${context}: Template placeholder "${placeholder}" does not match any attribute key.`,
        });
      }
    });

    validateTraceContext(row).forEach((issue) => {
      result.warnings.push({ level: issue.level, message: `${context}: ${issue.message}` });
    });
  });

  return result;
}

function renderValidationBanner(host, validation) {
  const hasErrors = validation.errors?.length;
  const hasWarnings = validation.warnings?.length;
  if (!hasErrors && !hasWarnings) {
    return null;
  }

  const banner = document.createElement("section");
  banner.className = "validation-banner";

  const title = document.createElement("h3");
  title.className = "validation-banner__title";
  title.textContent = hasErrors ? "Log validation issues" : "Log validation warnings";
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

  banner.append(list);
  host.append(banner);
  return banner;
}

// Collapse the proto severity spectrum into the four common log levels so the
// UI can style each row with a predictable palette.
const severityGroups = [
  {
    name: "debug",
    numbers: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    pattern: /trace|debug/i,
  },
  {
    name: "info",
    numbers: new Set([9, 10, 11, 12]),
    pattern: /info/i,
  },
  {
    name: "warn",
    numbers: new Set([13, 14, 15, 16]),
    pattern: /warn|warning/i,
  },
  {
    name: "error",
    numbers: new Set([17, 18, 19, 20, 21, 22, 23, 24]),
    pattern: /error|fatal|critical/i,
  },
];

export function resolveSeverityGroup(logRow) {
  const { severityNumber, severityText } = logRow;
  // Special handling for "event", "span", and "critical" severity
  if (typeof severityText === "string") {
    const lowerText = severityText.toLowerCase();
    if (lowerText === "event" || lowerText === "span") {
      return lowerText;
    }
    // Handle "critical" as a separate severity level
    if (lowerText === "critical" || lowerText.startsWith("crt")) {
      return "critical";
    }
  }
  if (typeof severityNumber === "number") {
    for (const group of severityGroups) {
      if (group.numbers.has(severityNumber)) {
        return group.name;
      }
    }
  }
  if (typeof severityText === "string" && severityText.trim()) {
    const match = severityGroups.find((group) => group.pattern.test(severityText));
    if (match) {
      return match.name;
    }
  }
  return "info";
}

/**
 * Abbreviates log level text to a shorter format.
 * @param {string} severityText - The severity text to abbreviate (case-insensitive)
 * @returns {string} The abbreviated log level
 */
export function abbreviateLogLevel(severityText) {
  if (!severityText || typeof severityText !== "string") {
    return "inf";
  }
  const lower = severityText.toLowerCase().trim();
  // Handle common variations
  if (lower === "debug" || lower.startsWith("dbg")) {
    return "dbg";
  }
  if (lower === "info" || lower === "information" || lower.startsWith("inf")) {
    return "inf";
  }
  if (lower === "warn" || lower === "warning" || lower.startsWith("wrn")) {
    return "wrn";
  }
  if (lower === "error" || lower.startsWith("err")) {
    return "err";
  }
  if (lower === "critical" || lower.startsWith("crt")) {
    return "crt";
  }
  if (lower === "span" || lower.startsWith("spn")) {
    return "spn";
  }
  if (lower === "event" || lower.startsWith("evt")) {
    return "evt";
  }
  // Default fallback
  return "inf";
}

export function createAttributeBadge(attribute) {
  const badge = document.createElement("span");
  badge.className = `log-attr log-attr--${attribute.value.kind}`;
  badge.dataset.attrKey = attribute.key;
  badge.textContent = formatAnyValueInline(attribute.value);
  return badge;
}

export function buildTemplateFragment(logRow) {
  const fragment = document.createDocumentFragment();
  const template = logRow.template ?? "";
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  const attributeMap = new Map(logRow.attributes.map((attr) => [attr.key, attr]));

  let match = regex.exec(template);
  while (match) {
    const preceding = template.slice(lastIndex, match.index);
    if (preceding) {
      fragment.appendChild(document.createTextNode(preceding));
    }
    const rawKey = match[1]?.trim();
    if (rawKey && attributeMap.has(rawKey)) {
      fragment.appendChild(createAttributeBadge(attributeMap.get(rawKey)));
    } else {
      fragment.appendChild(document.createTextNode(match[0]));
    }
    lastIndex = regex.lastIndex;
    match = regex.exec(template);
  }

  const tail = template.slice(lastIndex);
  if (tail) {
    fragment.appendChild(document.createTextNode(tail));
  }
  return fragment;
}

export function formatNanoseconds(value) {
  if (typeof value === "bigint") {
    const ms = Number(value / 1000000n);
    return new Date(ms).toLocaleString();
  }
  if (typeof value === "number") {
    const ms = value / 1e6;
    return new Date(ms).toLocaleString();
  }
  return "—";
}

// Re-export for external consumers
export { formatAnyValueInline, formatAnyValueMultiline, createAttributeTable } from "./attributes.js";

export function createMetaSection(logRow) {
  const wrapper = document.createElement("div");
  wrapper.className = "log-row-details";

  // Build combined attributes list with virtual trace/span ID attributes first
  const allAttributes = [];

  // Add trace ID as first virtual attribute if present
  if (logRow.traceId && typeof logRow.traceId === "string" && logRow.traceId.length > 0) {
    allAttributes.push({
      key: "trace.id",
      value: { kind: LogAnyValueKind.STRING, value: logRow.traceId },
    });
  }

  // Add span ID as second virtual attribute if present
  if (logRow.spanId && typeof logRow.spanId === "string" && logRow.spanId.length > 0) {
    allAttributes.push({
      key: "span.id",
      value: { kind: LogAnyValueKind.STRING, value: logRow.spanId },
    });
  }

  // Add actual attributes after virtual ones
  allAttributes.push(...logRow.attributes);

  if (allAttributes.length > 0) {
    const attributesSection = document.createElement("section");
    attributesSection.className = "log-row-attributes";
    attributesSection.appendChild(createAttributeTable(allAttributes));
    wrapper.appendChild(attributesSection);
  }

  return wrapper;
}

/**
 * Creates a log card component - similar to log row but optimized for card format.
 * Always shows expanded details.
 * @param {LogRow} logRow - The log row data (can be from logs, events, or spans)
 * @returns {HTMLElement} The card element
 */
export function createLogCard(logRow) {
  const card = document.createElement("div");
  card.className = `log-card log-card--severity-${resolveSeverityGroup(logRow)}`;
  card.dataset.rowId = logRow.id;

  // Header section: timestamp : severity
  const header = document.createElement("div");
  header.className = "log-card-header";

  const timestamp = document.createElement("time");
  timestamp.className = "log-card-timestamp";
  timestamp.dateTime =
    typeof logRow.timeUnixNano === "bigint"
      ? new Date(Number(logRow.timeUnixNano / 1000000n)).toISOString()
      : new Date((logRow.timeUnixNano ?? 0) / 1e6).toISOString();
  timestamp.textContent = formatNanoseconds(logRow.timeUnixNano);

  const severity = document.createElement("span");
  severity.className = "log-card-severity";
  const severityGroup = resolveSeverityGroup(logRow);
  const severityToDisplay = logRow.severityText ?? severityGroup;
  severity.textContent = abbreviateLogLevel(severityToDisplay);

  header.append(timestamp, document.createTextNode(" : "), severity);

  // Message section: rendered log text with colored attributes
  const messageSection = document.createElement("div");
  messageSection.className = "log-card-message";
  messageSection.appendChild(buildTemplateFragment(logRow));

  // Details section: always expanded
  const detailsSection = createMetaSection(logRow);
  detailsSection.className = "log-card-details";

  card.append(header, messageSection, detailsSection);

  return card;
}

function createLogRowElement(logRow, expandedIds) {
  const details = document.createElement("details");
  details.className = `log-row log-row--severity-${resolveSeverityGroup(logRow)}`;
  details.dataset.rowId = logRow.id;
  if (expandedIds.has(logRow.id)) {
    details.open = true;
  }

  const summary = document.createElement("summary");
  summary.className = "log-row-summary";

  const expanderWrapper = document.createElement("span");
  expanderWrapper.className = "log-row__expander-wrapper";
  const expander = document.createElement("button");
  expander.className = "log-row__expander";
  expander.type = "button";
  expander.setAttribute("aria-expanded", String(details.open));
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
  details.appendChild(summary);
  details.appendChild(createMetaSection(logRow));

  details.addEventListener("toggle", () => {
    if (details.open) {
      expandedIds.add(logRow.id);
    } else {
      expandedIds.delete(logRow.id);
    }
    expander.setAttribute("aria-expanded", String(details.open));
  });

  return details;
}

class LogConsoleView {
  /**
   * @param {HTMLElement} root
   * @param {LogRow[]} rows
   */
  constructor(root, rows) {
    this.root = root;
    this.rows = rows;
    this.expandedIds = new Set();
  }

  setRows(rows) {
    this.rows = rows;
    this.render();
  }

  render() {
    if (!this.root) {
      return;
    }

    const previouslyOpen = new Set();
    this.root.querySelectorAll(".log-row[open]").forEach((element) => {
      const id = element.getAttribute("data-row-id");
      if (id) {
        previouslyOpen.add(id);
      }
    });
    if (previouslyOpen.size) {
      this.expandedIds = previouslyOpen;
    }

    this.root.innerHTML = "";
    const list = document.createElement("div");
    list.className = "log-console-list";

    this.rows.forEach((row) => {
      const element = createLogRowElement(row, this.expandedIds);
      list.appendChild(element);
    });

    this.root.appendChild(list);
  }

  /**
   * Recomputes and updates all computed colors in the log console
   * without full re-rendering. Currently log rows use CSS variables
   * so no updates are needed, but this method exists for consistency.
   */
  update() {
    // Log rows use CSS variables for colors (--logging-*), so they update automatically
    // No manual updates needed
  }
}

/**
 * Initializes a log console inside the provided element.
 * @param {HTMLElement | null} hostElement
 * @param {LogRow[]} rows
 * @returns {{render: () => void, update: () => void}} Component interface with render and update methods
 */
export function initLogConsole(hostElement, rows) {
  if (!hostElement) {
    return { render: () => { }, update: () => { } };
  }
  const view = new LogConsoleView(hostElement, rows);
  view.render();
  return {
    render: () => view.render(),
    update: () => view.update()
  };
}

function nowNano(offsetMs = 0) {
  const base = BigInt(Date.now() + offsetMs);
  return base * 1000000n;
}

const anyValues = {
  string: (value) => ({ kind: LogAnyValueKind.STRING, value }),
  bool: (value) => ({ kind: LogAnyValueKind.BOOLEAN, value }),
  int: (value) => ({ kind: LogAnyValueKind.INT, value }),
  double: (value) => ({ kind: LogAnyValueKind.DOUBLE, value }),
  bytes: (value) => ({ kind: LogAnyValueKind.BYTES, value: asUint8Array(value) }),
  array: (values) => ({ kind: LogAnyValueKind.ARRAY, value: values.map((item) => normalizeAnyValue(item)) }),
  kvlist: (entries) => ({
    kind: LogAnyValueKind.KVLIST,
    value: entries.map(([key, value]) => ({ key, value: normalizeAnyValue(value) })),
  }),
};

function fakeTraceId(seed) {
  return seed.padEnd(32, "0").slice(0, 32);
}

function fakeSpanId(seed) {
  return seed.padEnd(16, "0").slice(0, 16);
}

/**
 * Generates realistic log entries for a given trace span
 */
function generateLogsForSpan(span) {
  const logs = [];
  // Handle both number and BigInt timestamps
  const startTime = typeof span.startTimeUnixNano === 'bigint' ? Number(span.startTimeUnixNano) : span.startTimeUnixNano;
  const endTime = typeof span.endTimeUnixNano === 'bigint' ? Number(span.endTimeUnixNano) : span.endTimeUnixNano;
  const spanDuration = endTime - startTime;
  const serviceName = span.resource?.serviceName || "unknown";
  const spanName = span.name;
  const isError = span.status?.code === "STATUS_CODE_ERROR";
  const instrumentationScope = span.instrumentationScope?.name || serviceName;

  // Helper to get attribute value
  const getAttr = (key) => span.attributes?.find(a => a.key === key)?.value?.string_value || span.attributes?.find(a => a.key === key)?.value?.int_value;

  // Generate logs based on span type
  if (spanName.includes("HTTP") || spanName.includes("GET") || spanName.includes("POST")) {
    const method = getAttr("http.method") || "GET";
    const target = getAttr("http.target") || "/";
    const userId = getAttr("user.id");

    logs.push(createLogRow({
      id: `log-${span.spanId}-request`,
      template: `HTTP {{http.method}} request received for {{http.target}}`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.05),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("http.method", anyValues.string(method)),
        createLogAttribute("http.target", anyValues.string(target)),
        createLogAttribute("http.status_code", anyValues.int(isError ? 500 : 200)),
        createLogAttribute("service.name", anyValues.string(serviceName)),
        ...(userId ? [createLogAttribute("user.id", anyValues.string(userId))] : []),
      ],
      body: anyValues.string(`${method} ${target} - Processing request`),
    }));

    if (span.events && span.events.length > 0) {
      const headerEvent = span.events.find(e => e.name.includes("header"));
      if (headerEvent) {
        logs.push(createLogRow({
          id: `log-${span.spanId}-headers`,
          template: `Request headers received: {{user.agent}}`,
          timeUnixNano: typeof headerEvent.timeUnixNano === 'bigint' ? Number(headerEvent.timeUnixNano) : headerEvent.timeUnixNano,
          severityNumber: 9,
          severityText: "INFO",
          traceId: span.traceId,
          spanId: span.spanId,
          attributes: [
            createLogAttribute("http.method", anyValues.string(method)),
            createLogAttribute("http.target", anyValues.string(target)),
            createLogAttribute("service.name", anyValues.string(serviceName)),
          ],
          body: anyValues.string("Request headers parsed"),
        }));
      }
    }

    logs.push(createLogRow({
      id: `log-${span.spanId}-response`,
      template: `HTTP {{http.method}} {{http.target}} completed with status {{http.status_code}}`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: isError ? 17 : 9,
      severityText: isError ? "ERROR" : "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("http.method", anyValues.string(method)),
        createLogAttribute("http.target", anyValues.string(target)),
        createLogAttribute("http.status_code", anyValues.int(isError ? 500 : 200)),
        createLogAttribute("duration_ms", anyValues.double(Number(spanDuration) / 1e6)),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(isError ? "Request failed" : "Request completed successfully"),
    }));
  } else if (spanName.includes("Authorize") || spanName.includes("Authz")) {
    logs.push(createLogRow({
      id: `log-${span.spanId}-auth-start`,
      template: `Authorization request received for {{rpc.service}}`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("rpc.system", anyValues.string(getAttr("rpc.system") || "grpc")),
        createLogAttribute("rpc.service", anyValues.string(getAttr("rpc.service") || "AuthzService")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Processing authorization request"),
    }));

    const dbSystem = getAttr("db.system");
    if (dbSystem === "redis") {
      const cacheKey = span.events?.find(e => e.name.includes("cache"))?.attributes?.find(a => a.key.includes("key"))?.value?.string_value;
      logs.push(createLogRow({
        id: `log-${span.spanId}-cache`,
        template: `Cache {{cache.result}} for key {{cache.key}}`,
        timeUnixNano: startTime + Math.floor(spanDuration * 0.3),
        severityNumber: 9,
        severityText: "INFO",
        traceId: span.traceId,
        spanId: span.spanId,
        attributes: [
          createLogAttribute("cache.result", anyValues.string("miss")),
          createLogAttribute("cache.key", anyValues.string(cacheKey || "unknown")),
          createLogAttribute("db.system", anyValues.string("redis")),
          createLogAttribute("service.name", anyValues.string(serviceName)),
        ],
        body: anyValues.string("Cache lookup performed"),
      }));
    }

    logs.push(createLogRow({
      id: `log-${span.spanId}-auth-complete`,
      template: `Authorization {{auth.result}} for {{rpc.service}}`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: isError ? 17 : 9,
      severityText: isError ? "ERROR" : "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("auth.result", anyValues.string(isError ? "denied" : "granted")),
        createLogAttribute("rpc.service", anyValues.string(getAttr("rpc.service") || "AuthzService")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(isError ? "Authorization failed" : "Authorization successful"),
    }));
  } else if (spanName.includes("Lookup") || spanName.includes("Session")) {
    const dbStatement = getAttr("db.statement");
    logs.push(createLogRow({
      id: `log-${span.spanId}-db-query`,
      template: `Database query executed: {{db.statement}}`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.2),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("db.system", anyValues.string(getAttr("db.system") || "postgresql")),
        createLogAttribute("db.statement", anyValues.string(dbStatement || "SELECT")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Executing database query"),
    }));

    logs.push(createLogRow({
      id: `log-${span.spanId}-db-result`,
      template: `Query completed in {{duration.ms}} ms`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("duration.ms", anyValues.double(Number(spanDuration) / 1e6)),
        createLogAttribute("db.system", anyValues.string(getAttr("db.system") || "postgresql")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Database query completed"),
    }));
  } else if (spanName.includes("Render")) {
    const viewName = getAttr("view.name");
    logs.push(createLogRow({
      id: `log-${span.spanId}-render-start`,
      template: `Rendering {{view.name}} page`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("view.name", anyValues.string(viewName || "Unknown")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Starting page render"),
    }));

    if (getAttr("feature.flags")) {
      logs.push(createLogRow({
        id: `log-${span.spanId}-features`,
        template: `Feature flags enabled: {{feature.flags}}`,
        timeUnixNano: startTime + Math.floor(spanDuration * 0.3),
        severityNumber: 9,
        severityText: "INFO",
        traceId: span.traceId,
        spanId: span.spanId,
        attributes: [
          createLogAttribute("view.name", anyValues.string(viewName || "Unknown")),
          createLogAttribute("service.name", anyValues.string(serviceName)),
        ],
        body: anyValues.string("Applying feature flags"),
      }));
    }

    logs.push(createLogRow({
      id: `log-${span.spanId}-render-complete`,
      template: `{{view.name}} rendered successfully`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("view.name", anyValues.string(viewName || "Unknown")),
        createLogAttribute("duration.ms", anyValues.double(Number(spanDuration) / 1e6)),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Page render completed"),
    }));
  } else if (spanName.includes("Inventory") || spanName.includes("Reserve")) {
    const items = getAttr("inventory.items") || span.attributes?.find(a => a.key.includes("items"))?.value?.int_value;
    logs.push(createLogRow({
      id: `log-${span.spanId}-inventory-start`,
      template: `Reserving {{inventory.items}} items from inventory`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("inventory.items", anyValues.int(items || 0)),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Starting inventory reservation"),
    }));

    if (getAttr("db.system") === "mongodb") {
      const region = getAttr("region");
      logs.push(createLogRow({
        id: `log-${span.spanId}-db-query`,
        template: `MongoDB query executed in {{region}} region`,
        timeUnixNano: startTime + Math.floor(spanDuration * 0.5),
        severityNumber: 9,
        severityText: "INFO",
        traceId: span.traceId,
        spanId: span.spanId,
        attributes: [
          createLogAttribute("db.system", anyValues.string("mongodb")),
          createLogAttribute("region", anyValues.string(region || "us-east-1")),
          createLogAttribute("collection", anyValues.string("inventory")),
          createLogAttribute("service.name", anyValues.string(serviceName)),
        ],
        body: anyValues.string("Database query executed"),
      }));
    }

    logs.push(createLogRow({
      id: `log-${span.spanId}-inventory-complete`,
      template: `Inventory reservation {{result}} for {{inventory.items}} items`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: isError ? 17 : 9,
      severityText: isError ? "ERROR" : "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("inventory.items", anyValues.int(items || 0)),
        createLogAttribute("result", anyValues.string(isError ? "failed" : "succeeded")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(isError ? "Inventory reservation failed" : "Inventory reserved successfully"),
    }));
  } else if (spanName.includes("Payment")) {
    const provider = getAttr("payment.provider");
    logs.push(createLogRow({
      id: `log-${span.spanId}-payment-start`,
      template: `Processing payment authorization via {{payment.provider}}`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("payment.provider", anyValues.string(provider || "unknown")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string("Starting payment authorization"),
    }));

    if (span.events && span.events.find(e => e.name.includes("fraud"))) {
      const fraudEvent = span.events.find(e => e.name.includes("fraud"));
      const fraudResult = fraudEvent?.attributes?.find(a => a.key === "result")?.value?.string_value;
      logs.push(createLogRow({
        id: `log-${span.spanId}-fraud-check`,
        template: `Fraud check completed with result: {{fraud.result}}`,
        timeUnixNano: typeof fraudEvent.timeUnixNano === 'bigint' ? Number(fraudEvent.timeUnixNano) : fraudEvent.timeUnixNano,
        severityNumber: fraudResult === "pending_review" ? 13 : 9,
        severityText: fraudResult === "pending_review" ? "WARN" : "INFO",
        traceId: span.traceId,
        spanId: span.spanId,
        attributes: [
          createLogAttribute("fraud.result", anyValues.string(fraudResult || "unknown")),
          createLogAttribute("payment.provider", anyValues.string(provider || "unknown")),
          createLogAttribute("service.name", anyValues.string(serviceName)),
        ],
        body: anyValues.string("Fraud check performed"),
      }));
    }

    const retryCount = getAttr("retry.count");
    if (retryCount) {
      logs.push(createLogRow({
        id: `log-${span.spanId}-retry`,
        template: `Payment retry attempt {{retry.count}}`,
        timeUnixNano: startTime + Math.floor(spanDuration * 0.3),
        severityNumber: 13,
        severityText: "WARN",
        traceId: span.traceId,
        spanId: span.spanId,
        attributes: [
          createLogAttribute("retry.count", anyValues.int(retryCount)),
          createLogAttribute("payment.provider", anyValues.string(provider || "unknown")),
          createLogAttribute("service.name", anyValues.string(serviceName)),
        ],
        body: anyValues.string("Retrying payment authorization"),
      }));
    }

    logs.push(createLogRow({
      id: `log-${span.spanId}-payment-complete`,
      template: `Payment authorization {{result}}: {{error.message}}`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: isError ? 17 : 9,
      severityText: isError ? "ERROR" : "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("result", anyValues.string(isError ? "failed" : "succeeded")),
        createLogAttribute("error.message", anyValues.string(span.status?.message || (isError ? "Payment failed" : ""))),
        createLogAttribute("payment.provider", anyValues.string(provider || "unknown")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(isError ? "Payment authorization failed" : "Payment authorized successfully"),
    }));
  } else {
    // Generic span log
    logs.push(createLogRow({
      id: `log-${span.spanId}-start`,
      template: `{{operation.name}} started`,
      timeUnixNano: startTime + Math.floor(spanDuration * 0.1),
      severityNumber: 9,
      severityText: "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("operation.name", anyValues.string(spanName)),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(`Starting ${spanName}`),
    }));

    logs.push(createLogRow({
      id: `log-${span.spanId}-complete`,
      template: `{{operation.name}} {{result}}`,
      timeUnixNano: endTime - Math.floor(spanDuration * 0.1),
      severityNumber: isError ? 17 : 9,
      severityText: isError ? "ERROR" : "INFO",
      traceId: span.traceId,
      spanId: span.spanId,
      attributes: [
        createLogAttribute("operation.name", anyValues.string(spanName)),
        createLogAttribute("result", anyValues.string(isError ? "failed" : "completed")),
        createLogAttribute("service.name", anyValues.string(serviceName)),
      ],
      body: anyValues.string(isError ? "Operation failed" : "Operation completed"),
    }));
  }

  return logs;
}

// sampleLogRows moved to ui/sampleData.js
// Note: Not re-exporting here to avoid circular dependency
// Import directly from "./sampleData.js" where needed

/**
 * Creates virtual log entries for a span (span start, span end, events).
 * These entries are added to the log array so they can be filtered by span ID.
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
 * Generates log rows from trace spans and appends them to the sample log rows.
 * This is called after both modules are loaded to avoid circular dependencies.
 */
export async function appendLogsFromSpans(spans) {
  // Lazy import to avoid circular dependency
  const { sampleLogRows } = await import("./sampleData.js");

  // Generate realistic logs for each span
  const spanLogs = spans.flatMap(span => generateLogsForSpan(span));
  sampleLogRows.push(...spanLogs);

  // Add virtual log entries (span start, events, span end) for each span
  const virtualLogs = spans.flatMap(span => createVirtualSpanLogs(span));
  sampleLogRows.push(...virtualLogs);

  return sampleLogRows;
}
