/**
 * Gravibe Sequence Diagram Generator
 * Custom HTML/CSS/JS sequence diagram renderer based on trace metamodel data.
 * Replaces Mermaid with a custom implementation for full control.
 */

import { createComponentKey, ComponentKind } from "./metaModel.js";
import { getPaletteColors } from "../core/palette.js";
import { normalizeColorBrightness, hexToRgb } from "../core/colors.js";

/**
 * @typedef {import("./trace.js").TraceModel} TraceModel
 * @typedef {import("./trace.js").TraceSpanNode} TraceSpanNode
 * @typedef {import("./trace.js").Component} Component
 * @typedef {import("./trace.js").Group} Group
 */

/**
 * Configuration for sequence diagram rendering
 * @typedef {Object} SequenceConfig
 * @property {boolean} showAttributes - Show span attributes as notes
 * @property {boolean} showLogs - Show logs as notes
 * @property {boolean} showAsync - Show async call groups
 * @property {boolean} showRecursion - Show recursive calls (same component)
 */

const DEFAULT_CONFIG = {
  showAttributes: true,
  showLogs: true,
  showAsync: true,
  showRecursion: true,
};

/**
 * Sequence Diagram Model
 * @typedef {Object} SequenceModel
 * @property {Map<string, SequenceGroup>} groups - Map of group ID to group
 * @property {SequenceParticipant[]} participants - Ordered list of participants (components)
 */

/**
 * Sequence Group
 * @typedef {Object} SequenceGroup
 * @property {string} id - Group ID
 * @property {string} name - Group name
 * @property {string} backgroundColor - Background color (rgba)
 * @property {SequenceParticipant[]} participants - Participants in this group
 */

/**
 * Sequence Participant (Component)
 * @typedef {Object} SequenceParticipant
 * @property {string} id - Component ID
 * @property {string} name - Component name
 * @property {string} groupId - Group ID (empty string if no group)
 * @property {string} backgroundColor - Header/footer background color (solid)
 */

/**
 * Builds a sequence diagram model from the trace model
 * @param {TraceModel} trace - The trace model with groups and components
 * @returns {SequenceModel}
 */
function buildSequenceModel(trace) {
  console.log("[buildSequenceModel] Building sequence model from trace");

  const groups = new Map();
  const participants = [];

  // Helper to compute service color (same logic as trace viewer)
  const computeServiceColor = (serviceName) => {
    const paletteColors = getPaletteColors();
    if (paletteColors.length === 0) return null;
    const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const colorIndex = serviceIndex % paletteColors.length;
    const paletteColor = paletteColors[colorIndex];
    if (!paletteColor) return null;
    return normalizeColorBrightness(paletteColor, 50, 0.7);
  };

  // Build groups map
  trace.groups.forEach((group) => {
    const groupParticipants = [];

    // Find components in this group
    trace.components.forEach((component) => {
      if (component.groupId === group.id && component.serviceName) {
        const color = computeServiceColor(component.serviceName);
        const rgb = color ? hexToRgb(color) : null;

        const participant = {
          id: component.id,
          name: component.name,
          groupId: group.id,
          backgroundColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)` : 'rgba(97, 175, 239, 1.0)',
        };

        groupParticipants.push(participant);
        participants.push(participant);
      }
    });

    // Get background color from first participant's service
    const firstComponent = groupParticipants[0];
    let groupBgColor = "";
    if (firstComponent && trace.components.has(firstComponent.id)) {
      const component = trace.components.get(firstComponent.id);
      if (component?.serviceName) {
        const color = computeServiceColor(component.serviceName);
        if (color) {
          const rgb = hexToRgb(color);
          if (rgb) {
            groupBgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
          }
        }
      }
    }

    groups.set(group.id, {
      id: group.id,
      name: group.name,
      backgroundColor: groupBgColor,
      participants: groupParticipants,
    });
  });

  // Add ungrouped participants (components without a group or with invalid groupId)
  trace.components.forEach((component) => {
    const isGrouped = component.groupId && component.groupId !== "" && trace.groups.has(component.groupId);
    if (!isGrouped && component.serviceName) {
      // Check if this participant was already added as part of a group
      const alreadyAdded = participants.some(p => p.id === component.id);
      if (!alreadyAdded) {
        const color = computeServiceColor(component.serviceName);
        const rgb = color ? hexToRgb(color) : null;

        const participant = {
          id: component.id,
          name: component.name,
          groupId: "", // No group
          backgroundColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)` : 'rgba(97, 175, 239, 1.0)',
        };

        participants.push(participant);
      }
    }
  });

  console.log("[buildSequenceModel] Built model:", {
    groups: groups.size,
    participants: participants.length,
  });

  return {
    groups,
    participants,
  };
}

