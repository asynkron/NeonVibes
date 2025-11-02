/*
 * Gravibe Chart Renderers
 * ECharts renderer functions for all chart types
 */

import { rendererState, withGlowBlur, withGlowColor, withOutlineWidth } from "../core/effects.js";
import { colorWithAlpha, resolveColor } from "../core/palette.js";
import { chartOutlineColor } from "../core/config.js";

// Chart instance management
const chartResizeHandlers = new WeakMap();

function disposeChartInstance(chart) {
  if (!chart) {
    return;
  }

  const resizeHandler = chartResizeHandlers.get(chart);
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    chartResizeHandlers.delete(chart);
  }

  chart.dispose();
}

function createChartInstance(container) {
  const desiredRenderer = rendererState.mode;
  const existing = echarts.getInstanceByDom(container);
  const currentRenderer = container.dataset.rendererMode;

  if (existing && currentRenderer === desiredRenderer) {
    container.dataset.rendererMode = desiredRenderer;
    return existing;
  }

  if (existing) {
    disposeChartInstance(existing);
  }

  const chart = echarts.init(container, undefined, { renderer: desiredRenderer });
  const resizeHandler = () => chart.resize();
  chartResizeHandlers.set(chart, resizeHandler);
  window.addEventListener("resize", resizeHandler);
  container.dataset.rendererMode = desiredRenderer;
  return chart;
}

function applyChartOption(chart, option, overrides = {}) {
  // Force a full option refresh so live updates do not flicker between clear/redraw cycles.
  chart.setOption(option, {
    notMerge: true,
    lazyUpdate: false,
    ...overrides,
  });
}

// Render functions
function renderTimeSeries(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    series: (dataset.series ?? []).map((series) => ({
      name: series.name,
      type: "line",
      smooth: true,
      data: series.data,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.53) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
    })),
  });

  return chart;
}

// Note: Due to file size constraints, I'll extract the remaining render functions
// using sed and then append them. Let me do this more efficiently.
function renderStateTimeline(dataset, container) {
  const chart = createChartInstance(container);

  const timelineSeries = dataset.tracks.flatMap((track, index) =>
    track.spans.map((span) => {
      const colorRef = dataset.palette[span.state] ?? "accentPrimary";
      return {
        name: track.name,
        value: [index, span.start, span.end, span.state],
        itemStyle: {
          color: resolveColor(colorRef),
        },
      };
    }),
  );

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "4%",
      right: "4%",
      top: "16%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      min: 0,
      max: dataset.maxTime,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "category",
      data: dataset.tracks.map((track) => track.name),
      axisLabel: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const [index, start, end, state] = params.data.value;
        const track = dataset.tracks[index];
        return `State: ${state}<br/>Track: ${track.name}<br/>From: ${start}h to ${end}h`;
      },
    },
    series: [
      {
        type: "custom",
        renderItem(params, api) {
          const categoryIndex = api.value(0);
          const start = api.coord([api.value(1), categoryIndex]);
          const end = api.coord([api.value(2), categoryIndex]);
          const height = api.size([0, 1])[1] * 0.6;

          return {
            type: "rect",
            shape: echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height,
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height,
              },
            ),
            style: api.style({
              opacity: 0.9,
              shadowBlur: withGlowBlur(20),
              shadowColor: withGlowColor(api.style().fill, 0.8),
              stroke: chartOutlineColor,
              lineWidth: withOutlineWidth(1),
            }),
          };
        },
        data: timelineSeries,
      },
    ],
  });

  return chart;
}

function renderStatusHistory(dataset, container) {
  const chart = createChartInstance(container);

  const categories = dataset.categories;
  const statusSet = new Set();

  dataset.series.forEach((series) => {
    series.states.forEach((state) => statusSet.add(state));
  });

  const statuses = Array.from(statusSet);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "bar",
      stack: "status",
      emphasis: {
        focus: "series",
      },
      data: series.states.map((state) => ({
        value: 1,
        status: state,
        itemStyle: {
          color: resolveColor(series.colors[state] ?? "accentPrimary"),
          opacity: 0.9,
          shadowBlur: withGlowBlur(16),
          shadowColor: withGlowColor(series.colors[state] ?? "accentPrimary", 0.65),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
      })),
    })),
  });

  return chart;
}

