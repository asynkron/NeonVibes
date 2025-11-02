/*
 * Gravibe Neon Chart Kit
 * Each component exposes multiple datasets and detailed comments so AI agents can remix the visuals quickly.
 */

import { initLogConsole, appendLogsFromSpans } from "./ui/logs.js";
import { initTraceViewer } from "./ui/trace.js";
import { sampleTraceSpans, sampleLogRows } from "./ui/sampleData.js";
import { componentRenderers } from "./charts/charts.js";
import { neonDatasets, initDatasetSelector } from "./charts/datasets.js";
import { colorPalettes, LIVE_DEFAULT_INTERVAL } from "./core/config.js";
import { paletteState, applyPalette, resolveColor, colorWithAlpha, setRerenderCallback } from "./core/palette.js";
import { withGlowBlur, withGlowColor, withOutlineWidth } from "./core/effects.js";
import { clamp } from "./core/utils.js";

const colorRoles = [
  "accentPrimary",
  "accentSecondary",
  "accentTertiary",
  "accentQuaternary",
  "accentQuinary",
  "accentSenary",
];

const DEFAULT_RENDERER_MODE = "svg";
const BACKGROUND_EFFECTS = ["solid", "linear", "radial"];
const DEFAULT_BACKGROUND_EFFECT = "solid";

// Each entry describes a selectable base palette so designers can add new themes quickly.
// Palettes and palette state are now imported from core modules

// We keep a registry of renderer callbacks so palette swaps can re-render everything in place.
const componentRegistry = new Set();

console.log("[gravibe.js] Module loaded, componentRegistry created");

// Track the current ECharts renderer so we can recreate instances when toggled.
const rendererState = { mode: DEFAULT_RENDERER_MODE };

function normalizeBackgroundEffect(effect) {
  return BACKGROUND_EFFECTS.includes(effect) ? effect : DEFAULT_BACKGROUND_EFFECT;
}

// Remember the chosen ambient background so the dropdown can stay in sync.
const backgroundState = {
  effect: normalizeBackgroundEffect(
    document.querySelector(".chart-shell")?.dataset.backgroundEffect ||
      document.body?.dataset.backgroundEffect ||
      DEFAULT_BACKGROUND_EFFECT
  ),
};

// Shared outline tone so every chart can render the same dark rim as the pie slices.
const chartOutlineColor = "rgba(15, 23, 42, 0.95)";

function rerenderAllComponents() {
  console.log("[gravibe.js rerenderAllComponents] Called, components in registry:", componentRegistry.size);
  // Use double requestAnimationFrame to ensure CSS variables are fully applied
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Force a synchronous layout calculation to ensure CSS variables are readable
      void document.documentElement.offsetHeight;
      
      let componentIndex = 0;
      componentRegistry.forEach((component) => {
        componentIndex++;
        try {
          // Support both old-style functions and new-style objects with update() method
          if (typeof component === "function") {
            // Legacy: call as function (for chart components)
            console.log(`[gravibe.js rerenderAllComponents] Component ${componentIndex}: calling as function`);
            component();
          } else if (component && typeof component.update === "function") {
            // New style: call update() method
            console.log(`[gravibe.js rerenderAllComponents] Component ${componentIndex}: calling update() method`);
            component.update();
          } else if (component && typeof component.render === "function") {
            // Fallback: call render() if update() is not available
            console.log(`[gravibe.js rerenderAllComponents] Component ${componentIndex}: calling render() method`);
            component.render();
          } else {
            console.warn(`[gravibe.js rerenderAllComponents] Component ${componentIndex}: unknown type`, typeof component, component);
          }
    } catch (error) {
          console.error(`[gravibe.js rerenderAllComponents] Component ${componentIndex}: Failed to update`, error);
    }
      });
    });
  });
}

// Shared glow/outline state so every renderer reads the same tuning values.
const effectDefaults = {
  glowIntensity: 1,
  glowOpacity: 0.45,
  outlineScale: 1,
  haloBlur: 28,
  haloOpacity: 0.28,
};

const effectsState = { ...effectDefaults };

// Keep the CSS custom properties in sync so purely visual halos stay configurable too.
function applyEffectCssVariables() {
  const root = document.documentElement;
  root.style.setProperty("--chart-glow-scale", effectsState.glowIntensity.toFixed(2));
  root.style.setProperty("--chart-glow-opacity", effectsState.glowOpacity.toFixed(2));
  root.style.setProperty("--chart-outline-scale", effectsState.outlineScale.toFixed(2));
  root.style.setProperty("--chart-halo-blur", `${effectsState.haloBlur}px`);
  root.style.setProperty("--chart-halo-opacity", effectsState.haloOpacity.toFixed(2));
}

// Effect utility functions are now imported from core/effects.js

