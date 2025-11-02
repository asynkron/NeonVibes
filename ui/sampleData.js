/**
 * Gravibe Sample Data
 * Provides sample trace spans and log rows for development and demos.
 */

import { createTraceSpan, createTraceEvent } from "./trace.js";
import { createLogRow, createLogAttribute } from "./logs.js";

// Helper functions for sample data generation (copied from logs.js to avoid circular dependencies)
// Using string literals instead of LogAnyValueKind to avoid circular dependency
const LogAnyValueKindValues = {
    STRING: "string",
    BOOLEAN: "boolean",
    INT: "int",
    DOUBLE: "double",
    BYTES: "bytes",
    ARRAY: "array",
    KVLIST: "kvlist",
    EMPTY: "empty",
};

// Using string literals instead of SpanKind to avoid circular dependency
const SpanKindValues = {
    UNSPECIFIED: "unspecified",
    INTERNAL: "internal",
    SERVER: "server",
    CLIENT: "client",
    PRODUCER: "producer",
    CONSUMER: "consumer",
};
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

function normalizeAnyValue(input) {
    if (!input || typeof input !== "object") {
        return { kind: LogAnyValueKindValues.EMPTY, value: null };
    }

    if ("kind" in input && "value" in input) {
        const kind = input.kind;
        if (kind === LogAnyValueKindValues.BYTES) {
            return { kind, value: asUint8Array(input.value) };
        }
        if (kind === LogAnyValueKindValues.ARRAY && Array.isArray(input.value)) {
            return {
                kind,
                value: input.value.map((item) => normalizeAnyValue(item)),
            };
        }
        if (kind === LogAnyValueKindValues.KVLIST && Array.isArray(input.value)) {
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
        return { kind: LogAnyValueKindValues.STRING, value: input.string_value ?? "" };
    }
    if (Object.prototype.hasOwnProperty.call(input, "bool_value")) {
        return { kind: LogAnyValueKindValues.BOOLEAN, value: Boolean(input.bool_value) };
    }
    if (Object.prototype.hasOwnProperty.call(input, "int_value")) {
        return { kind: LogAnyValueKindValues.INT, value: Number(input.int_value) };
    }
    if (Object.prototype.hasOwnProperty.call(input, "double_value")) {
        return { kind: LogAnyValueKindValues.DOUBLE, value: Number(input.double_value) };
    }
    if (Object.prototype.hasOwnProperty.call(input, "bytes_value")) {
        return { kind: LogAnyValueKindValues.BYTES, value: asUint8Array(input.bytes_value) };
    }
    if (Object.prototype.hasOwnProperty.call(input, "array_value")) {
        const rawValues = Array.isArray(input.array_value?.values)
            ? input.array_value.values
            : [];
        return {
            kind: LogAnyValueKindValues.ARRAY,
            value: rawValues.map((item) => normalizeAnyValue(item)),
        };
    }
    if (Object.prototype.hasOwnProperty.call(input, "kvlist_value")) {
        const rawList = Array.isArray(input.kvlist_value?.values)
            ? input.kvlist_value.values
            : [];
        return {
            kind: LogAnyValueKindValues.KVLIST,
            value: rawList.map((entry) => ({
                key: entry?.key ?? "",
                value: normalizeAnyValue(entry?.value ?? null),
            })),
        };
    }

    return { kind: LogAnyValueKindValues.EMPTY, value: null };
}

function nowNano(offsetMs = 0) {
    const base = BigInt(Date.now() + offsetMs);
    return base * 1000000n;
}

const anyValues = {
    string: (value) => ({ kind: LogAnyValueKindValues.STRING, value }),
    bool: (value) => ({ kind: LogAnyValueKindValues.BOOLEAN, value }),
    int: (value) => ({ kind: LogAnyValueKindValues.INT, value }),
    double: (value) => ({ kind: LogAnyValueKindValues.DOUBLE, value }),
    bytes: (value) => ({ kind: LogAnyValueKindValues.BYTES, value: asUint8Array(value) }),
    array: (values) => ({ kind: LogAnyValueKindValues.ARRAY, value: values.map((item) => normalizeAnyValue(item)) }),
    kvlist: (entries) => ({
        kind: LogAnyValueKindValues.KVLIST,
        value: entries.map(([key, value]) => ({ key, value: normalizeAnyValue(value) })),
    }),
};

function fakeTraceId(seed) {
    return seed.padEnd(32, "0").slice(0, 32);
}

function fakeSpanId(seed) {
    return seed.padEnd(16, "0").slice(0, 16);
}

// Sample trace spans
const ns = 1e6;
const base = Date.now() * 1e6;

export const sampleTraceSpans = [
    createTraceSpan({
        name: "HTTP GET /checkout",
        spanId: "a1",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "",
        kind: SpanKindValues.SERVER,
        startTimeUnixNano: base,
        endTimeUnixNano: base + 180 * ns,
        resource: { serviceName: "edge-gateway" },
        attributes: [
            { key: "http.method", value: { string_value: "GET" } },
            { key: "http.target", value: { string_value: "/checkout" } },
            { key: "user.id", value: { string_value: "pilot-982" } },
        ],
        events: [
            createTraceEvent({
                name: "http.request.headers",
                timeUnixNano: base + 2 * ns,
                attributes: [
                    { key: "user-agent", value: { string_value: "VibeBrowser/1.0" } },
                ],
            }),
        ],
        status: { code: "STATUS_CODE_OK" },
        instrumentationScope: { name: "gateway-server" },
    }),
    createTraceSpan({
        name: "Authorize Session",
        spanId: "b2",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "a1",
        kind: SpanKindValues.CLIENT,
        startTimeUnixNano: base + 10 * ns,
        endTimeUnixNano: base + 55 * ns,
        resource: { serviceName: "edge-gateway" },
        attributes: [
            { key: "rpc.system", value: { string_value: "grpc" } },
            { key: "rpc.service", value: { string_value: "AuthzService" } },
        ],
        events: [
            createTraceEvent({
                name: "grpc.message",
                timeUnixNano: base + 22 * ns,
                attributes: [
                    { key: "grpc.message_type", value: { string_value: "request" } },
                ],
            }),
        ],
    }),
    createTraceSpan({
        name: "AuthzService/Authorize",
        spanId: "c3",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "b2",
        kind: SpanKindValues.SERVER,
        startTimeUnixNano: base + 12 * ns,
        endTimeUnixNano: base + 52 * ns,
        resource: { serviceName: "identity-core" },
        attributes: [
            { key: "db.system", value: { string_value: "redis" } },
            { key: "net.peer.name", value: { string_value: "auth-cache-01" } },
        ],
        events: [
            createTraceEvent({
                name: "cache.miss",
                timeUnixNano: base + 18 * ns,
                attributes: [
                    { key: "cache.key", value: { string_value: "session:pilot-982" } },
                ],
            }),
        ],
        status: { code: "STATUS_CODE_OK" },
    }),
    createTraceSpan({
        name: "Lookup Session",
        spanId: "d4",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "c3",
        kind: SpanKindValues.CLIENT,
        startTimeUnixNano: base + 20 * ns,
        endTimeUnixNano: base + 40 * ns,
        resource: { serviceName: "identity-core" },
        attributes: [
            { key: "db.system", value: { string_value: "postgresql" } },
            { key: "db.statement", value: { string_value: "SELECT * FROM sessions" } },
        ],
    }),
    createTraceSpan({
        name: "Render Checkout",
        spanId: "e5",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "a1",
        kind: SpanKindValues.INTERNAL,
        startTimeUnixNano: base + 60 * ns,
        endTimeUnixNano: base + 165 * ns,
        resource: { serviceName: "edge-gateway" },
        attributes: [
            { key: "view.name", value: { string_value: "CheckoutPage" } },
            { key: "feature.flags", value: { array_value: { values: [{ string_value: "express-pay" }, { string_value: "upsell-banner" }] } } },
        ],
    }),
    createTraceSpan({
        name: "InventoryService/Reserve",
        spanId: "f6",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "e5",
        kind: SpanKindValues.CLIENT,
        startTimeUnixNano: base + 78 * ns,
        endTimeUnixNano: base + 138 * ns,
        resource: { serviceName: "edge-gateway" },
        attributes: [
            { key: "rpc.system", value: { string_value: "grpc" } },
            { key: "inventory.items", value: { int_value: 3 } },
        ],
        status: { code: "STATUS_CODE_OK" },
    }),
    createTraceSpan({
        name: "InventoryService/Reserve",
        spanId: "g7",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "f6",
        kind: SpanKindValues.SERVER,
        startTimeUnixNano: base + 80 * ns,
        endTimeUnixNano: base + 134 * ns,
        resource: { serviceName: "supply-chain" },
        attributes: [
            { key: "db.system", value: { string_value: "mongodb" } },
            { key: "region", value: { string_value: "us-east-1" } },
        ],
        events: [
            createTraceEvent({
                name: "db.query",
                timeUnixNano: base + 102 * ns,
                attributes: [
                    { key: "collection", value: { string_value: "inventory" } },
                    { key: "duration.ms", value: { double_value: 12.7 } },
                ],
            }),
        ],
    }),
    createTraceSpan({
        name: "PaymentService/Authorize",
        spanId: "h8",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "e5",
        kind: SpanKindValues.CLIENT,
        startTimeUnixNano: base + 90 * ns,
        endTimeUnixNano: base + 170 * ns,
        resource: { serviceName: "edge-gateway" },
        attributes: [
            { key: "rpc.system", value: { string_value: "grpc" } },
            { key: "payment.provider", value: { string_value: "gravipay" } },
        ],
        status: { code: "STATUS_CODE_ERROR", message: "card_declined" },
    }),
    createTraceSpan({
        name: "PaymentService/Authorize",
        spanId: "i9",
        traceId: "42d1e0cafef00d1e",
        parentSpanId: "h8",
        kind: SpanKindValues.SERVER,
        startTimeUnixNano: base + 95 * ns,
        endTimeUnixNano: base + 165 * ns,
        resource: { serviceName: "payments-orchestrator" },
        attributes: [
            { key: "db.system", value: { string_value: "postgresql" } },
            { key: "retry.count", value: { int_value: 1 } },
        ],
        events: [
            createTraceEvent({
                name: "fraud.check",
                timeUnixNano: base + 120 * ns,
                attributes: [
                    { key: "result", value: { string_value: "pending_review" } },
                ],
            }),
        ],
        status: { code: "STATUS_CODE_ERROR", message: "Card declined" },
    }),
];

// Sample log rows
export const sampleLogRows = [
    createLogRow({
        id: "log-boot",
        template:
            "Node {{resource.node}} started worker {{worker.id}} for job {{job.name}} in {{region}} region",
        timeUnixNano: nowNano(-120000),
        observedTimeUnixNano: nowNano(-115000),
        severityNumber: 9,
        severityText: "INFO",
        traceId: fakeTraceId("boot001a"),
        spanId: fakeSpanId("a1f7"),
        attributes: [
            createLogAttribute("resource.node", anyValues.string("gravibe-ingest-03")),
            createLogAttribute("worker.id", anyValues.int(42)),
            createLogAttribute("job.name", anyValues.string("daily-compaction")),
            createLogAttribute("region", anyValues.string("eu-central")),
            createLogAttribute("worker.cold_start", anyValues.bool(false)),
            createLogAttribute(
                "worker.capabilities",
                anyValues.array([
                    anyValues.string("logs"),
                    anyValues.string("metrics"),
                    anyValues.string("profiles"),
                ])
            ),
        ],
        body: anyValues.string("Worker runtime initialized"),
    }),
    createLogRow({
        id: "log-rate-limit",
        template: "Rate limiter triggered on route {{http.route}} with {{rate.limit}} requests/min",
        timeUnixNano: nowNano(-75000),
        observedTimeUnixNano: nowNano(-74000),
        severityNumber: 13,
        severityText: "WARN",
        traceId: fakeTraceId("rl-87be"),
        spanId: fakeSpanId("12ef"),
        attributes: [
            createLogAttribute("http.route", anyValues.string("/api/session")),
            createLogAttribute("http.method", anyValues.string("POST")),
            createLogAttribute("rate.limit", anyValues.int(900)),
            createLogAttribute("client.id", anyValues.string("orbital-console")),
            createLogAttribute("limit.exceeded", anyValues.bool(true)),
            createLogAttribute(
                "sample.requests",
                anyValues.array([
                    anyValues.kvlist([
                        ["ip", anyValues.string("10.42.1.22")],
                        ["duration_ms", anyValues.double(183.5)],
                    ]),
                    anyValues.kvlist([
                        ["ip", anyValues.string("10.42.1.23")],
                        ["duration_ms", anyValues.double(156.2)],
                    ]),
                ])
            ),
        ],
        body: anyValues.string("Throttled burst of session creations"),
    }),
    createLogRow({
        id: "log-config",
        template: "Updated config bundle {{config.name}} to revision {{config.revision}}",
        timeUnixNano: nowNano(-51000),
        severityNumber: 10,
        severityText: "INFO2",
        traceId: fakeTraceId("cfg-9dd1"),
        spanId: fakeSpanId("88aa"),
        attributes: [
            createLogAttribute("config.name", anyValues.string("grafana-dashboards")),
            createLogAttribute("config.revision", anyValues.int(128)),
            createLogAttribute("config.author", anyValues.string("luna")),
            createLogAttribute(
                "config.diff",
                anyValues.kvlist([
                    ["added_panels", anyValues.int(3)],
                    ["removed_panels", anyValues.int(1)],
                    ["validation", anyValues.bool(true)],
                ])
            ),
            createLogAttribute("checksum", anyValues.bytes("c0ffee42")),
        ],
        body: anyValues.string("Config pushed via automation"),
    }),
    createLogRow({
        id: "log-latency",
        template: "Latency probe {{probe.name}} measured p95 {{latency.p95_ms}} ms",
        timeUnixNano: nowNano(-32000),
        observedTimeUnixNano: nowNano(-30000),
        severityNumber: 13,
        severityText: "WARN2",
        traceId: fakeTraceId("lat-5521"),
        spanId: fakeSpanId("7771"),
        attributes: [
            createLogAttribute("probe.name", anyValues.string("edge-vectors")),
            createLogAttribute("latency.p95_ms", anyValues.double(412.8)),
            createLogAttribute("latency.sample_size", anyValues.int(240)),
            createLogAttribute("latency.threshold_ms", anyValues.double(250)),
            createLogAttribute("slo.breach", anyValues.bool(true)),
        ],
        body: anyValues.string("Latency beyond SLO for 3 consecutive checks"),
    }),
    createLogRow({
        id: "log-fatal",
        template:
            "Ingest pipeline {{pipeline.id}} crashed: {{error.message}} (restarts {{restart.count}})",
        timeUnixNano: nowNano(-9000),
        observedTimeUnixNano: nowNano(-8000),
        severityNumber: 17,
        severityText: "ERROR",
        traceId: fakeTraceId("ing-ff10"),
        spanId: fakeSpanId("dead"),
        flags: 0x1,
        droppedAttributesCount: 2,
        attributes: [
            createLogAttribute("pipeline.id", anyValues.string("gravibe-stream-01")),
            createLogAttribute("error.message", anyValues.string("out of memory")),
            createLogAttribute("error.code", anyValues.string("OOM-7")),
            createLogAttribute("restart.count", anyValues.int(5)),
            createLogAttribute(
                "last.restart",
                anyValues.kvlist([
                    ["time", anyValues.string("2024-04-23T07:11:02Z")],
                    ["duration_ms", anyValues.double(1420.6)],
                    ["strategy", anyValues.string("backoff")],
                ])
            ),
        ],
        body: anyValues.string("Pipeline entered crash loop"),
    }),
    createLogRow({
        id: "log-long-text-1",
        template: "Processing request {{request.id}} with a very long description that should wrap nicely across multiple lines when displayed in the log row message area. This is to test how word wrapping works with extended text content that exceeds the normal column width.",
        timeUnixNano: nowNano(-8000),
        severityNumber: 9,
        severityText: "INFO",
        traceId: fakeTraceId("long-001"),
        spanId: fakeSpanId("long1"),
        attributes: [
            createLogAttribute("request.id", anyValues.string("req-1234567890-abcdefghijklmnopqrstuvwxyz")),
            createLogAttribute("request.description", anyValues.string("This is an extremely long description that contains many words and should demonstrate how text wrapping behaves in the attribute table component when dealing with lengthy string values that exceed the normal column boundaries.")),
            createLogAttribute("request.path", anyValues.string("/api/v1/very/long/endpoint/path/that/extends/beyond/normal/length")),
        ],
    }),
    createLogRow({
        id: "log-long-text-2",
        template: "User {{user.email}} performed action {{action.type}} on resource {{resource.name}} in namespace {{namespace.id}} with parameters {{params.count}}",
        timeUnixNano: nowNano(-7000),
        severityNumber: 9,
        severityText: "INFO",
        traceId: fakeTraceId("long-002"),
        spanId: fakeSpanId("long2"),
        attributes: [
            createLogAttribute("user.email", anyValues.string("very.long.email.address@extremely-long-domain-name.example.com")),
            createLogAttribute("action.type", anyValues.string("CREATE_RESOURCE_WITH_COMPLEX_OPERATION")),
            createLogAttribute("resource.name", anyValues.string("my-very-long-resource-name-that-extends-beyond-normal-length-and-tests-wrapping")),
            createLogAttribute("namespace.id", anyValues.string("production-environment-long-namespace-identifier-with-many-segments")),
            createLogAttribute("params.count", anyValues.int(42)),
            createLogAttribute("params.details", anyValues.string("This parameter contains a lot of detailed information about the operation that was performed, including all the various steps and intermediate states that were encountered during processing.")),
        ],
    }),
    createLogRow({
        id: "log-long-text-3",
        template: "Database query executed successfully but took {{duration.ms}} milliseconds which is longer than expected. The query was: SELECT * FROM users WHERE email = {{query.email}} AND status = {{query.status}} AND created_at > {{query.created_at}} ORDER BY created_at DESC LIMIT {{query.limit}}",
        timeUnixNano: nowNano(-6000),
        severityNumber: 13,
        severityText: "WARN",
        traceId: fakeTraceId("long-003"),
        spanId: fakeSpanId("long3"),
        attributes: [
            createLogAttribute("duration.ms", anyValues.double(1250.75)),
            createLogAttribute("query.email", anyValues.string("user@example.com")),
            createLogAttribute("query.status", anyValues.string("active")),
            createLogAttribute("query.created_at", anyValues.string("2024-01-01T00:00:00Z")),
            createLogAttribute("query.limit", anyValues.int(100)),
            createLogAttribute("query.explanation", anyValues.string("This query is designed to retrieve all active users who were created after a certain date, sorted by creation time in descending order, with a limit on the number of results returned.")),
        ],
    }),
];

