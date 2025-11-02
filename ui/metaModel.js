/**
 * Gravibe Meta Model
 * Provides extractors and metadata extraction for OpenTelemetry spans.
 * Mirrors the TraceLens.Core/Model structure for groups and components.
 */

/**
 * @typedef {import("./trace.js").TraceSpan} TraceSpan
 * @typedef {{ id: string, name: string }} Group
 * @typedef {{ id: string, name: string, groupId: string, kind: string, componentStack: string }} Component
 * @typedef {{ groupName: string, componentName: string, operation: string, componentKind: string, componentStack: string, isClient?: boolean }} SpanDescription
 */

import { SpanKind } from "./trace.js";

export const ComponentKind = Object.freeze({
  START: "start",
  SERVICE: "service",
  ENDPOINT: "endpoint",
  DATABASE: "database",
  DATABASE_STATEMENT: "databasestatement",
  QUEUE: "queue",
  QUEUE_CONSUMER: "queueconsumer",
  ACTOR: "actor",
  WORKFLOW: "workflow",
  ACTIVITY: "activity",
});

/**
 * Gets an attribute value from a span by key.
 * @param {TraceSpan} span
 * @param {string} key
 * @returns {string}
 */
export function getSpanAttribute(span, key) {
  if (!span.attributes || !Array.isArray(span.attributes)) {
    return "";
  }
  const attr = span.attributes.find((a) => a.key === key);
  if (!attr || !attr.value) {
    return "";
  }
  // Handle different value types
  if (typeof attr.value === "string") {
    return attr.value;
  }
  if (attr.value && typeof attr.value === "object" && "value" in attr.value) {
    return String(attr.value.value || "");
  }
  return String(attr.value || "");
}

/**
 * Extractors try to identify what group/component a span belongs to.
 * They return a SpanDescription if they can match, or null otherwise.
 * @typedef {(span: TraceSpan, serviceName: string) => SpanDescription | null} Extractor
 */