// Declarative description of each slider so wiring new controls stays concise.
const effectControlSchema = [
  {
    selector: "#effect-glow-strength",
    property: "glowIntensity",
    output: "#effect-glow-strength-value",
    parser: Number.parseFloat,
    format: (value) => `${value.toFixed(2)}×`,
  },
  {
    selector: "#effect-glow-opacity",
    property: "glowOpacity",
    output: "#effect-glow-opacity-value",
    parser: Number.parseFloat,
    format: (value) => value.toFixed(2),
  },
  {
    selector: "#effect-outline-scale",
    property: "outlineScale",
    output: "#effect-outline-scale-value",
    parser: Number.parseFloat,
    format: (value) => `${value.toFixed(2)}×`,
  },
  {
    selector: "#effect-halo-blur",
    property: "haloBlur",
    output: "#effect-halo-blur-value",
    parser: Number.parseFloat,
    format: (value) => `${Math.round(value)}px`,
  },
  {
    selector: "#effect-halo-opacity",
    property: "haloOpacity",
    output: "#effect-halo-opacity-value",
    parser: Number.parseFloat,
    format: (value) => value.toFixed(2),
  },
];

function applyEffectsState() {
  applyEffectCssVariables();
  rerenderAllComponents();
}

function registerEffectControls() {
  applyEffectCssVariables();

  effectControlSchema.forEach(({ selector, property, output, parser, format }) => {
    const input = document.querySelector(selector);
    if (!input) {
      return;
    }

    const outputElement = output ? document.querySelector(output) : null;
    const parseValue = typeof parser === "function" ? parser : Number.parseFloat;

    const min = input.min !== "" ? Number.parseFloat(input.min) : undefined;
    const max = input.max !== "" ? Number.parseFloat(input.max) : undefined;

    const updateDisplay = () => {
      if (outputElement && typeof format === "function") {
        outputElement.textContent = format(effectsState[property]);
      }
    };

    const initialValue = effectsState[property];
    if (initialValue !== undefined) {
      input.value = String(initialValue);
    }
    updateDisplay();

    input.addEventListener("input", (event) => {
      const raw = parseValue(event.target.value);
      if (!Number.isFinite(raw)) {
        return;
      }
      const clamped = clamp(raw, min, max);
      effectsState[property] = property === "haloBlur" ? Math.max(0, clamped) : clamped;
      input.value = String(effectsState[property]);
      updateDisplay();
      applyEffectsState();
    });
  });
}

function registerRendererControl() {
  const select = document.querySelector("#renderer-select");
  if (!select) {
    return;
  }

  select.value = rendererState.mode;

  select.addEventListener("change", (event) => {
    const desired = event.target.value === "svg" ? "svg" : "canvas";
    if (rendererState.mode === desired) {
      return;
    }
    rendererState.mode = desired;
    rerenderAllComponents();
  });
}

function applyBackgroundEffect(effect) {
  const resolved = normalizeBackgroundEffect(effect);
  backgroundState.effect = resolved;
  if (document.body) {
    document.body.dataset.backgroundEffect = resolved;
  }
  document
    .querySelectorAll(".chart-shell")
    .forEach((shell) => {
      shell.dataset.backgroundEffect = resolved;
    });
}

function registerBackgroundControl() {
  const select = document.querySelector("#background-effect-select");
  if (!select) {
    applyBackgroundEffect(backgroundState.effect);
    return;
  }

  const initialEffect = backgroundState.effect;
  select.value = initialEffect;
  applyBackgroundEffect(initialEffect);

  select.addEventListener("change", (event) => {
    applyBackgroundEffect(event.target.value);
  });
}

// Color utility functions are now imported from core/palette.js
// neonDatasets is imported from charts/datasets.js


// Remove the above neonDatasets definition - it's now imported from charts/datasets.js
// The closing brace above is the end of the removed definition

