/**
 * Trace Header Component
 * Renders the header section of the trace viewer
 */

import { h } from "../../core/dom.js";
import { onChange } from "../../core/events.js";
import { formatTimestamp } from "../trace.js";

/**
 * Renders the trace header with title, meta, and controls.
 * @param {import("../trace.js").TraceModel} trace - The trace model
 * @param {import("../../core/stateManager.js").TraceViewState} viewState - The view state
 * @param {HTMLElement} host - The host element
 * @param {Function} renderTrace - Function to re-render the trace
 * @returns {HTMLElement} The header element
 */
export function renderTraceHeader(trace, viewState, host, renderTrace) {
  const header = h('header', { className: 'trace-header' });

  const title = h('h3', { textContent: `Trace ${trace.traceId}` });
  header.append(title);

  const meta = h('p', {
    className: 'trace-meta',
    textContent: `Spans: ${trace.spanCount} • Window: ${formatTimestamp(
      trace.startTimeUnixNano
    )} – ${formatTimestamp(trace.endTimeUnixNano)}`
  });
  header.append(meta);

  // Add runline toggles
  const controls = h('div', { className: 'trace-controls' });

  const runlineXCheckbox = h('input', {
    type: 'checkbox',
    checked: viewState.showRunlineX !== false
  });
  onChange(runlineXCheckbox, (e) => {
    viewState.showRunlineX = e.target.checked;
    renderTrace(host, trace, viewState);
  });
  const runlineXLabel = h('label', { className: 'trace-control' }, runlineXCheckbox, ' Runline X');

  const runlineYCheckbox = h('input', {
    type: 'checkbox',
    checked: viewState.showRunlineY !== false
  });
  onChange(runlineYCheckbox, (e) => {
    viewState.showRunlineY = e.target.checked;
    renderTrace(host, trace, viewState);
  });
  const runlineYLabel = h('label', { className: 'trace-control' }, runlineYCheckbox, ' Runline Y');

  controls.append(runlineXLabel);
  controls.append(runlineYLabel);
  header.append(controls);

  return header;
}

