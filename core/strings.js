/**
 * String Utilities
 * Shared helpers for string escaping and formatting, especially for Mermaid syntax
 */

/**
 * Escapes special characters for Mermaid text content.
 * Converts newlines to <br/>, escapes quotes, brackets, braces, and equals signs.
 * Note: Mermaid does NOT support <b>bold</b> or other HTML formatting tags in sequence diagrams.
 * Markdown **bold** also doesn't work - use uppercase text for emphasis instead.
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for Mermaid
 * @example
 * escapeMermaid("Hello\nWorld") // "Hello<br/>World"
 * escapeMermaid('Say "hello"') // "Say &quot;hello&quot;"
 */
export function escapeMermaid(text) {
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
}

/**
 * Escapes special characters for Mermaid ID (alphanumeric + underscore only).
 * Mermaid IDs must be alphanumeric and underscores, and cannot start with a number.
 * @param {string} id - ID to escape
 * @returns {string} Escaped ID safe for Mermaid
 * @example
 * escapeMermaidId("service:component") // "service_component"
 * escapeMermaidId("123bad") // "_123bad"
 */
export function escapeMermaidId(id) {
  if (!id) {
    return "unknown";
  }
  // Mermaid IDs should be alphanumeric and underscores only
  // Replace colons, spaces, and other special chars with underscores
  return String(id)
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&"); // Cannot start with a number
}