function createLiveTimeSeriesDataset() {
  const axisLength = 14;
  const axis = [];
  const baseSeries = [
    { name: "Requests/min", color: "accentPrimary", base: 680, variance: 42, min: 520, max: 880 },
    { name: "Max Capacity", color: "accentTertiary", base: 760, variance: 28, min: 640, max: 920 },
    {
      name: "Error Rate %",
      color: "accentSenary",
      base: 1.6,
      variance: 0.6,
      min: 0.2,
      max: 5.2,
      precision: 1,
    },
  ];

  const dataset = {
    label: "Live Flux Telemetry",
    live: true,
    axis,
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 2200,
    reset,
    next,
    yAxes: [
      { name: "Requests/min", min: 400, max: 960, suffix: "" },
      { name: "Error Rate %", min: 0, max: 8, suffix: "%", decimals: 1 },
    ],
  };

  dataset.dualAxisSeries = [
    {
      name: baseSeries[0].name,
      color: baseSeries[0].color,
      type: "bar",
      axisIndex: 0,
      data: dataset.series[0].data,
    },
    {
      name: baseSeries[1].name,
      color: baseSeries[1].color,
      type: "line",
      axisIndex: 0,
      data: dataset.series[1].data,
    },
    {
      name: baseSeries[2].name,
      color: baseSeries[2].color,
      type: "line",
      axisIndex: 1,
      data: dataset.series[2].data,
    },
  ];

  let tick = 0;

  function formatTick(index) {
    const hour = String(index % 24).padStart(2, "0");
    const minute = String((index * 5) % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function reset() {
    axis.length = 0;
    tick = 0;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(formatTick(tick));
      tick += 1;
    }

    dataset.series.forEach((series, seriesIndex) => {
      const config = baseSeries[seriesIndex];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axis.length; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        const formatted =
          typeof config.precision === "number"
            ? parseFloat(value.toFixed(config.precision))
            : Math.round(value);
        series.data.push(formatted);
      }
    });
  }

  function next() {
    axis.push(formatTick(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    dataset.series.forEach((series, seriesIndex) => {
      const config = baseSeries[seriesIndex];
      const last = series.data[series.data.length - 1] ?? config.base;
      const value = jitterValue(last, config.variance, config.min, config.max);
      const formatted =
        typeof config.precision === "number"
          ? parseFloat(value.toFixed(config.precision))
          : Math.round(value);
      series.data.push(formatted);
      if (series.data.length > axisLength) {
        series.data.shift();
      }
    });
  }

  reset();
  return dataset;
}

function createLiveStateTimelineDataset() {
  const palette = {
    Idle: "accentQuaternary",
    Warmup: "accentQuaternary",
    Online: "accentPrimary",
    Alert: "accentSenary",
    Cooldown: "accentTertiary",
    Offline: "#475569",
    Calibration: "accentSecondary",
    Maintenance: "accentSecondary",
  };

  const dataset = {
    label: "Live Shift Timeline",
    live: true,
    maxTime: 8,
    tracks: [],
    palette,
    interval: 6000,
    next: reset,
    reset,
  };

  function buildTrack(name) {
    const spans = [];
    let cursor = 0;
    while (cursor < dataset.maxTime) {
      const duration = randomFloat(0.6, 1.6, 2);
      const end = Math.min(dataset.maxTime, parseFloat((cursor + duration).toFixed(2)));
      const state = weightedRandomPick([
        { value: "Online", weight: 4 },
        { value: "Idle", weight: 2 },
        { value: "Warmup", weight: 1.5 },
        { value: "Cooldown", weight: 1.5 },
        { value: "Alert", weight: 1 },
        { value: "Maintenance", weight: 0.8 },
        { value: "Calibration", weight: 0.7 },
        { value: "Offline", weight: 0.6 },
      ]);
      spans.push({ state, start: parseFloat(cursor.toFixed(2)), end });
      cursor = end;
    }
    return { name, spans };
  }

  function reset() {
    dataset.tracks = [
      buildTrack("Reactor Core"),
      buildTrack("Shield Array"),
      buildTrack("Drone Bay"),
    ];
  }

  reset();
  return dataset;
}

function createLiveStatusHistoryDataset() {
  const statusPalette = {
    Idle: "#1f2937",
    Online: "accentPrimary",
    Alert: "accentSenary",
    Maintenance: "accentSecondary",
    Offline: "#0f172a",
    Standby: "accentTertiary",
  };

  const categoryCount = 6;
  let tick = 0;

  const dataset = {
    label: "Live Relay Status",
    live: true,
    categories: Array.from({ length: categoryCount }, () => ""),
    series: [],
    interval: 5000,
    reset,
    next: reset,
  };

  const teams = ["Relay One", "Relay Two", "Relay Three"];
  const states = Object.keys(statusPalette);

  function formatCategory(index) {
    const hour = String(index % 24).padStart(2, "0");
    const minute = String((index * 10) % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function rotateCategories() {
    for (let i = 0; i < categoryCount; i += 1) {
      dataset.categories[i] = formatCategory(tick + i);
    }
    tick += 1;
  }

  function randomStates() {
    return dataset.categories.map(() => states[randomInt(0, states.length - 1)]);
  }

  function reset() {
    rotateCategories();
    dataset.series = teams.map((name) => ({
      name,
      states: randomStates(),
      colors: statusPalette,
    }));
  }

  reset();
  return dataset;
}

function createLiveHistogramDataset() {
  const bins = 8;
  const dataset = {
    label: "Live Signal Noise",
    live: true,
    bins: [],
    interval: 3200,
    reset,
    next,
  };

  function reset() {
    dataset.bins = Array.from({ length: bins }, () => randomInt(4, 18));
  }

  function next() {
    dataset.bins = dataset.bins.map((value) => Math.max(2, Math.round(jitterValue(value, 4, 2, 24))));
  }

  reset();
  return dataset;
}

function createLiveHeatmapDataset() {
  const width = 6;
  const height = 4;
  const dataset = {
    label: "Live Command Grid",
    live: true,
    xLabels: Array.from({ length: width }, (_, i) => `T+${i}h`),
    yLabels: ["Alpha", "Beta", "Gamma", "Delta"],
    matrix: [],
    interval: 2800,
    reset,
    next,
  };

  function reset() {
    dataset.matrix = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => randomFloat(0.2, 1, 2)),
    );
  }

  function next() {
    dataset.matrix = dataset.matrix.map((row) =>
      row.map((value) => parseFloat(jitterValue(value, 0.15, 0.05, 1).toFixed(2))),
    );
  }

  reset();
  return dataset;
}

function createLivePieChartDataset() {
  const slices = [
    { name: "Beacon", color: "accentPrimary" },
    { name: "Relay", color: "accentSecondary" },
    { name: "Drone", color: "accentTertiary" },
    { name: "Reserve", color: "accentQuinary" },
  ];

  const dataset = {
    label: "Live Signal Share",
    live: true,
    slices: [],
    interval: 3400,
    reset,
    next: reset,
  };

  function reset() {
    const totals = slices.map(() => randomInt(12, 36));
    const sum = totals.reduce((acc, value) => acc + value, 0);
    dataset.slices = slices.map((slice, index) => ({
      ...slice,
      value: Math.round((totals[index] / sum) * 100),
    }));
  }

  reset();
  return dataset;
}

function createLiveCandlestickDataset() {
  const axisLength = 10;
  const axis = [];
  const candles = [];
  let tick = 0;

  const dataset = {
    label: "Live Flux Futures",
    live: true,
    axis,
    candles,
    interval: 3600,
    reset,
    next,
  };

  function axisLabel(index) {
    return `T${String(index).padStart(2, "0")}`;
  }

  function makeCandle(base) {
    const open = jitterValue(base, 12, 420, 780);
    const close = jitterValue(open, 14, 420, 800);
    const high = Math.max(open, close) + Math.random() * 16;
    const low = Math.min(open, close) - Math.random() * 16;
    return [Math.round(open), Math.round(close), Math.round(low), Math.round(high)];
  }

  function reset() {
    axis.length = 0;
    candles.length = 0;
    tick = 0;
    let base = 640;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(axisLabel(tick));
      tick += 1;
      const candle = makeCandle(base);
      candles.push(candle);
      base = candle[1];
    }
  }

  function next() {
    axis.push(axisLabel(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    const base = candles[candles.length - 1]?.[1] ?? 640;
    const candle = makeCandle(base);
    candles.push(candle);
    if (candles.length > axisLength) {
      candles.shift();
    }
  }

  reset();
  return dataset;
}

function createLiveGaugeDataset() {
  const dataset = {
    label: "Live Charge Level",
    live: true,
    value: 70,
    target: 85,
    interval: 2400,
    reset,
    next,
  };

  function reset() {
    dataset.value = randomInt(54, 88);
  }

  function next() {
    dataset.value = Math.round(jitterValue(dataset.value, 6, 40, 100));
  }

  reset();
  return dataset;
}

function createLiveScatterDataset() {
  const dataset = {
    label: "Live Drone Swarms",
    live: true,
    series: [
      { name: "Squad A", color: "accentPrimary", points: [] },
      { name: "Squad B", color: "accentSecondary", points: [] },
    ],
    interval: 3000,
    reset,
    next,
  };

  function randomPoint() {
    return [randomInt(10, 40), randomInt(20, 60), randomInt(8, 18)];
  }

  function reset() {
    dataset.series.forEach((series) => {
      series.points = Array.from({ length: 4 }, () => randomPoint());
    });
  }

  function next() {
    dataset.series.forEach((series) => {
      series.points = series.points.map(([x, y, z]) => [
        Math.round(jitterValue(x, 4, 8, 48)),
        Math.round(jitterValue(y, 6, 10, 70)),
        Math.round(jitterValue(z, 3, 6, 22)),
      ]);
    });
  }

  reset();
  return dataset;
}

function createLiveRadarDataset() {
  const indicators = [
    { name: "CPU", max: 100 },
    { name: "Memory", max: 100 },
    { name: "Disk", max: 100 },
    { name: "Network", max: 100 },
    { name: "Saturation", max: 100 },
  ];

  const baseSeries = [
    { name: "Prod East", color: "accentPrimary", min: 55, max: 88 },
    { name: "Prod West", color: "accentSecondary", min: 52, max: 84 },
  ];

  const dataset = {
    label: "Live Cluster Health",
    live: true,
    indicators,
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 4200,
    reset,
    next,
  };

  function randomIndicatorValue(min, max) {
    return randomInt(min, max);
  }

  function reset() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data = indicators.map(() => randomIndicatorValue(config.min, config.max));
    });
  }

  function next() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data = series.data.map((value) =>
        Math.round(jitterValue(value, 6, config.min, config.max)),
      );
    });
  }

  reset();
  return dataset;
}

