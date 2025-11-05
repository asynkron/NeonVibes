/**
 * Event Handler Utilities
 * Common event handling patterns to reduce boilerplate
 */

/**
 * Attaches a click event listener with stopPropagation.
 * @param {HTMLElement} element - Element to attach listener to
 * @param {Function} handler - Event handler function
 * @param {Object} [options] - Options
 * @param {boolean} [options.stopPropagation=true] - Whether to stop propagation
 * @param {boolean} [options.preventDefault=false] - Whether to prevent default
 * @returns {Function} Cleanup function to remove the listener
 */
export function onClick(element, handler, options = {}) {
  const { stopPropagation = false, preventDefault = false } = options;
  
  const wrappedHandler = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (preventDefault) {
      event.preventDefault();
    }
    handler(event);
  };
  
  element.addEventListener('click', wrappedHandler);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('click', wrappedHandler);
  };
}

/**
 * Attaches a click event listener with stopPropagation (common pattern).
 * @param {HTMLElement} element - Element to attach listener to
 * @param {Function} handler - Event handler function
 * @returns {Function} Cleanup function to remove the listener
 */
export function onClickStop(element, handler) {
  return onClick(element, handler, { stopPropagation: true });
}

/**
 * Attaches a change event listener.
 * @param {HTMLElement} element - Element to attach listener to
 * @param {Function} handler - Event handler function
 * @returns {Function} Cleanup function to remove the listener
 */
export function onChange(element, handler) {
  element.addEventListener('change', handler);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('change', handler);
  };
}

/**
 * Attaches an event listener with optional stopPropagation and preventDefault.
 * @param {HTMLElement} element - Element to attach listener to
 * @param {string} eventType - Event type (e.g., 'click', 'change')
 * @param {Function} handler - Event handler function
 * @param {Object} [options] - Options
 * @param {boolean} [options.stopPropagation=false] - Whether to stop propagation
 * @param {boolean} [options.preventDefault=false] - Whether to prevent default
 * @param {boolean|Object} [options.useCapture=false] - Use capture phase
 * @returns {Function} Cleanup function to remove the listener
 */
export function onEvent(element, eventType, handler, options = {}) {
  const { stopPropagation = false, preventDefault = false, useCapture = false } = options;
  
  const wrappedHandler = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (preventDefault) {
      event.preventDefault();
    }
    handler(event);
  };
  
  element.addEventListener(eventType, wrappedHandler, useCapture);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(eventType, wrappedHandler, useCapture);
  };
}

/**
 * Stops event propagation and optionally prevents default.
 * @param {Event} event - Event to stop
 * @param {Object} [options] - Options
 * @param {boolean} [options.preventDefault=false] - Whether to prevent default
 */
export function stopPropagation(event, options = {}) {
  event.stopPropagation();
  if (options.preventDefault) {
    event.preventDefault();
  }
}