function renderBarChart(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "bar",
      barWidth: "35%",
      data: series.data,
      itemStyle: {
        borderRadius: [6, 6, 6, 6],
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(series.color, 0.53),
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: resolveColor(series.color) },
          { offset: 1, color: colorWithAlpha(series.color, 0.47) },
        ]),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
      },
    })),
  });

  return chart;
}

function renderHistogram(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.bins.map((_, index) => `Band ${index + 1}`),
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    series: [
      {
        type: "bar",
        data: dataset.bins,
        barWidth: "60%",
        itemStyle: {
          borderRadius: [10, 10, 10, 10],
          shadowBlur: withGlowBlur(20),
          shadowColor: withGlowColor("accentPrimary", 0.35),
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorWithAlpha("accentPrimary", 0.9) },
            { offset: 1, color: colorWithAlpha("accentTertiary", 0.6) },
          ]),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
      },
    ],
  });

  return chart;
}

function renderHeatmap(dataset, container) {
  const chart = createChartInstance(container);

  const flattened = dataset.matrix.flat();
  const min = Math.min(...flattened);
  const max = Math.max(...flattened);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.xLabels,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "category",
      data: dataset.yLabels,
      axisLabel: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: {
        color: "rgba(226, 232, 240, 0.7)",
      },
      inRange: {
        color: ["#1e293b", resolveColor("accentPrimary")],
      },
    },
    tooltip: {
      position: "top",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ value }) => `Intensity: ${value[2]}`,
    },
    series: [
      {
        name: dataset.label,
        type: "heatmap",
        data: dataset.matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
        ),
        itemStyle: {
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
      },
    ],
  });

  return chart;
}

function renderPieChart(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ name, value, percent }) => `${name}: ${value} (${percent}%)`,
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "center",
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
    },
    series: [
      {
        name: dataset.label,
        type: "pie",
        radius: ["40%", "70%"],
        center: ["60%", "50%"],
        roseType: "radius",
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 12,
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(2),
        },
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        labelLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.5)",
          },
        },
        data: dataset.slices.map((slice) => ({
          value: slice.value,
          name: slice.name,
          itemStyle: {
            color: resolveColor(slice.color),
            shadowBlur: withGlowBlur(25),
            shadowColor: withGlowColor(slice.color, 0.53),
          },
        })),
      },
    ],
  });

  return chart;
}

function renderCandlestick(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      scale: true,
      boundaryGap: true,
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    yAxis: {
      scale: true,
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    series: [
      {
        name: dataset.label,
        type: "candlestick",
        data: dataset.candles,
        itemStyle: {
          color: colorWithAlpha("accentPrimary", 0.7),
          color0: colorWithAlpha("accentSecondary", 0.7),
          borderColor: colorWithAlpha("accentPrimary", 0.9),
          borderColor0: colorWithAlpha("accentSecondary", 0.9),
          shadowBlur: withGlowBlur(18),
          shadowColor: withGlowColor("accentPrimary", 0.35),
        },
      },
    ],
  });

  return chart;
}