function createLiveBoxplotDataset() {
  const boxConfigs = [
    {
      name: "Gateway",
      color: "accentPrimary",
      medianBase: 148,
      medianRange: [120, 220],
      medianVariance: 10,
      innerSpread: [14, 26],
      outerSpread: [8, 22],
      min: 82,
      max: 260,
      outlierRange: [262, 296],
      outlierChance: 0.55,
    },
    {
      name: "Checkout",
      color: "accentSecondary",
      medianBase: 162,
      medianRange: [130, 236],
      medianVariance: 12,
      innerSpread: [16, 28],
      outerSpread: [10, 24],
      min: 90,
      max: 280,
      outlierRange: [272, 312],
      outlierChance: 0.6,
    },
    {
      name: "Inventory",
      color: "accentTertiary",
      medianBase: 150,
      medianRange: [112, 228],
      medianVariance: 11,
      innerSpread: [15, 26],
      outerSpread: [10, 22],
      min: 84,
      max: 268,
      outlierRange: [266, 302],
      outlierChance: 0.5,
    },
    {
      name: "Search",
      color: "accentQuinary",
      medianBase: 168,
      medianRange: [126, 246],
      medianVariance: 13,
      innerSpread: [16, 30],
      outerSpread: [12, 26],
      min: 90,
      max: 288,
      outlierRange: [284, 328],
      outlierChance: 0.62,
    },
  ];

  const dataset = {
    label: "Live Latency Distribution",
    live: true,
    categories: boxConfigs.map((config) => config.name),
    boxes: boxConfigs.map((config) => ({
      name: config.name,
      color: config.color,
      values: [],
    })),
    outliers: [],
    interval: 5200,
    reset,
    next,
  };

  function synthesizeBox(config, previousValues) {
    const last = Array.isArray(previousValues) && previousValues.length === 5 ? previousValues : null;
    const medianBaseline = last?.[2] ?? config.medianBase;
    const median = Math.round(
      clamp(
        jitterValue(medianBaseline, config.medianVariance, config.medianRange[0], config.medianRange[1]),
        config.medianRange[0],
        config.medianRange[1],
      ),
    );

    const innerSpread = randomInt(config.innerSpread[0], config.innerSpread[1]);
    const q1 = Math.round(
      clamp(median - innerSpread, config.min, median - 2),
    );
    const q3 = Math.round(
      clamp(median + innerSpread, median + 2, config.max),
    );

    const lowerExtension = randomInt(config.outerSpread[0], config.outerSpread[1]);
    const upperExtension = randomInt(config.outerSpread[0], config.outerSpread[1]);
    const min = Math.round(
      clamp((last?.[0] ?? q1 - lowerExtension), config.min, q1),
    );
    const max = Math.round(
      clamp((last?.[4] ?? q3 + upperExtension), q3, config.max),
    );

    return [min, q1, median, q3, max];
  }

  function rebuildBoxes(usePreviousValues = false) {
    dataset.boxes.forEach((box, index) => {
      const config = boxConfigs[index];
      box.values = synthesizeBox(config, usePreviousValues ? box.values : null);
    });
  }

  function rebuildOutliers() {
    dataset.outliers = [];
    boxConfigs.forEach((config, index) => {
      if (Math.random() > config.outlierChance) {
        return;
      }
      const value = randomInt(config.outlierRange[0], config.outlierRange[1]);
      dataset.outliers.push({
        name: `${config.name} spike`,
        color: "accentSenary",
        value: [index, value],
      });
    });
  }

  function reset() {
    rebuildBoxes(false);
    rebuildOutliers();
  }

  function next() {
    rebuildBoxes(true);
    rebuildOutliers();
  }

  reset();
  return dataset;
}

