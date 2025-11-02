/*
 * Gravibe Datasets
 * Static datasets and live dataset creators
 */

import { jitterValue, randomInt, randomFloat, weightedRandomPick } from "../core/utils.js";

// Static datasets object - lines 332-1005 from original
export const neonDatasets = {
  timeSeries: [
    {
      label: "Nebula Production Run",
      axis: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"],
      series: [
        {
          name: "Projected",
          color: "accentPrimary",
          data: [420, 460, 520, 580, 610, 640, 700, 760],
        },
        {
          name: "Actual",
          color: "accentSecondary",
          data: [400, 455, 540, 560, 630, 655, 690, 720],
        },
        {
          name: "Capacity",
          color: "accentTertiary",
          data: [480, 480, 640, 640, 720, 720, 780, 780],
        },
      ],
    },
    {
      label: "Synthwave Stream",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        {
          name: "Listeners",
          color: "accentQuinary",
          data: [220, 260, 320, 420, 610, 580, 500],
        },
        {
          name: "Chat Bots",
          color: "accentQuaternary",
          data: [120, 140, 180, 260, 400, 360, 330],
        },
      ],
    },
  ],
  stateTimeline: [],
  statusHistory: [],
  barChart: [],
  histogram: [],
  heatmap: [],
  pieChart: [],
  candlestick: [],
  gauge: [],
  trend: [],
  xyScatter: [],
  stackedArea: [],
  dualAxis: [],
  radar: [],
  boxplot: [],
  sankey: [],
  treemap: [],
  funnel: [],
  stat: [],
  barGauge: [],
};

// Live dataset creators are defined in gravibe.js
// registerLiveDatasets() is also defined and called in gravibe.js

export function initDatasetSelector(article, datasetKey) {
  const select = article.querySelector(".dataset-select");
  const entries = neonDatasets[datasetKey] ?? [];

  if (!select) {
    return { select: null, defaultIndex: 0 };
  }

  select.innerHTML = "";

  entries.forEach((dataset, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    const liveSuffix = dataset.live ? " (Live)" : "";
    option.textContent = `${dataset.label}${liveSuffix}`;
    select.append(option);
  });

  // Default to the first streaming dataset so the dashboard feels alive on load.
  const liveIndex = entries.findIndex((dataset) => dataset.live);
  return { select, defaultIndex: liveIndex >= 0 ? liveIndex : 0 };
}