function renderGauge(dataset, container) {
  const chart = createChartInstance(container);

  // Clamp values so the gauge never renders beyond its 0-100 domain.
  const value = Math.min(Math.max(dataset.value ?? 0, 0), 100);
  const target = Math.min(Math.max(dataset.target ?? 0, 0), 100);
  const valueRatio = value / 100;
  const targetRatio = target / 100;

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: () =>
        `${dataset.label}<br/>Current: ${value}%<br/>Target: ${target}%`,
    },
    series: [
      {
        // Wide halo that pushes a bloom behind the active charge arc.
        name: `${dataset.label} Halo`,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "104%",
        axisLine: {
          lineStyle: {
            width: 28,
            color: [
              [valueRatio, colorWithAlpha("accentPrimary", 0.18)],
              [1, "rgba(15, 23, 42, 0)"],
            ],
            shadowBlur: withGlowBlur(45),
            shadowColor: withGlowColor("accentPrimary", 0.6),
          },
        },
        pointer: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        silent: true,
        z: 0,
      },
      {
        // Outer track that highlights the remaining distance to the target threshold.
        name: `${dataset.label} Track`,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "100%",
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [targetRatio, colorWithAlpha("accentPrimary", 0.15)],
              [1, "rgba(15, 23, 42, 0.45)"],
            ],
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentPrimary", 0.28),
          },
        },
        splitNumber: 5,
        splitLine: {
          distance: -4,
          length: 12,
          lineStyle: {
            color: colorWithAlpha("accentPrimary", 0.25),
          },
        },
        axisLabel: {
          color: "rgba(148, 163, 184, 0.65)",
          fontFamily: "Share Tech Mono, monospace",
        },
        axisTick: {
          show: false,
        },
        pointer: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        silent: true,
        z: 1,
      },
      {
        // Inner neon arc that animates to the current value.
        name: dataset.label,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "84%",
        progress: {
          show: true,
          roundCap: true,
          width: 16,
          itemStyle: {
            color: colorWithAlpha("accentPrimary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(26),
            shadowColor: withGlowColor("accentPrimary", 0.55),
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [
              [valueRatio, colorWithAlpha("accentPrimary", 0.95)],
              [1, "rgba(15, 23, 42, 0.05)"],
            ],
            shadowBlur: withGlowBlur(32),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
        pointer: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: "rgba(226, 232, 240, 0.9)",
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 28,
          offsetCenter: [0, "40%"],
        },
        title: {
          color: "rgba(226, 232, 240, 0.75)",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 14,
          offsetCenter: [0, "70%"],
        },
        data: [
          {
            value,
            name: dataset.label,
          },
        ],
        z: 3,
      },
      {
        // Thin pointer that marks the target threshold.
        name: "Target",
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "100%",
        axisLine: {
          lineStyle: {
            width: 0,
          },
        },
        pointer: {
          show: true,
          width: 6,
          length: "68%",
          itemStyle: {
            color: colorWithAlpha("accentSecondary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentSecondary", 0.45),
          },
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 16,
          itemStyle: {
            color: colorWithAlpha("accentPrimary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(4),
            shadowBlur: withGlowBlur(18),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        data: [
          {
            value: target,
          },
        ],
        z: 5,
      },
    ],
  });

  return chart;
}

function renderTrend(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: {
        width: 2,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.6) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
      data: series.data,
    })),
  });

  return chart;
}

function renderXYScatter(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ data, seriesName }) =>
        `${seriesName}<br/>X: ${data[0]}<br/>Y: ${data[1]}<br/>Z: ${data[2]}`,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "scatter",
      symbolSize: (data) => data[2],
      itemStyle: {
        color: resolveColor(series.color),
        shadowBlur: withGlowBlur(15),
        shadowColor: withGlowColor(series.color, 0.53),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
      },
      data: series.points,
    })),
  });

  return chart;
}

function renderStackedArea(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "line",
      stack: dataset.label ?? "stacked",
      smooth: true,
      symbol: "none",
      lineStyle: {
        width: 2,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.65) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
      emphasis: {
        focus: "series",
      },
      data: series.data,
    })),
  });

  return chart;
}

