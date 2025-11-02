/*
 * Gravibe Utilities
 * Helper functions for data manipulation and live dataset management
 */

import { LIVE_DEFAULT_INTERVAL } from "./config.js";

export function clamp(value, min, max) {
    if (typeof min === "number") {
        value = Math.max(min, value);
    }
    if (typeof max === "number") {
        value = Math.min(max, value);
    }
    return value;
}

export function jitterValue(value, variance, min, max) {
    const delta = (Math.random() * variance * 2) - variance;
    return clamp(value + delta, min, max);
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

export function weightedRandomPick(items) {
    const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
    const target = Math.random() * total;
    let cumulative = 0;
    for (const item of items) {
        cumulative += item.weight ?? 1;
        if (target <= cumulative) return item.value;
    }
    return items[items.length - 1]?.value;
}

export function startLiveUpdater(callback, interval = LIVE_DEFAULT_INTERVAL) {
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

export function notifyLiveDatasetListeners(dataset) {
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

export function subscribeToLiveDataset(dataset, listener) {
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

