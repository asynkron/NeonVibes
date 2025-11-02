/**
 * Gravibe Attribute Panel Component
 * Provides a reusable attribute table component for displaying AnyValue attributes
 * in a structured table format with columns for name, type, and value.
 */

import { LogAnyValueKind } from "./logs.js";

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
 * Converts various formats to Uint8Array for bytes values
 * @param {any} value
 * @returns {Uint8Array}
 */
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
 * Formats an AnyValue as an inline string representation
 * @param {LogAnyValue} anyValue
 * @returns {string}
 */
export function formatAnyValueInline(anyValue) {
  switch (anyValue.kind) {
    case LogAnyValueKind.STRING:
      return String(anyValue.value);
    case LogAnyValueKind.BOOLEAN:
      return anyValue.value ? "true" : "false";
    case LogAnyValueKind.INT:
    case LogAnyValueKind.DOUBLE:
      return String(anyValue.value);
    case LogAnyValueKind.BYTES:
      return `0x${Array.from(asUint8Array(anyValue.value))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")}`;
    case LogAnyValueKind.ARRAY:
      return `[${(anyValue.value || []).map((item) => `${formatAnyValueInline(item)}:${item.kind}`).join(" ")}]`;
    case LogAnyValueKind.KVLIST:
      return `{${(anyValue.value || [])
        .map((item) => `${item.key}: ${formatAnyValueInline(item.value)}`)
        .join(", ")}}`;
    default:
      return "—";
  }
}

/**
 * Formats an AnyValue as a multiline string representation
 * @param {LogAnyValue} anyValue
 * @returns {string}
 */
export function formatAnyValueMultiline(anyValue) {
  switch (anyValue.kind) {
    case LogAnyValueKind.ARRAY:
      return `[\n${(anyValue.value || [])
        .map((item) => `  ${formatAnyValueInline(item)}:${item.kind}`)
        .join("\n")}\n]`;
    case LogAnyValueKind.KVLIST:
      return `{\n${(anyValue.value || [])
        .map((item) => `  ${item.key}: ${formatAnyValueInline(item.value)}`)
        .join("\n")}\n}`;
    default:
      return formatAnyValueInline(anyValue);
  }
}

/**
 * Creates a reusable attribute table component with columns for name, type, and value.
 * @param {LogAttribute[]} attributes
 * @returns {HTMLTableElement}
 */
export function createAttributeTable(attributes) {
  const table = document.createElement("table");
  table.className = "log-attributes-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Attribute", "Type", "Value"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  attributes.forEach((attribute) => {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = attribute.key;
    if (attribute.description) {
      nameCell.title = attribute.description;
    }
    const typeCell = document.createElement("td");
    typeCell.textContent = attribute.value.kind;
    const valueCell = document.createElement("td");
    valueCell.className = `log-attr log-attr--${attribute.value.kind}`;
    valueCell.textContent = formatAnyValueMultiline(attribute.value);

    tr.append(nameCell, typeCell, valueCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