/**
 * Root extractor - handles root/start spans
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractRoot(span, serviceName) {
  if (span.traceId === "root" || (!span.parentSpanId && span.kind === SpanKind.INTERNAL)) {
    return {
      groupName: "",
      componentName: "Start",
      operation: "",
      componentKind: ComponentKind.START,
      componentStack: "",
    };
  }
  return null;
}

/**
 * HTTP Request extractor - extracts HTTP client calls
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractHttpRequest(span, serviceName) {
  const httpMethod = getSpanAttribute(span, "http.request.method");
  if (httpMethod) {
    const urlFull = getSpanAttribute(span, "url.full");
    return {
      groupName: serviceName,
      componentName: "HTTP Client",
      operation: `HTTP ${httpMethod.toUpperCase()} ${urlFull}`,
      componentKind: ComponentKind.SERVICE,
      componentStack: "",
      isClient: true,
    };
  }
  return null;
}

/**
 * HTTP Endpoint extractor - extracts HTTP server endpoints
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractHttpEndpoint(span, serviceName) {
  const httpRoute = getSpanAttribute(span, "http.route");
  if (httpRoute) {
    const httpMethod = getSpanAttribute(span, "http.method") || getSpanAttribute(span, "http.request.method");
    const methodStr = httpMethod ? ` ${httpMethod.toUpperCase()}` : "";
    return {
      groupName: serviceName,
      componentName: httpRoute,
      operation: `HTTP${methodStr}`,
      componentKind: ComponentKind.ENDPOINT,
      componentStack: "ASP.NET Core",
    };
  }

  const httpUrl = getSpanAttribute(span, "http.url");
  if (httpUrl) {
    const httpHost = getSpanAttribute(span, "http.host");
    const httpMethod = getSpanAttribute(span, "http.method") || getSpanAttribute(span, "http.request.method");
    const methodStr = httpMethod ? ` ${httpMethod.toUpperCase()}` : "";
    return {
      groupName: serviceName,
      componentName: httpHost || "Unknown HTTP Server",
      operation: `HTTP${methodStr}`,
      componentKind: ComponentKind.ENDPOINT,
      componentStack: "Unknown HTTP Server",
    };
  }
  return null;
}

/**
 * Database extractor - extracts database operations
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractDatabase(span, serviceName) {
  // Check for CosmosDB via HTTP URL
  const httpUrl = getSpanAttribute(span, "http.url");
  if (httpUrl && httpUrl.includes("documents.azure.com")) {
    return {
      groupName: "Azure",
      componentName: "CosmosDB",
      operation: "",
      componentKind: ComponentKind.DATABASE,
      componentStack: "Azure CosmosDB",
    };
  }

  const dbSystem = getSpanAttribute(span, "db.system");
  if (dbSystem) {
    let dbName = getSpanAttribute(span, "db.name");
    const dbStatement = getSpanAttribute(span, "db.statement");

    // Try to extract database name from CREATE DATABASE statement
    if (!dbName && dbStatement) {
      const match = dbStatement.match(/CREATE DATABASE\s+(\w+);/i);
      if (match) {
        dbName = match[1];
      }
    }

    // Create short statement description
    let statementShort = "";
    if (dbStatement) {
      const parts = dbStatement.split(/\s|\n/);
      statementShort = parts[0] || "";
      if (statementShort.length > 10) {
        statementShort = statementShort.substring(0, 10);
      }
      if (statementShort.toLowerCase() === "create" && parts[1]) {
        statementShort += " " + parts[1];
      }
    }

    return {
      groupName: dbSystem,
      componentName: dbName || dbSystem,
      operation: statementShort,
      componentKind: ComponentKind.DATABASE,
      componentStack: dbSystem,
    };
  }
  return null;
}

/**
 * Queue extractor - extracts queue/messaging operations
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractQueue(span, serviceName) {
  // Check for Azure Storage Queue
  const httpUrl = getSpanAttribute(span, "http.url");
  if (httpUrl && httpUrl.includes(".queue.core.windows.net")) {
    try {
      const url = new URL(httpUrl);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const path = pathSegments[0] || "";
      if (path) {
        return {
          groupName: "Azure",
          componentName: path,
          operation: "",
          componentKind: ComponentKind.QUEUE,
          componentStack: "Azure Storage Queue",
        };
      }
    } catch (e) {
      // Invalid URL, continue
    }
  }

  // Don't treat Kafka consumers as producers
  const consumerGroup = getSpanAttribute(span, "messaging.kafka.consumer.group");
  if (consumerGroup) {
    return null;
  }

  const messagingSystem = getSpanAttribute(span, "messaging.system");
  if (!messagingSystem) {
    return null;
  }

  let destination = getSpanAttribute(span, "messaging.destination");
  if (!destination) {
    destination = getSpanAttribute(span, "messaging.destination.name");
  }
  if (!destination) {
    return null;
  }

  return {
    groupName: messagingSystem,
    componentName: destination,
    operation: "",
    componentKind: ComponentKind.QUEUE,
    componentStack: messagingSystem,
  };
}

/**
 * Queue Consumer extractor - extracts queue consumer operations
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractQueueConsumer(span, serviceName) {
  const consumerGroup = getSpanAttribute(span, "messaging.kafka.consumer.group");
  if (consumerGroup) {
    return {
      groupName: serviceName,
      componentName: consumerGroup,
      operation: span.name || "",
      componentKind: ComponentKind.QUEUE_CONSUMER,
      componentStack: "",
    };
  }

  const messagingSystem = getSpanAttribute(span, "messaging.system");
  if (messagingSystem) {
    const destination = getSpanAttribute(span, "messaging.destination") || getSpanAttribute(span, "messaging.destination.name");
    if (destination) {
      return {
        groupName: serviceName,
        componentName: destination,
        operation: "",
        componentKind: ComponentKind.QUEUE_CONSUMER,
        componentStack: "",
      };
    }
  }
  return null;
}

/**
 * External HTTP Endpoint extractor - extracts external HTTP calls
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription | null}
 */
function extractExternalHttpEndpoint(span, serviceName) {
  const peerService = getSpanAttribute(span, "peer.service");
  if (peerService && span.kind === SpanKind.CLIENT) {
    return {
      groupName: "HTTP",
      componentName: peerService,
      operation: "",
      componentKind: ComponentKind.SERVICE,
      componentStack: "",
    };
  }
  return null;
}

/**
 * List of extractors to try in order
 */
const EXTRACTORS = [
  extractRoot,
  extractHttpRequest,
  extractHttpEndpoint,
  extractDatabase,
  extractQueue,
  extractQueueConsumer,
  extractExternalHttpEndpoint,
];

/**
 * Extracts span description using the extractor chain.
 * @param {TraceSpan} span
 * @param {string} serviceName
 * @returns {SpanDescription}
 */
export function extractSpanDescription(span, serviceName) {
  for (const extractor of EXTRACTORS) {
    const description = extractor(span, serviceName);
    if (description) {
      return description;
    }
  }

  // Default fallback - service
  return {
    groupName: "",
    componentName: serviceName,
    operation: span.name || "",
    componentKind: ComponentKind.SERVICE,
    componentStack: "",
    isClient: span.kind === SpanKind.CLIENT,
  };
}

/**
 * Creates a unique string key for groups/components.
 * @param {string} groupName
 * @param {string} componentName
 * @returns {string}
 */
export function createComponentKey(groupName, componentName) {
  return `${groupName}:${componentName}`;
}