function createLiveSankeyDataset() {
  const nodeBlueprint = [
    { name: "Ingress", color: "accentPrimary" },
    { name: "API Gateway", color: "accentSecondary" },
    { name: "Auth", color: "accentTertiary" },
    { name: "Checkout", color: "accentQuinary" },
    { name: "Inventory", color: "accentQuaternary" },
    { name: "Search", color: "accentPrimary" },
    { name: "Payments", color: "accentSenary" },
    { name: "Data Lake", color: "accentSecondary" },
  ];

  const linkConfigs = [
    { source: "Ingress", target: "API Gateway", base: 820, variance: 42, min: 660, max: 900 },
    { source: "API Gateway", target: "Auth", base: 640, variance: 38, min: 520, max: 740 },
    { source: "API Gateway", target: "Search", base: 260, variance: 26, min: 180, max: 340 },
    { source: "Auth", target: "Checkout", base: 380, variance: 30, min: 280, max: 460 },
    { source: "Checkout", target: "Payments", base: 360, variance: 28, min: 260, max: 440 },
    { source: "Checkout", target: "Inventory", base: 240, variance: 24, min: 160, max: 320 },
    { source: "Inventory", target: "Data Lake", base: 160, variance: 20, min: 110, max: 230 },
    { source: "Search", target: "Data Lake", base: 220, variance: 24, min: 150, max: 300 },
  ];

  const dataset = {
    label: "Live Request Flow",
    live: true,
    nodes: [],
    links: [],
    interval: 4800,
    reset,
    next,
  };

  function rebuildNodes() {
    dataset.nodes = nodeBlueprint.map((node) => ({ ...node }));
  }

  function rebuildLinks(useExisting = false) {
    dataset.links = linkConfigs.map((config, index) => {
      const previous = useExisting ? dataset.links[index]?.value : null;
      const baseline = Number.isFinite(previous) ? previous : config.base;
      const value = Math.round(jitterValue(baseline, config.variance, config.min, config.max));
      return { source: config.source, target: config.target, value };
    });
  }

  function reset() {
    rebuildNodes();
    rebuildLinks(false);
  }

  function next() {
    if (dataset.nodes.length === 0 || dataset.links.length === 0) {
      reset();
      return;
    }
    rebuildLinks(true);
  }

  reset();
  return dataset;
}