function renderDualAxis(dataset, container) {
  const chart = createChartInstance(container);

  const axisConfigs = dataset.yAxes ?? [];
  const combinedSeries = dataset.dualAxisSeries ?? dataset.series ?? [];
  const axisColorMap = new Map();
  combinedSeries.forEach((series) => {
    const index = series.axisIndex ?? 0;
    if (!axisColorMap.has(index)) {
      axisColorMap.set(index, resolveColor(series.color ?? "accentPrimary"));
    }
  });

  const yAxis = axisConfigs.map((axis, index) => {
    const resolvedColor = axisColorMap.get(index) ?? resolveColor("accentPrimary");
    const decimals = typeof axis.decimals === "number" ? axis.decimals : 0;

    return {
      type: "value",
      name: axis.name ?? "",
      position: index === 0 ? "left" : "right",
      offset: index > 1 ? (index - 1) * 56 : 0,
      min: axis.min,
      max: axis.max,
      axisLine: {
        lineStyle: {
          color: colorWithAlpha(resolvedColor, 0.45),
        },
      },
      axisLabel: {
        formatter: (value) => {
          const formatted = Number.parseFloat(value).toFixed(decimals);
          return `${formatted}${axis.suffix ?? ""}`;
        },
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        show: index === 0,
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    };
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: axisConfigs.length > 1 ? "12%" : "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    legend: {
      data: combinedSeries.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis,
    series: combinedSeries.map((series) => {
      const isBar = (series.type ?? "bar") === "bar";
      const color = resolveColor(series.color);
      return {
        name: series.name,
        type: series.type ?? "bar",
        yAxisIndex: series.axisIndex ?? 0,
        data: series.data,
        smooth: (series.type ?? "") === "line",
        showSymbol: (series.type ?? "") === "line",
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: isBar
          ? {
            borderRadius: [6, 6, 0, 0],
            shadowBlur: withGlowBlur(18),
            shadowColor: withGlowColor(series.color, 0.45),
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color },
              { offset: 1, color: colorWithAlpha(series.color, 0.45) },
            ]),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
          }
          : {
            color,
            shadowBlur: withGlowBlur(16),
            shadowColor: withGlowColor(series.color, 0.45),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
          },
      };
    }),
  });

  return chart;
}

function renderRadar(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    radar: {
      indicator: dataset.indicators ?? [],
      radius: "62%",
      splitNumber: 5,
      shape: "polygon",
      axisName: {
        color: "rgba(226, 232, 240, 0.75)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      splitArea: {
        areaStyle: {
          color: [
            "rgba(15, 23, 42, 0.9)",
            "rgba(15, 23, 42, 0.7)",
            "rgba(15, 23, 42, 0.5)",
            "rgba(15, 23, 42, 0.3)",
            "rgba(15, 23, 42, 0.1)",
          ],
        },
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.18),
        },
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.22),
        },
      },
    },
    series: [
      {
        type: "radar",
        data: (dataset.series ?? []).map((series) => ({
          value: series.data,
          name: series.name,
          lineStyle: {
            color: resolveColor(series.color),
            width: 2,
          },
          areaStyle: {
            color: colorWithAlpha(series.color, 0.25),
          },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: {
            color: resolveColor(series.color),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(14),
            shadowColor: withGlowColor(series.color, 0.4),
          },
        })),
      },
    ],
  });

  return chart;
}

function renderBoxplot(dataset, container) {
  const chart = createChartInstance(container);

  const boxData = (dataset.boxes ?? []).map((box) => ({
    value: box.values,
    name: box.name,
    itemStyle: {
      color: colorWithAlpha(box.color ?? "accentPrimary", 0.65),
      borderColor: resolveColor(box.color ?? "accentPrimary"),
      borderWidth: withOutlineWidth(1),
      shadowBlur: withGlowBlur(18),
      shadowColor: withGlowColor(box.color ?? "accentPrimary", 0.45),
    },
  }));

  const outlierData = (dataset.outliers ?? []).map((outlier) => ({
    value: outlier.value,
    name: outlier.name,
    itemStyle: {
      color: resolveColor(outlier.color ?? "accentSenary"),
      shadowBlur: withGlowBlur(16),
      shadowColor: withGlowColor(outlier.color ?? "accentSenary", 0.45),
      borderColor: chartOutlineColor,
      borderWidth: withOutlineWidth(1),
    },
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "8%",
      right: "6%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (params.seriesType === "scatter") {
          return `${params.name}<br/>Value: ${params.data.value[1]} ms`;
        }
        if (Array.isArray(params.data?.value)) {
          const [min, q1, median, q3, max] = params.data.value;
          return `${params.name}<br/>P25: ${q1} ms<br/>P50: ${median} ms<br/>P75: ${q3} ms<br/>Min/Max: ${min} ms / ${max} ms`;
        }
        return params.name;
      },
    },
    xAxis: {
      type: "category",
      data: dataset.categories,
      boundaryGap: true,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
        formatter: (value) => `${value} ms`,
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: [
      {
        name: dataset.label,
        type: "boxplot",
        data: boxData,
      },
      {
        name: "Outliers",
        type: "scatter",
        data: outlierData,
      },
    ],
  });

  return chart;
}

