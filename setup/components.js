/*
 * Gravibe Components Management
 * Component registry, setup, and initialization
 */

console.log("[components.js] Module loaded");

import { colorPalettes } from "../core/config.js";
import { paletteState, applyPalette } from "../core/palette.js";
import { setRerenderCallback as setPaletteRerender } from "../core/palette.js";
import { setRerenderCallback as setEffectsRerender } from "../core/effects.js";
import { registerEffectControls, registerRendererControl, registerBackgroundControl } from "../core/effects.js";
import { neonDatasets } from "../charts/datasets.js";
import { componentRenderers } from "../charts/charts.js";
import { initDatasetSelector } from "../charts/datasets.js";
import { notifyLiveDatasetListeners, subscribeToLiveDataset } from "../core/utils.js";
import { initLogConsole, appendLogsFromSpans } from "../ui/logs.js";
import { initTraceViewer } from "../ui/trace.js";
import { sampleTraceSpans } from "../ui/sampleData.js";

// We keep a registry of renderer callbacks so palette swaps can re-render everything in place.
export const componentRegistry = new Set();

export function rerenderAllComponents() {
    console.log("[rerenderAllComponents] Called, components in registry:", componentRegistry.size);
    // Use double requestAnimationFrame to ensure CSS variables are fully applied
    // First RAF: browser processes style changes
    requestAnimationFrame(() => {
        // Second RAF: ensures all style updates are fully computed
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
                        console.log(`[rerenderAllComponents] Component ${componentIndex}: calling as function`);
                        component();
                    } else if (component && typeof component.update === "function") {
                        // New style: call update() method
                        console.log(`[rerenderAllComponents] Component ${componentIndex}: calling update() method`);
                        component.update();
                    } else if (component && typeof component.render === "function") {
                        // Fallback: call render() if update() is not available
                        console.log(`[rerenderAllComponents] Component ${componentIndex}: calling render() method`);
                        component.render();
                    } else {
                        console.warn(`[rerenderAllComponents] Component ${componentIndex}: unknown type`, typeof component, component);
                    }
                } catch (error) {
                    console.error(`[rerenderAllComponents] Component ${componentIndex}: Failed to update`, error);
                }
            });
        });
    });
}

// Set up callbacks to avoid circular dependencies
setPaletteRerender(rerenderAllComponents);
setEffectsRerender(rerenderAllComponents);

export function setupComponent(article) {
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
        datasetSelect.value = (defaultDatasetIndex ?? 0).toString();
    }

    runRender();

    componentRegistry.add(runRender);
}

export async function initGravibe() {
    const defaultPalette =
        colorPalettes.find((palette) => palette.id === paletteState.activeId) ?? colorPalettes[0];

    if (defaultPalette) {
        applyPalette(defaultPalette);
    }

    registerEffectControls();
    registerRendererControl();
    registerBackgroundControl();

    const paletteSelect = document.querySelector("#palette-select");
    if (paletteSelect) {
        paletteSelect.innerHTML = "";
        colorPalettes.forEach((palette) => {
            const option = document.createElement("option");
            option.value = palette.id;
            option.textContent = palette.label;
            paletteSelect.append(option);
        });

        if (paletteState.activeId) {
            paletteSelect.value = paletteState.activeId;
        }

        paletteSelect.addEventListener("change", (event) => {
            const selected = colorPalettes.find((palette) => palette.id === event.target.value);
            if (selected) {
                applyPalette(selected);
            }
        });
    }

    const components = document.querySelectorAll(".component-card");
    components.forEach((component) => setupComponent(component));

    const logConsoleHost = document.querySelector('[data-component="logConsole"]');
    const traceHost = document.querySelector('[data-component="traceViewer"]');
    
    // Always ensure logs are generated from spans first, before initializing either component
    const allLogRows = await appendLogsFromSpans(sampleTraceSpans);
    
    // Ensure sampleLogRows module is loaded in trace.js before initializing trace viewer
    if (traceHost) {
        const { ensureSampleLogRowsLoaded } = await import("../ui/trace.js");
        await ensureSampleLogRowsLoaded();
    }
    
    if (logConsoleHost) {
        const rerenderLogConsole = initLogConsole(logConsoleHost, allLogRows);
        componentRegistry.add(rerenderLogConsole);
    }

    if (traceHost) {
        const rerenderTrace = initTraceViewer(traceHost, sampleTraceSpans);
        console.log("[initGravibe] Trace viewer initialized, component:", rerenderTrace);
        console.log("[initGravibe] Component has update method:", typeof rerenderTrace?.update === "function");
        componentRegistry.add(rerenderTrace);
    }
}