function createLiveTreemapDataset() {
  const treeBlueprint = [
    {
      name: "Client",
      color: "accentPrimary",
      children: [
        { name: "Mobile", color: "accentPrimary", base: 28, variance: 4, min: 18, max: 42 },
        { name: "Web", color: "accentSecondary", base: 34, variance: 5, min: 24, max: 48 },
      ],
    },
    {
      name: "Edge",
      color: "accentTertiary",
      children: [
        { name: "CDN", color: "accentTertiary", base: 20, variance: 4, min: 12, max: 32 },
        { name: "WAF", color: "accentQuinary", base: 14, variance: 3, min: 8, max: 24 },
      ],
    },
    {
      name: "Core",
      color: "accentSecondary",
      children: [
        { name: "API", color: "accentSecondary", base: 38, variance: 6, min: 24, max: 54 },
        { name: "Checkout", color: "accentQuaternary", base: 30, variance: 5, min: 20, max: 44 },
        { name: "Search", color: "accentQuinary", base: 24, variance: 4, min: 16, max: 36 },
      ],
    },
  ];

  const dataset = {
    label: "Live Error Budget Burn",
    live: true,
    tree: [],
    interval: 5600,
    reset,
    next,
  };

  function cloneBlueprint(nodes) {
    return nodes.map((node) => ({
      name: node.name,
      color: node.color,
      ...(node.children ? { children: cloneBlueprint(node.children) } : {}),
    }));
  }

  function applyValues(targetNodes, blueprintNodes, useExisting = false) {
    targetNodes.forEach((target, index) => {
      const blueprint = blueprintNodes[index];
      if (!blueprint) {
        return;
      }

      if (Array.isArray(blueprint.children) && blueprint.children.length > 0) {
        if (!Array.isArray(target.children)) {
          target.children = [];
        }
        applyValues(target.children, blueprint.children, useExisting);
        target.value = target.children.reduce((sum, child) => sum + (child.value ?? 0), 0);
        return;
      }

      const previousValue = useExisting && Number.isFinite(target.value) ? target.value : blueprint.base;
      target.value = Math.round(
        clamp(
          jitterValue(previousValue, blueprint.variance, blueprint.min, blueprint.max),
          blueprint.min,
          blueprint.max,
        ),
      );
    });
  }

  function reset() {
    dataset.tree = cloneBlueprint(treeBlueprint);
    applyValues(dataset.tree, treeBlueprint, false);
  }

  function next() {
    if (!dataset.tree.length) {
      reset();
      return;
    }
    applyValues(dataset.tree, treeBlueprint, true);
  }

  reset();
  return dataset;
}

function createLiveFunnelDataset() {
  const stepConfigs = [
    { name: "Commits", color: "accentPrimary", ratio: 1 },
    { name: "Build", color: "accentSecondary", ratio: 0.88 },
    { name: "Test", color: "accentTertiary", ratio: 0.8 },
    { name: "Staging", color: "accentQuaternary", ratio: 0.72 },
    { name: "Production", color: "accentQuinary", ratio: 0.68 },
  ];

  const dataset = {
    label: "Live Deploy Pipeline",
    live: true,
    steps: [],
    interval: 4800,
    reset,
    next: reset,
  };

  function reset() {
    let current = randomInt(210, 280);
    dataset.steps = stepConfigs.map((step, index) => {
      if (index === 0) {
        return { ...step, value: current };
      }
      current = Math.max(
        0,
        Math.round(jitterValue(current * step.ratio, current * 0.08, 0, current)),
      );
      return { ...step, value: current };
    });
  }

  reset();
  return dataset;
}