function renderSankey(dataset, container) {
  const chart = createChartInstance(container);

  const colorLookup = new Map();
  (dataset.nodes ?? []).forEach((node) => {
    colorLookup.set(node.name, resolveColor(node.color ?? "accentPrimary"));
  });

  const nodes = (dataset.nodes ?? []).map((node) => {
    const color = colorLookup.get(node.name) ?? resolveColor("accentPrimary");
    return {
      name: node.name,
      itemStyle: {
        color,
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(node.color ?? color, 0.4),
      },
    };
  });

  const links = (dataset.links ?? []).map((link) => {
    const sourceColor = colorLookup.get(link.source) ?? resolveColor("accentPrimary");
    return {
      ...link,
      lineStyle: {
        color: colorWithAlpha(sourceColor, 0.55),
        opacity: 0.85,
        curveness: 0.5,
      },
    };
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (params.dataType === "edge") {
          return `${params.data.source} → ${params.data.target}<br/>${params.data.value} req/min`;
        }
        return `${params.name}`;
      },
    },
    series: [
      {
        type: "sankey",
        data: nodes,
        links,
        draggable: false,
        emphasis: {
          focus: "adjacency",
        },
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        lineStyle: {
          curveness: 0.5,
        },
      },
    ],
  });

  return chart;
}

function renderTreemap(dataset, container) {
  const chart = createChartInstance(container);

  function mapNode(node) {
    const color = resolveColor(node.color ?? "accentPrimary");
    const children = Array.isArray(node.children) ? node.children.map(mapNode) : null;
    const value =
      node.value ?? children?.reduce((sum, child) => sum + (child.value ?? 0), 0) ?? 0;
    return {
      name: node.name,
      value,
      itemStyle: {
        color,
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(16),
        shadowColor: withGlowColor(node.color ?? color, 0.35),
      },
      ...(children ? { children } : {}),
    };
  }

  const data = (dataset.tree ?? []).map(mapNode);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ data }) =>
        data ? `${data.name}<br/>Value: ${data.value ?? 0}` : dataset.label,
    },
    series: [
      {
        type: "treemap",
        data,
        leafDepth: 2,
        roam: false,
        breadcrumb: {
          show: false,
        },
        label: {
          show: true,
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        levels: [
          {
            itemStyle: {
              borderColor: colorWithAlpha("accentPrimary", 0.18),
              borderWidth: withOutlineWidth(2),
              gapWidth: 4,
            },
          },
          {
            itemStyle: {
              borderColor: colorWithAlpha("accentPrimary", 0.1),
              borderWidth: withOutlineWidth(1),
              gapWidth: 2,
            },
          },
        ],
      },
    ],
  });

  return chart;
}

function renderFunnel(dataset, container) {
  const chart = createChartInstance(container);

  const data = (dataset.steps ?? []).map((step) => ({
    name: step.name,
    value: step.value,
    itemStyle: {
      color: resolveColor(step.color ?? "accentPrimary"),
      borderColor: chartOutlineColor,
      borderWidth: withOutlineWidth(1),
      shadowBlur: withGlowBlur(20),
      shadowColor: withGlowColor(step.color ?? "accentPrimary", 0.45),
    },
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ name, value }) => `${name}<br/>Value: ${value}`,
    },
    series: [
      {
        name: dataset.label,
        type: "funnel",
        left: "12%",
        right: "12%",
        top: "10%",
        bottom: "10%",
        width: "76%",
        sort: "descending",
        gap: 4,
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        data,
      },
    ],
  });

  return chart;
}

