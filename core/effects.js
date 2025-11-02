/*
 * Gravibe Effects Management
 * Glow, outline, and visual effect utilities
 */

import { effectDefaults, DEFAULT_BACKGROUND_EFFECT, BACKGROUND_EFFECTS } from "./config.js";
import { colorWithAlpha } from "./palette.js";

export const effectsState = { ...effectDefaults };

export const rendererState = { mode: "svg" };

export const backgroundState = {
    effect: normalizeBackgroundEffect(
        document.querySelector(".chart-shell")?.dataset.backgroundEffect ||
        document.body?.dataset.backgroundEffect ||
        DEFAULT_BACKGROUND_EFFECT
    ),
};

function normalizeBackgroundEffect(effect) {
    return BACKGROUND_EFFECTS.includes(effect) ? effect : DEFAULT_BACKGROUND_EFFECT;
}

// This will be set by setup/components.js to avoid circular dependency
let rerenderCallback = null;

export function setRerenderCallback(callback) {
    rerenderCallback = callback;
}

function clamp(value, min, max) {
    if (typeof min === "number") {
        value = Math.max(min, value);
    }
    if (typeof max === "number") {
        value = Math.min(max, value);
    }
    return value;
}

// Keep the CSS custom properties in sync so purely visual halos stay configurable too.
export function applyEffectCssVariables() {
    const root = document.documentElement;
    root.style.setProperty("--chart-glow-scale", effectsState.glowIntensity.toFixed(2));
    root.style.setProperty("--chart-glow-opacity", effectsState.glowOpacity.toFixed(2));
    root.style.setProperty("--chart-outline-scale", effectsState.outlineScale.toFixed(2));
    root.style.setProperty("--chart-halo-blur", `${effectsState.haloBlur}px`);
    root.style.setProperty("--chart-halo-opacity", effectsState.haloOpacity.toFixed(2));
}

export function withGlowBlur(base) {
    if (!Number.isFinite(base)) {
        return 0;
    }
    const scaled = base * effectsState.glowIntensity;
    return scaled <= 0 ? 0 : scaled;
}

export function withGlowColor(colorRef, baseAlpha = 0.45) {
    const alpha = clamp(baseAlpha * effectsState.glowOpacity, 0, 1);
    return colorWithAlpha(colorRef, alpha);
}

export function withOutlineWidth(base) {
    if (!Number.isFinite(base)) {
        return base;
    }
    const scaled = base * effectsState.outlineScale;
    return scaled < 0 ? 0 : scaled;
}

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
    if (rerenderCallback) {
        rerenderCallback();
    }
}

export function registerEffectControls() {
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

export function registerRendererControl() {
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
        if (rerenderCallback) {
            rerenderCallback();
        }
    });
}

export function applyBackgroundEffect(effect) {
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

export function registerBackgroundControl() {
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

