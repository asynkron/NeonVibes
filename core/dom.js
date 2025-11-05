/**
 * DOM Utilities
 * Lightweight helpers for DOM manipulation to reduce boilerplate
 */

/**
 * Creates a DOM element with optional props and children.
 * @param {string} tag - HTML tag name
 * @param {Object} [props] - Element properties (className, id, attributes, etc.)
 * @param {...(Node|string)} children - Child nodes or text content
 * @returns {HTMLElement} Created element
 * @example
 * h('div', { className: 'foo', id: 'bar' }, 'Hello', h('span', {}, 'World'))
 * h('button', { type: 'button', disabled: true, textContent: 'Click me' })
 * h('div', { hidden: false, dataset: { id: '123' } })
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  
  // Set properties directly (for className, id, type, etc.)
  Object.keys(props).forEach(key => {
    if (key === 'style' && typeof props[key] === 'object') {
      setStyles(el, props[key]);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, props[key]);
    } else if (key === 'classList' && Array.isArray(props[key])) {
      props[key].forEach(cls => el.classList.add(cls));
    } else if (key.startsWith('aria-') || key.startsWith('data-')) {
      el.setAttribute(key, props[key]);
    } else if (key === 'hidden' && typeof props[key] === 'boolean') {
      el.hidden = props[key];
    } else if (key === 'textContent' && typeof props[key] === 'string') {
      el.textContent = props[key];
    } else if (key === 'innerHTML' && typeof props[key] === 'string') {
      el.innerHTML = props[key];
    } else if (key !== 'attrs') {
      // Set other properties directly (disabled, type, etc.)
      el[key] = props[key];
    }
  });
  
  // Set additional attributes if provided
  if (props.attrs) {
    setAttrs(el, props.attrs);
  }
  
  // If textContent or innerHTML was set in props, don't append children
  if (props.textContent || props.innerHTML) {
    return el;
  }
  
  // Append children
  children.forEach(child => {
    if (child == null) return;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(c => el.appendChild(c instanceof Node ? c : document.createTextNode(String(c))));
    }
  });
  
  return el;
}

/**
 * Creates a DOM element (wrapper for document.createElement with h() compatibility).
 * This provides a drop-in replacement for document.createElement that uses h() internally.
 * @param {string} tag - HTML tag name
 * @param {Object} [props] - Element properties (optional, for h() compatibility)
 * @param {...(Node|string)} [children] - Child nodes (optional)
 * @returns {HTMLElement} Created element
 * @example
 * createElement('div', { className: 'foo' }) // Uses h() internally
 * createElement('div') // Simple wrapper
 */
export function createElement(tag, props = {}, ...children) {
  // If only tag is provided, use document.createElement for simple cases
  if (Object.keys(props).length === 0 && children.length === 0) {
    return document.createElement(tag);
  }
  // Otherwise use h() for full feature support
  return h(tag, props, ...children);
}

/**
 * Converts camelCase to kebab-case for CSS properties.
 * @param {string} str - camelCase string
 * @returns {string} kebab-case string
 */
function camelToKebab(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Sets multiple CSS style properties on an element.
 * Supports both camelCase and kebab-case property names.
 * @param {HTMLElement} el - Element to style
 * @param {Object<string, string>} styles - Object mapping CSS property names to values
 * @example
 * setStyles(el, { color: 'red', paddingLeft: '10px' }) // camelCase
 * setStyles(el, { color: 'red', 'padding-left': '10px' }) // kebab-case
 */
export function setStyles(el, styles) {
  Object.keys(styles).forEach(key => {
    // Convert camelCase to kebab-case for CSS properties
    const cssProperty = key.includes('-') ? key : camelToKebab(key);
    el.style.setProperty(cssProperty, styles[key]);
  });
}

/**
 * Sets multiple attributes on an element.
 * @param {HTMLElement} el - Element to set attributes on
 * @param {Object<string, string>} attrs - Object mapping attribute names to values
 * @example
 * setAttrs(el, { 'aria-label': 'Toggle', 'data-id': '123' })
 */
export function setAttrs(el, attrs) {
  Object.keys(attrs).forEach(key => {
    el.setAttribute(key, attrs[key]);
  });
}