function renderStat(dataset, article) {
  const valueElement = article.querySelector(".stat-value");
  const metaElement = article.querySelector(".stat-meta");

  valueElement.textContent = `${dataset.value}${dataset.unit ?? ""}`;
  valueElement.setAttribute("data-label", dataset.label);

  const delta = dataset.delta ?? 0;
  const deltaPrefix = delta > 0 ? "+" : "";
  const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";

  metaElement.innerHTML = `
    <span>${dataset.label}</span>
    <span class="stat-delta ${deltaClass}">
      ${deltaPrefix}${delta}${dataset.unit ?? ""}
      <small>${dataset.deltaLabel ?? "change"}</small>
    </span>
  `;

  metaElement.querySelector(".stat-delta").style.color =
    delta >= 0 ? resolveColor("accentQuinary") : resolveColor("accentSenary");
}

function renderBarGauge(dataset, container) {
  const chart = createChartInstance(container);

  const total = dataset.sections.reduce((sum, section) => sum + section.value, 0) || 1;
  const sections = dataset.sections.map((section) => ({
    ...section,
    ratio: section.value / total,
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "6%",
      top: "22%",
      bottom: "28%",
      containLabel: true,
    },
    legend: {
      data: sections.map((section) => section.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      bottom: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const section = sections.find((entry) => entry.name === params.seriesName);
        if (!section) {
          return dataset.label;
        }

        const percent = Math.round(section.ratio * 100);
        const rawValue = section.value <= 1 ? `${Math.round(section.value * 100)}%` : section.value;
        return `${section.name}<br/>Share: ${percent}%<br/>Value: ${rawValue}`;
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 1,
      boundaryGap: [0, 0],
      axisLabel: {
        formatter: (value) => `${Math.round(value * 100)}%`,
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "category",
      data: [dataset.label],
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "rgba(226, 232, 240, 0.78)",
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 600,
      },
    },
    series: [
      {
        name: "Background",
        type: "bar",
        data: [1],
        barWidth: 26,
        itemStyle: {
          color: "rgba(15, 23, 42, 0.65)",
          borderRadius: 999,
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        silent: true,
        z: 1,
      },
      ...sections.map((section) => ({
        name: section.name,
        type: "bar",
        stack: "allocation",
        barWidth: 18,
        data: [section.ratio],
        itemStyle: {
          color: resolveColor(section.color),
          borderRadius: [999, 999, 999, 999],
          shadowBlur: withGlowBlur(25),
          shadowColor: withGlowColor(section.color, 0.4),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        emphasis: {
          focus: "series",
        },
        label: {
          show: true,
          position: "inside",
          formatter: () => `${Math.round(section.ratio * 100)}%`,
          color: "rgba(15, 23, 42, 0.92)",
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 12,
        },
        z: 3,
      })),
    ],
  });

  return chart;
}

export const componentRenderers = {
  timeSeries: renderTimeSeries,
  stateTimeline: renderStateTimeline,
  statusHistory: renderStatusHistory,
  barChart: renderBarChart,
  histogram: renderHistogram,
  heatmap: renderHeatmap,
  pieChart: renderPieChart,
  candlestick: renderCandlestick,
  gauge: renderGauge,
  trend: renderTrend,
  xyScatter: renderXYScatter,
  stackedArea: renderStackedArea,
  dualAxis: renderDualAxis,
  radar: renderRadar,
  boxplot: renderBoxplot,
  sankey: renderSankey,
  treemap: renderTreemap,
  funnel: renderFunnel,
  stat: renderStat,
  barGauge: renderBarGauge,
};