function createLiveStatDataset() {
  const dataset = {
    label: "Live Core Output",
    live: true,
    value: 9600,
    delta: 0,
    deltaLabel: "vs. prior pulse",
    meta: "Neon array adjusting in real time",
    interval: 2600,
    unit: "",
    reset,
    next,
  };

  function reset() {
    dataset.value = randomInt(9000, 10200);
    dataset.delta = randomInt(-120, 180);
  }

  function next() {
    dataset.value = randomInt(9000, 10400);
    dataset.delta = randomInt(-180, 260);
  }

  reset();
  return dataset;
}

function createLiveBarGaugeDataset() {
  const sections = [
    { name: "Ops", color: "accentPrimary" },
    { name: "Defense", color: "accentSecondary" },
    { name: "Support", color: "accentTertiary" },
    { name: "Reserve", color: "accentQuaternary" },
  ];

  const dataset = {
    label: "Live Resource Allocation",
    live: true,
    sections: [],
    interval: 3200,
    reset,
    next: reset,
  };

  function reset() {
    const weights = sections.map(() => Math.random() + 0.4);
    const total = weights.reduce((sum, value) => sum + value, 0);
    dataset.sections = sections.map((section, index) => ({
      ...section,
      value: parseFloat((weights[index] / total).toFixed(2)),
    }));
  }

  reset();
  return dataset;
}

function registerLiveDatasets() {
  // Feed a single telemetry stream into every axis-based chart so they animate in sync.
  const sharedFluxDataset = createLiveTimeSeriesDataset();
  neonDatasets.timeSeries.push(sharedFluxDataset);
  neonDatasets.barChart.push(sharedFluxDataset);
  neonDatasets.trend.push(sharedFluxDataset);
  neonDatasets.stackedArea.push(sharedFluxDataset);
  neonDatasets.dualAxis.push(sharedFluxDataset);

  neonDatasets.stateTimeline.push(createLiveStateTimelineDataset());
  neonDatasets.statusHistory.push(createLiveStatusHistoryDataset());
  neonDatasets.histogram.push(createLiveHistogramDataset());
  neonDatasets.heatmap.push(createLiveHeatmapDataset());
  neonDatasets.pieChart.push(createLivePieChartDataset());
  neonDatasets.candlestick.push(createLiveCandlestickDataset());
  neonDatasets.gauge.push(createLiveGaugeDataset());
  neonDatasets.xyScatter.push(createLiveScatterDataset());
  neonDatasets.radar.push(createLiveRadarDataset());
  neonDatasets.boxplot.push(createLiveBoxplotDataset());
  neonDatasets.sankey.push(createLiveSankeyDataset());
  neonDatasets.treemap.push(createLiveTreemapDataset());
  neonDatasets.funnel.push(createLiveFunnelDataset());
  neonDatasets.stat.push(createLiveStatDataset());
  neonDatasets.barGauge.push(createLiveBarGaugeDataset());
}

registerLiveDatasets();

// Chart renderers have been extracted to charts/charts.js

// clamp function is now imported from core/utils.js

function jitterValue(value, variance, min, max) {
  const delta = (Math.random() * variance * 2) - variance;
  return clamp(value + delta, min, max);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function weightedRandomPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const target = Math.random() * total;
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight ?? 1;
    if (target <= cumulative) return item.value;
  }
  return items[items.length - 1]?.value;
}

function startLiveUpdater(callback, interval = LIVE_DEFAULT_INTERVAL) {
  const timer = window.setInterval(() => {
    try {
      callback();
    } catch (error) {
      console.error("Live data update failed", error);
    }
  }, interval);

  return {
    stop() {
      window.clearInterval(timer);
    },
  };
}

const liveDatasetControllers = new WeakMap();

function getLiveDatasetController(dataset) {
  let controller = liveDatasetControllers.get(dataset);
  if (!controller) {
    controller = { listeners: new Set(), updater: null };
    liveDatasetControllers.set(dataset, controller);
  }
  return controller;
}

function notifyLiveDatasetListeners(dataset) {
  const controller = liveDatasetControllers.get(dataset);
  if (!controller) {
    return;
  }

  controller.listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Live dataset listener failed", error);
    }
  });
}

function subscribeToLiveDataset(dataset, listener) {
  if (!dataset.live || typeof dataset.next !== "function") {
    return () => { };
  }

  const controller = getLiveDatasetController(dataset);
  controller.listeners.add(listener);

  if (!controller.updater) {
    const interval = dataset.interval ?? LIVE_DEFAULT_INTERVAL;
    controller.updater = startLiveUpdater(() => {
      dataset.next();
      notifyLiveDatasetListeners(dataset);
    }, interval);
  }

  return () => {
    controller.listeners.delete(listener);
    if (controller.listeners.size === 0 && controller.updater) {
      controller.updater.stop();
      controller.updater = null;
    }
  };
}


