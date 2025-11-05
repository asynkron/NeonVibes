/**
 * Toggle State Utilities
 * Reusable utilities for managing expand/collapse state with Set-based tracking
 */

/**
 * Creates a toggle handler that manages expand/collapse state.
 * @param {Object} options - Configuration options
 * @param {Set} options.stateSet - Set to track expanded IDs
 * @param {string} options.id - ID to track in the state set
 * @param {Function} [options.onExpand] - Callback when expanding
 * @param {Function} [options.onCollapse] - Callback when collapsing
 * @param {Function} [options.getCurrentState] - Function to get current expanded state (default: checks stateSet)
 * @returns {Function} Toggle handler function
 */
export function createToggleHandler({ stateSet, id, onExpand, onCollapse, getCurrentState }) {
  const getIsExpanded = getCurrentState || (() => stateSet.has(id));
  
  return () => {
    const isExpanded = getIsExpanded();
    
    if (isExpanded) {
      stateSet.delete(id);
      if (onCollapse) {
        onCollapse();
      }
    } else {
      stateSet.add(id);
      if (onExpand) {
        onExpand();
      }
    }
  };
}

/**
 * Toggles the expanded state for an ID in a Set.
 * @param {Set} stateSet - Set to track expanded IDs
 * @param {string} id - ID to toggle
 * @returns {boolean} New expanded state (true if now expanded, false if collapsed)
 */
export function toggleExpanded(stateSet, id) {
  if (stateSet.has(id)) {
    stateSet.delete(id);
    return false;
  } else {
    stateSet.add(id);
    return true;
  }
}

/**
 * Checks if an ID is expanded in a Set.
 * @param {Set} stateSet - Set to check
 * @param {string} id - ID to check
 * @returns {boolean} True if expanded, false otherwise
 */
export function isExpanded(stateSet, id) {
  return stateSet.has(id);
}

/**
 * Sets the expanded state for an ID in a Set.
 * @param {Set} stateSet - Set to update
 * @param {string} id - ID to set
 * @param {boolean} expanded - Whether to expand (true) or collapse (false)
 */
export function setExpanded(stateSet, id, expanded) {
  if (expanded) {
    stateSet.add(id);
  } else {
    stateSet.delete(id);
  }
}