/**
 * Renders the sequence diagram as HTML
 * @param {SequenceModel} sequenceModel - The sequence model
 * @returns {HTMLElement} The rendered diagram container
 */
function renderSequenceDiagram(sequenceModel) {
  console.log("[renderSequenceDiagram] Rendering diagram");

  const container = document.createElement("div");
  container.className = "custom-sequence-diagram";

  // Create groups container (for background colors)
  // Groups are positioned behind participants as background
  // We'll render groups later once we know participant positions

  // Create participants container (flex row)
  const participantsContainer = document.createElement("div");
  participantsContainer.className = "sequence-participants";

  // Render each participant as a column
  sequenceModel.participants.forEach((participant) => {
    const participantColumn = document.createElement("div");
    participantColumn.className = "sequence-participant-column";
    participantColumn.dataset.participantId = participant.id;

    // Header
    const header = document.createElement("div");
    header.className = "sequence-participant-header";
    header.style.backgroundColor = participant.backgroundColor;
    header.textContent = participant.name;
    participantColumn.appendChild(header);

    // Content area (where calls and notes will go later)
    const content = document.createElement("div");
    content.className = "sequence-participant-content";
    participantColumn.appendChild(content);

    // Footer (identical to header)
    const footer = document.createElement("div");
    footer.className = "sequence-participant-footer";
    footer.style.backgroundColor = participant.backgroundColor;
    footer.textContent = participant.name;
    participantColumn.appendChild(footer);

    participantsContainer.appendChild(participantColumn);
  });

  container.appendChild(participantsContainer);

  return container;
}

/**
 * Initializes the sequence diagram viewer component
 * @param {HTMLElement} host - Container element for the diagram
 * @param {import("./trace.js").TraceSpan[]} spans - Trace spans
 * @param {SequenceConfig=} config - Configuration options
 * @returns {{ render: () => void, update: () => void }}
 */
export function initSequenceDiagram(host, spans, config = {}) {
  console.log("[initSequenceDiagram] Called, host:", host);
  if (!host) {
    console.log("[initSequenceDiagram] No host, returning empty functions");
    return { render: () => { }, update: () => { } };
  }

  let trace = null;
  let sequenceModel = null;

  const render = async () => {
    if (!spans || spans.length === 0) {
      host.innerHTML = "<p>No trace data available</p>";
      return;
    }

    try {
      // Import and build trace model
      const traceModule = await import("./trace.js");
      const { buildTraceModel, ensureSampleLogRowsLoaded } = traceModule;

      // Ensure log rows are loaded
      await ensureSampleLogRowsLoaded();

      // Get log rows via the sampleData module
      const { sampleLogRows } = await import("./sampleData.js");

      // Build trace model with logs merged
      trace = buildTraceModel(spans, sampleLogRows);

      // Build sequence model from trace model
      sequenceModel = buildSequenceModel(trace);

      // Render the diagram
      const diagram = renderSequenceDiagram(sequenceModel);

      // Clear and append
      host.innerHTML = "";
      host.appendChild(diagram);

      console.log("[initSequenceDiagram] Sequence diagram rendered");
    } catch (error) {
      console.error("[initSequenceDiagram] Error rendering diagram:", error);
      host.innerHTML = `<p>Error rendering sequence diagram: ${error.message}</p>`;
    }
  };

  const update = () => {
    // Re-render when palette changes
    if (sequenceModel) {
      console.log("[initSequenceDiagram] Updating sequence diagram");
      render();
    } else {
      render();
    }
  };

  // Initial render
  render();

  return { render, update };
}

// Export for testing/debugging
export { buildSequenceModel, renderSequenceDiagram };