function setupComponent(article) {
  const datasetKey = article.getAttribute("data-component");
  const renderer = componentRenderers[datasetKey];

  if (!renderer) {
    console.warn(`No renderer registered for ${datasetKey}`);
    return;
  }

  const { select: datasetSelect, defaultIndex } = initDatasetSelector(article, datasetKey);
  let unsubscribeLive = null;
  let activeDataset = null;

  function stopLiveMode() {
    if (unsubscribeLive) {
      unsubscribeLive();
      unsubscribeLive = null;
    }
  }

  function renderIntoArticle(dataset) {
    const chartContainer = article.querySelector(".chart-canvas");
    if (chartContainer) {
      renderer(dataset, chartContainer);
    } else {
      renderer(dataset, article);
    }
  }

  function runRender() {
    // Fall back to a live dataset index when the selector is absent (e.g. stat cards).
    const defaultDatasetIndex = defaultIndex ?? 0;
    const rawValue = datasetSelect?.value ?? defaultDatasetIndex.toString();
    const parsedIndex = Number.parseInt(rawValue, 10);
    const selectedIndex = Number.isNaN(parsedIndex) ? defaultDatasetIndex : parsedIndex;
    const dataset = neonDatasets[datasetKey]?.[selectedIndex];

    if (!dataset) {
      stopLiveMode();
      activeDataset = null;
      console.warn(`Dataset not found for ${datasetKey}`);
      return;
    }

    if (dataset === activeDataset) {
      renderIntoArticle(dataset);
      return;
    }

    stopLiveMode();
    activeDataset = dataset;

    dataset.reset?.();
    renderIntoArticle(dataset);

    if (dataset.live && typeof dataset.next === "function") {
      notifyLiveDatasetListeners(dataset);
      unsubscribeLive = subscribeToLiveDataset(dataset, () => renderIntoArticle(dataset));
    }
  }

  if (datasetSelect) {
    datasetSelect.addEventListener("change", runRender);
    datasetSelect.value = (defaultIndex ?? 0).toString();
  }

  runRender();

  componentRegistry.add(runRender);
}

async function initGravibe() {
  console.log("[gravibe.js initGravibe] Called");
  
  // Set the rerender callback so palette changes trigger component updates
  setRerenderCallback(rerenderAllComponents);
  console.log("[gravibe.js initGravibe] Registered rerenderAllComponents callback");
  
  const defaultPalette =
    colorPalettes.find((palette) => palette.id === paletteState.activeId) ?? colorPalettes[0];

  if (defaultPalette) {
    console.log("[gravibe.js initGravibe] Applying default palette:", defaultPalette.id);
    applyPalette(defaultPalette);
  }

  registerEffectControls();
  registerRendererControl();
  registerBackgroundControl();

  const paletteSelect = document.querySelector("#palette-select");
  if (paletteSelect) {
    console.log("[gravibe.js initGravibe] Loading palettes:", colorPalettes.length, "palettes found");
    paletteSelect.innerHTML = "";
    colorPalettes.forEach((palette) => {
      console.log("[gravibe.js initGravibe] Adding palette option:", palette.id, palette.label);
      const option = document.createElement("option");
      option.value = palette.id;
      option.textContent = palette.label;
      paletteSelect.append(option);
    });
    console.log("[gravibe.js initGravibe] Palette dropdown populated with", paletteSelect.options.length, "options");

    if (paletteState.activeId) {
      paletteSelect.value = paletteState.activeId;
    }

    paletteSelect.addEventListener("change", (event) => {
      const selected = colorPalettes.find((palette) => palette.id === event.target.value);
      if (selected) {
        console.log("[gravibe.js] Palette select changed to:", selected.id);
        applyPalette(selected);
      }
    });
  }

  const components = document.querySelectorAll(".component-card");
  components.forEach((component) => setupComponent(component));

  const logConsoleHost = document.querySelector('[data-component="logConsole"]');
  const traceHost = document.querySelector('[data-component="traceViewer"]');
  
  // Always ensure logs are generated from spans first, before initializing either component
  // This ensures both logConsole and traceViewer see the complete log list
  const allLogRows = await appendLogsFromSpans(sampleTraceSpans);
  
  // Ensure sampleLogRows module is loaded in trace.js before initializing trace viewer
  // This ensures getSampleLogRows() can access the logs when rendering spans
  if (traceHost) {
    const { ensureSampleLogRowsLoaded } = await import("./ui/trace.js");
    await ensureSampleLogRowsLoaded();
  }
  
  if (logConsoleHost) {
    const rerenderLogConsole = initLogConsole(logConsoleHost, allLogRows);
    componentRegistry.add(rerenderLogConsole);
  }

  if (traceHost) {
    const rerenderTrace = initTraceViewer(traceHost, sampleTraceSpans);
    console.log("[gravibe.js initGravibe] Trace viewer initialized, component:", rerenderTrace);
    console.log("[gravibe.js initGravibe] Component has update method:", typeof rerenderTrace?.update === "function");
    componentRegistry.add(rerenderTrace);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGravibe);
} else {
  initGravibe();
}
