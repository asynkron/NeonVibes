/**
 * OpenTelemetry Data Parser
 * Converts OTel collector export format to internal span and log models.
 */

import { createTraceSpan, SpanKind } from "./trace.js";
import { createLogRow, LogAnyValueKind, normalizeAnyValue } from "./logs.js";

/**
 * Maps OTel severity number string enum to numeric value
 * @param {string} severityNumberStr - Severity number as string (e.g., "SEVERITY_NUMBER_INFO")
 * @returns {number|undefined} Numeric severity number (1-24) or undefined
 */
function parseSeverityNumber(severityNumberStr) {
  if (typeof severityNumberStr === "number") {
    return severityNumberStr;
  }
  if (typeof severityNumberStr !== "string") {
    return undefined;
  }

  const severityMap = {
    "SEVERITY_NUMBER_UNSPECIFIED": 0,
    "SEVERITY_NUMBER_TRACE": 1,
    "SEVERITY_NUMBER_TRACE2": 2,
    "SEVERITY_NUMBER_TRACE3": 3,
    "SEVERITY_NUMBER_TRACE4": 4,
    "SEVERITY_NUMBER_DEBUG": 5,
    "SEVERITY_NUMBER_DEBUG2": 6,
    "SEVERITY_NUMBER_DEBUG3": 7,
    "SEVERITY_NUMBER_DEBUG4": 8,
    "SEVERITY_NUMBER_INFO": 9,
    "SEVERITY_NUMBER_INFO2": 10,
    "SEVERITY_NUMBER_INFO3": 11,
    "SEVERITY_NUMBER_INFO4": 12,
    "SEVERITY_NUMBER_WARN": 13,
    "SEVERITY_NUMBER_WARN2": 14,
    "SEVERITY_NUMBER_WARN3": 15,
    "SEVERITY_NUMBER_WARN4": 16,
    "SEVERITY_NUMBER_ERROR": 17,
    "SEVERITY_NUMBER_ERROR2": 18,
    "SEVERITY_NUMBER_ERROR3": 19,
    "SEVERITY_NUMBER_ERROR4": 20,
    "SEVERITY_NUMBER_FATAL": 21,
    "SEVERITY_NUMBER_FATAL2": 22,
    "SEVERITY_NUMBER_FATAL3": 23,
    "SEVERITY_NUMBER_FATAL4": 24,
  };

  return severityMap[severityNumberStr];
}

/**
 * Parses OTel span data from sample1.json format
 * @param {Object} otelSpan - OTel span object with { span: {...}, serviceName: "..." }
 * @returns {import("./trace.js").TraceSpan} Internal span model
 */
export function parseOtelSpan(otelSpan) {
  const spanData = otelSpan.span || otelSpan;
  const serviceName = otelSpan.serviceName || spanData.resource?.serviceName || "unknown-service";

  // Convert OTel span to internal format
  return createTraceSpan({
    name: spanData.name || "",
    spanId: spanData.spanId || "",
    traceId: spanData.traceId || "",
    parentSpanId: spanData.parentSpanId || "",
    kind: spanData.kind || SpanKind.INTERNAL,
    startTimeUnixNano: spanData.startTimeUnixNano,
    endTimeUnixNano: spanData.endTimeUnixNano,
    attributes: spanData.attributes || [],
    events: (spanData.events || []).map((event) => ({
      name: event.name || "",
      timeUnixNano: event.timeUnixNano,
      attributes: event.attributes || [],
    })),
    status: spanData.status || { code: "STATUS_CODE_UNSET" },
    instrumentationScope: spanData.instrumentationScope || {},
    resource: {
      serviceName: serviceName,
      serviceNamespace: spanData.resource?.serviceNamespace || spanData.resource?.serviceNamespace || undefined,
    },
  });
}

/**
 * Parses OTel log data from sample1.json format
 * @param {Object} otelLog - OTel log object
 * @param {string} logId - Unique ID for the log (will be generated if not provided)
 * @returns {import("./logs.js").LogRow} Internal log model
 */
export function parseOtelLog(otelLog, logId = null) {
  // Generate template from body or use a default
  let template = "";
  const body = otelLog.body ? normalizeAnyValue(otelLog.body) : undefined;
  
  if (body && body.kind === LogAnyValueKind.STRING && body.value) {
    template = String(body.value);
  } else {
    // Try to build template from attributes
    const originalFormatAttr = otelLog.attributes?.find(attr => attr.key === "{OriginalFormat}");
    if (originalFormatAttr) {
      const originalFormat = normalizeAnyValue(originalFormatAttr.value);
      if (originalFormat.kind === LogAnyValueKind.STRING && originalFormat.value) {
        template = String(originalFormat.value);
      } else {
        template = body ? String(body.value) : "Log entry";
      }
    } else {
      template = body ? String(body.value) : "Log entry";
    }
  }

  // Parse severity number from string enum to number
  const severityNumber = parseSeverityNumber(otelLog.severityNumber);

  // Generate ID if not provided
  if (!logId) {
    logId = `log-${otelLog.traceId || "unknown"}-${otelLog.spanId || "unknown"}-${otelLog.timeUnixNano || Date.now()}`;
  }

  return createLogRow({
    id: logId,
    template: template,
    timeUnixNano: otelLog.timeUnixNano,
    observedTimeUnixNano: otelLog.observedTimeUnixNano,
    severityNumber: severityNumber,
    severityText: otelLog.severityText,
    body: body,
    attributes: otelLog.attributes || [],
    droppedAttributesCount: otelLog.droppedAttributesCount,
    flags: otelLog.flags,
    traceId: otelLog.traceId,
    spanId: otelLog.spanId,
  });
}

/**
 * Parses OTel data from sample1.json format
 * @param {Object} otelData - OTel data object with { spans: [...], logs: [...] }
 * @returns {{ spans: import("./trace.js").TraceSpan[], logs: import("./logs.js").LogRow[] }}
 */
export function parseOtelData(otelData) {
  const spans = (otelData.spans || []).map((otelSpan, index) => {
    try {
      return parseOtelSpan(otelSpan);
    } catch (error) {
      console.error(`[parseOtelData] Failed to parse span at index ${index}:`, error);
      return null;
    }
  }).filter(span => span !== null);

  const logs = (otelData.logs || []).map((otelLog, index) => {
    try {
      return parseOtelLog(otelLog, `otel-log-${index}`);
    } catch (error) {
      console.error(`[parseOtelData] Failed to parse log at index ${index}:`, error);
      return null;
    }
  }).filter(log => log !== null);

  return { spans, logs };
}

