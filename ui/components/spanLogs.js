/**
 * Span Logs Component
 * Renders logs for a span node
 */

import { h, setAttrs } from "../../core/dom.js";
import { resolveSeverityGroup, abbreviateLogLevel, buildTemplateFragment, createMetaSection, formatNanoseconds } from "../logs.js";
import { onClickStop } from "../../core/events.js";

/**
 * Creates a single log row element.
 * @param {import("../logs.js").LogRow} logRow - The log row data
 * @param {Set<string>} expandedLogIds - Set of expanded log IDs
 * @returns {{element: HTMLElement, expander: HTMLElement, summary: HTMLElement, metaSection: HTMLElement}} Log row components
 */
export function createLogRow(logRow, expandedLogIds) {
  const severityGroup = resolveSeverityGroup(logRow);
  const isOpen = expandedLogIds.has(logRow.id);
  
  const logElement = h('div', {
    className: `log-row log-row--severity-${severityGroup}${isOpen ? ' log-row--open' : ''}`,
    dataset: { rowId: logRow.id }
  });

  const expander = h('button', {
    type: 'button',
    className: 'log-row__expander',
    attrs: { 'aria-expanded': String(isOpen) }
  });
  const expanderWrapper = h('span', { className: 'log-row__expander-wrapper' }, expander);

  const severity = h('span', { className: 'log-row-severity' },
    abbreviateLogLevel(logRow.severityText ?? severityGroup)
  );

  const timestamp = h('time', {
    className: 'log-row-timestamp',
    dateTime: typeof logRow.timeUnixNano === "bigint"
      ? new Date(Number(logRow.timeUnixNano / 1000000n)).toISOString()
      : new Date((logRow.timeUnixNano ?? 0) / 1e6).toISOString()
  }, formatNanoseconds(logRow.timeUnixNano));

  const message = h('span', { className: 'log-row-message' }, buildTemplateFragment(logRow));

  const summary = h('div', { className: 'log-row-summary' },
    expanderWrapper, timestamp, severity, message
  );

  const metaSection = createMetaSection(logRow);
  if (!isOpen) {
    metaSection.style.display = 'none';
  }

  logElement.appendChild(summary);
  logElement.appendChild(metaSection);

  return { element: logElement, expander, summary, metaSection };
}

/**
 * Creates a toggle handler for a log row.
 * @param {import("../logs.js").LogRow} logRow - The log row data
 * @param {Set<string>} expandedLogIds - Set of expanded log IDs
 * @param {HTMLElement} logElement - The log row element
 * @param {HTMLElement} metaSection - The meta section element
 * @param {HTMLElement} expander - The expander button
 * @returns {Function} Toggle handler function
 */
export function createLogToggleHandler(logRow, expandedLogIds, logElement, metaSection, expander) {
  return () => {
    const wasOpen = expandedLogIds.has(logRow.id);
    if (wasOpen) {
      expandedLogIds.delete(logRow.id);
      logElement.classList.remove('log-row--open');
      metaSection.style.display = 'none';
      setAttrs(expander, { 'aria-expanded': 'false' });
    } else {
      expandedLogIds.add(logRow.id);
      logElement.classList.add('log-row--open');
      metaSection.style.display = '';
      setAttrs(expander, { 'aria-expanded': 'true' });
    }
  };
}

/**
 * Renders logs for a span node.
 * @param {import("../trace.js").TraceSpanNode} node - The span node
 * @returns {HTMLElement|null} Logs section element or null if no logs
 */
export function renderSpanLogs(node) {
  // Get logs from node (already merged during metamodel build)
  const allLogs = node.logs || [];

  if (allLogs.length === 0) {
    return null;
  }

  // Sort all logs by time
  const sortedLogs = [...allLogs].sort((a, b) => {
    const timeA = typeof a.timeUnixNano === "bigint" ? Number(a.timeUnixNano) : a.timeUnixNano;
    const timeB = typeof b.timeUnixNano === "bigint" ? Number(b.timeUnixNano) : b.timeUnixNano;
    return timeA - timeB;
  });

  const logsSection = h('section', { className: 'trace-span-logs' });
  const logsList = h('div', { className: 'trace-span-logs__list' });

  // Create a Set to track expanded log IDs
  const expandedLogIds = new Set();

  sortedLogs.forEach((logRow) => {
    const { element: logElement, expander, summary, metaSection } = createLogRow(logRow, expandedLogIds);
    const toggleHandler = createLogToggleHandler(logRow, expandedLogIds, logElement, metaSection, expander);

    summary.addEventListener('click', (e) => {
      // Don't toggle if clicking the expander button itself
      if (e.target === expander || expander.contains(e.target)) {
        return;
      }
      toggleHandler();
    });

    onClickStop(expander, toggleHandler);

    logsList.append(logElement);
  });

  logsSection.append(logsList);
  return logsSection;
}

