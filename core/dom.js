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
    } else if (key !== 'attrs') {
      el[key] = props[key];
    }
  });
  
  // Set additional attributes if provided
  if (props.attrs) {
    setAttrs(el, props.attrs);
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

