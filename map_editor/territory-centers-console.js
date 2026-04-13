/*
Browser-console helper for exporting territory centers used by scripts/territory_centers.js.

Usage (DevTools console):
1) Open either:
   - Game page with a loaded match/map (preferred), or
   - map_editor page with map + preview labels rendered.
2) Paste this file content into the console.
3) It will print and copy a block like:
   let hawaii = {
       "cs": [y, x],
       ...
   };

Why this matches in-game behavior:
- Game mode: targets rendered troop markers by id: #t_origin_<code>.
- Fallback mode: uses runtime label flow:
  label top = region.top + 35 + offsetY
  label left = region.left + 25 + offsetX
- Map editor mode: targets rendered preview labels:
  #previewLabelsLayer .territorylabel[data-territory-id] .t_troops
  and maps them back to territory code via [data-editor-id][data-code].

Output format is [y, x], matching server usage in scripts/game.js.
*/
(function exportTerritoryCentersIife() {
    const SCRIPT_VERSION = "2026-04-12.legacy-anchor-v2";
    const DEFAULT_DECIMALS = 3;
    const DEFAULT_COORDINATE_MODE = "legacyLabelAnchor";
    const LEGACY_ANCHOR_X = 25;
    const LEGACY_ANCHOR_Y = 35;

    function toNumber(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function round(value, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    function normalizeCode(rawCode) {
        return String(rawCode || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");
    }

    function normalizeMapName(rawName) {
        const cleaned = String(rawName || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");
        return cleaned || "mapname";
    }

    function normalizeDisplayText(raw) {
        return String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function resolveRuntimeMapKey() {
        const displayName = String(window.mapname || "").trim();
        const mapNameTable =
            window.mapnames && typeof window.mapnames === "object"
                ? window.mapnames
                : null;

        if (mapNameTable && displayName) {
            const wanted = normalizeDisplayText(displayName);
            for (const key of Object.keys(mapNameTable)) {
                const mappedDisplay = normalizeDisplayText(mapNameTable[key]);
                if (mappedDisplay && mappedDisplay === wanted) {
                    return normalizeMapName(key);
                }
            }
        }

        return normalizeMapName(displayName);
    }

    function parseScaleFromTransform(transformValue) {
        const transform = String(transformValue || "").trim();
        if (!transform || transform === "none") {
            return 1;
        }

        const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/i);
        if (matrixMatch) {
            const parts = matrixMatch[1].split(",").map((part) => Number(part.trim()));
            if (parts.length >= 4 && parts.every((part) => Number.isFinite(part))) {
                const a = parts[0];
                const b = parts[1];
                const c = parts[2];
                const d = parts[3];
                const scaleX = Math.sqrt((a * a) + (b * b));
                const scaleY = Math.sqrt((c * c) + (d * d));
                if (Number.isFinite(scaleX) && Number.isFinite(scaleY) && scaleX > 0 && scaleY > 0) {
                    return (scaleX + scaleY) / 2;
                }
            }
        }

        const scaleMatch = transform.match(/scale\(([^)]+)\)/i);
        if (scaleMatch) {
            const scaleParts = scaleMatch[1].split(",").map((part) => Number(part.trim()));
            if (scaleParts.length >= 1 && Number.isFinite(scaleParts[0]) && scaleParts[0] > 0) {
                return scaleParts[0];
            }
        }

        return 1;
    }

    function getRelativeRect(element, container, zoom) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return {
            left: (elementRect.left / zoom) - (containerRect.left / zoom),
            top: (elementRect.top / zoom) - (containerRect.top / zoom),
            width: elementRect.width / zoom,
            height: elementRect.height / zoom,
        };
    }

    function getCenterFromRect(rect) {
        return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2),
        };
    }

    function buildObjectLiteral(mapName, centers, decimals) {
        const keys = Object.keys(centers).sort();
        const lines = ["let " + mapName + " = {"];

        for (let i = 0; i < keys.length; i++) {
            const code = keys[i];
            const value = centers[code];
            const y = round(value[0], decimals);
            const x = round(value[1], decimals);
            const suffix = i < (keys.length - 1) ? "," : "";
            lines.push("    \"" + code + "\": [" + y + ", " + x + "]" + suffix);
        }

        lines.push("};");
        return lines.join("\n");
    }

    function readCoordAdjustLookup() {
        const lookup = {};
        const source = (typeof window.coordadjusts === "object" && window.coordadjusts) ? window.coordadjusts : null;
        if (!source) {
            return lookup;
        }

        for (const key of Object.keys(source)) {
            lookup[String(key).toUpperCase()] = source[key];
        }
        return lookup;
    }

    function extractFromGameRuntime(coordinateMode) {
        const mapSvgBox = document.getElementById("mapsvgbox");
        if (!mapSvgBox) {
            return null;
        }

        const regions = Array.from(document.querySelectorAll(".map-region[data-code]"));
        if (!regions.length) {
            return null;
        }

        const zoomFromGlobal = (typeof window.currentMapZoom === "number" && window.currentMapZoom > 0)
            ? window.currentMapZoom
            : null;
        const mapContainer = document.getElementById("mapcontainer");
        const zoomFromTransform = parseScaleFromTransform(mapContainer ? getComputedStyle(mapContainer).transform : "");
        const zoom = zoomFromGlobal || zoomFromTransform || 1;

        const coordAdjustLookup = readCoordAdjustLookup();
        const centers = {};
        const missingTroopMarkers = [];

        for (const region of regions) {
            const rawCode = String(region.getAttribute("data-code") || "").trim();
            const code = normalizeCode(rawCode);
            if (!code) {
                continue;
            }

            const regionRect = getRelativeRect(region, mapSvgBox, zoom);
            const offsets = coordAdjustLookup[rawCode.toUpperCase()] || [0, 0];
            const offsetX = toNumber(offsets[0], 0);
            const offsetY = toNumber(offsets[1], 0);

            // Legacy territory_centers.js convention (matches existing datasets):
            // x = regionLeft + 25 + offsetX
            // y = regionTop + 35 + offsetY
            const legacyX = regionRect.left + LEGACY_ANCHOR_X + offsetX;
            const legacyY = regionRect.top + LEGACY_ANCHOR_Y + offsetY;

            if (coordinateMode === "legacyLabelAnchor") {
                centers[code] = [legacyY, legacyX];
                continue;
            }

            const troopId = "t_origin_" + code;
            const troopMarker = document.getElementById(troopId);

            if (troopMarker) {
                const troopRect = getRelativeRect(troopMarker, mapSvgBox, zoom);
                const troopCenter = getCenterFromRect(troopRect);
                centers[code] = [troopCenter.y, troopCenter.x];
                continue;
            }

            // Fallback when marker is not mounted yet.
            centers[code] = [legacyY, legacyX];
            missingTroopMarkers.push(code);
        }

        const sampledSelector = coordinateMode === "legacyLabelAnchor"
            ? ".map-region[data-code] + coordadjust + runtime anchor (+25, +35)"
            : "#t_origin_<code>";
        const sampledDescription = coordinateMode === "legacyLabelAnchor"
            ? "Legacy label anchor coordinates used by territory_centers.js"
            : "Rendered troop marker center in live game runtime";

        return {
            mode: "game",
            centers,
            regionCount: regions.length,
            missingTroopMarkers,
            zoom,
            coordinateMode,
            suggestedMapName: resolveRuntimeMapKey(),
            sampledSelector,
            sampledDescription,
        };
    }

    function extractFromMapEditorPreview(coordinateMode) {
        const labelsLayer = document.getElementById("previewLabelsLayer");
        const svgRoot = document.querySelector("#previewSvgMount > svg");
        if (!labelsLayer || !svgRoot) {
            return null;
        }

        const labels = Array.from(labelsLayer.querySelectorAll(".territorylabel[data-territory-id]"));
        if (!labels.length) {
            return null;
        }

        const panZoomLayer = document.getElementById("previewPanZoomLayer");
        const zoom = parseScaleFromTransform(panZoomLayer ? getComputedStyle(panZoomLayer).transform : "") || 1;

        const territoriesById = new Map();
        const territoryElements = Array.from(document.querySelectorAll("[data-editor-id][data-code]"));
        for (const territoryEl of territoryElements) {
            const editorId = String(territoryEl.getAttribute("data-editor-id") || "").trim();
            if (!editorId) {
                continue;
            }
            territoriesById.set(editorId, territoryEl);
        }

        const centers = {};
        const missingTroopMarkers = [];

        for (const label of labels) {
            const territoryId = String(label.getAttribute("data-territory-id") || "").trim();
            if (!territoryId) {
                continue;
            }

            const territoryEl = territoriesById.get(territoryId);
            if (!territoryEl) {
                continue;
            }

            const code = normalizeCode(territoryEl.getAttribute("data-code"));
            if (!code) {
                continue;
            }

            if (coordinateMode === "legacyLabelAnchor") {
                const labelRect = getRelativeRect(label, svgRoot, zoom);
                centers[code] = [labelRect.top, labelRect.left];
                continue;
            }

            const troopMarker = label.querySelector(".t_troops");
            if (!troopMarker) {
                missingTroopMarkers.push(code);
                continue;
            }

            const troopRect = getRelativeRect(troopMarker, svgRoot, zoom);
            const troopCenter = getCenterFromRect(troopRect);
            centers[code] = [troopCenter.y, troopCenter.x];
        }

        const folderNameInput = document.getElementById("folderNameInput");
        const mapName = folderNameInput ? folderNameInput.value : "";

        const sampledSelector = coordinateMode === "legacyLabelAnchor"
            ? "#previewLabelsLayer .territorylabel[data-territory-id]"
            : "#previewLabelsLayer .territorylabel[data-territory-id] .t_troops";
        const sampledDescription = coordinateMode === "legacyLabelAnchor"
            ? "Preview label top-left (editor approximation of legacy label anchor)"
            : "Preview troop marker center in map editor";

        return {
            mode: "map_editor",
            centers,
            labelCount: labels.length,
            missingTroopMarkers,
            zoom,
            coordinateMode,
            suggestedMapName: normalizeMapName(mapName),
            sampledSelector,
            sampledDescription,
        };
    }

    function tryDevToolsCopy(text) {
        if (typeof copy !== "function") {
            return false;
        }

        try {
            copy(text);
            return true;
        } catch (err) {
            console.warn("[territory-centers] DevTools copy() failed:", err);
            return false;
        }
    }

    function showManualCopyPrompt(text, message) {
        try {
            const existing = document.getElementById("__emblitz-centers-copybox");
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }

            const wrap = document.createElement("div");
            wrap.id = "__emblitz-centers-copybox";
            wrap.style.position = "fixed";
            wrap.style.zIndex = "2147483647";
            wrap.style.right = "12px";
            wrap.style.bottom = "12px";
            wrap.style.width = "min(680px, calc(100vw - 24px))";
            wrap.style.maxHeight = "min(60vh, 420px)";
            wrap.style.background = "#151515";
            wrap.style.border = "1px solid #4a4a4a";
            wrap.style.borderRadius = "10px";
            wrap.style.padding = "10px";
            wrap.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.45)";
            wrap.style.color = "#f2f2f2";
            wrap.style.fontFamily = "Consolas, Menlo, monospace";

            const title = document.createElement("div");
            title.textContent = message || "Clipboard blocked. Click Copy, or press Ctrl+C, then close.";
            title.style.fontSize = "12px";
            title.style.marginBottom = "8px";

            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.readOnly = true;
            textArea.style.width = "100%";
            textArea.style.height = "280px";
            textArea.style.resize = "vertical";
            textArea.style.border = "1px solid #666";
            textArea.style.borderRadius = "8px";
            textArea.style.padding = "8px";
            textArea.style.background = "#0f0f0f";
            textArea.style.color = "#f2f2f2";
            textArea.style.fontFamily = "Consolas, Menlo, monospace";
            textArea.style.fontSize = "12px";

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "8px";
            actions.style.justifyContent = "flex-end";
            actions.style.marginTop = "8px";

            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.textContent = "Copy";
            copyButton.style.cursor = "pointer";
            copyButton.style.border = "1px solid #5f86ff";
            copyButton.style.borderRadius = "7px";
            copyButton.style.padding = "6px 10px";
            copyButton.style.background = "#2c5be8";
            copyButton.style.color = "#ffffff";
            copyButton.addEventListener("click", async () => {
                let copied = false;

                if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    try {
                        await navigator.clipboard.writeText(text);
                        copied = true;
                    } catch (err) {
                        console.warn("[territory-centers] Copy button Clipboard API failed:", err);
                    }
                }

                if (!copied) {
                    textArea.focus();
                    textArea.select();
                    textArea.setSelectionRange(0, textArea.value.length);
                    try {
                        copied = document.execCommand("copy");
                    } catch (err) {
                        console.warn("[territory-centers] execCommand copy failed:", err);
                    }
                }

                if (copied) {
                    title.textContent = "Copied to clipboard. Close when done.";
                    console.log("[territory-centers] Copied JS block from manual copy box.");
                } else {
                    title.textContent = "Copy failed. Press Ctrl+C with text selected, then close.";
                    console.warn("[territory-centers] Copy button could not access clipboard; use Ctrl+C manually.");
                }
            });

            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.textContent = "Close";
            closeButton.style.cursor = "pointer";
            closeButton.style.border = "1px solid #7a7a7a";
            closeButton.style.borderRadius = "7px";
            closeButton.style.padding = "6px 10px";
            closeButton.style.background = "#232323";
            closeButton.style.color = "#f2f2f2";
            closeButton.addEventListener("click", () => {
                if (wrap.parentNode) {
                    wrap.parentNode.removeChild(wrap);
                }
            });

            actions.appendChild(copyButton);
            actions.appendChild(closeButton);
            wrap.appendChild(title);
            wrap.appendChild(textArea);
            wrap.appendChild(actions);
            document.body.appendChild(wrap);

            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, textArea.value.length);

            return true;
        } catch (err) {
            console.warn("[territory-centers] Manual copy prompt failed:", err);
            return false;
        }
    }

    function copyLiteralWithFallbacks(text) {
        const canUseClipboardApi =
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function";

        if (canUseClipboardApi) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    console.log("[territory-centers] Copied JS block to clipboard (Clipboard API).");
                })
                .catch((err) => {
                    console.warn("[territory-centers] Clipboard API copy failed:", err);
                    if (tryDevToolsCopy(text)) {
                        console.log("[territory-centers] Attempted DevTools copy().");
                    }

                    if (showManualCopyPrompt(text, "Clipboard blocked. Click Copy, or press Ctrl+C, then close.")) {
                        console.log("[territory-centers] Opened manual copy box for guaranteed copy path.");
                        return;
                    }

                    console.log("[territory-centers] Manual fallback: run copy(window.__emblitzTerritoryCenters.literal) in DevTools.");
                });
            return;
        }

        if (tryDevToolsCopy(text)) {
            console.log("[territory-centers] Attempted DevTools copy().");
        }

        if (showManualCopyPrompt(text, "Click Copy, or press Ctrl+C, then close.")) {
            console.log("[territory-centers] Opened manual copy box for guaranteed copy path.");
            return;
        }

        console.log("[territory-centers] Manual fallback: run copy(window.__emblitzTerritoryCenters.literal) in DevTools.");
    }

    function exportCenters(options) {
        const opts = options || {};
        const decimals = Number.isInteger(opts.decimals) ? opts.decimals : DEFAULT_DECIMALS;
        const copy = (opts.copyToClipboard !== false);
        const requireGameContext = (opts.requireGameContext === true);
        const coordinateMode = opts.coordinateMode === "troopMarkerCenter"
            ? "troopMarkerCenter"
            : DEFAULT_COORDINATE_MODE;

        const gameResult = extractFromGameRuntime(coordinateMode);
        const editorResult = extractFromMapEditorPreview(coordinateMode);

        if (requireGameContext && !gameResult) {
            console.error("[territory-centers] Game context required, but live game elements were not found.");
            console.error("[territory-centers] Open an active game map so #t_origin_<code> elements exist.");
            return null;
        }

        const result = gameResult || editorResult;
        if (!result) {
            console.error("Could not detect a supported map context.");
            console.error("Open either a live game map (with .map-region) or map_editor with preview labels.");
            return null;
        }

        const mapName = normalizeMapName(opts.mapName || result.suggestedMapName || "mapname");
        const literal = buildObjectLiteral(mapName, result.centers, decimals);
        const keys = Object.keys(result.centers).sort();

        console.log("[territory-centers] mode:", result.mode);
        console.log("[territory-centers] script version:", SCRIPT_VERSION);
        console.log("[territory-centers] coordinate mode:", coordinateMode);
        if (coordinateMode === "legacyLabelAnchor") {
            console.log("[territory-centers] legacy anchor constants:", {
                x: LEGACY_ANCHOR_X,
                y: LEGACY_ANCHOR_Y,
            });
        }
        console.log("[territory-centers] entries:", keys.length);
        console.log("[territory-centers] sampled selector:", result.sampledSelector || "(unknown)");
        if (result.sampledDescription) {
            console.log("[territory-centers] sampled element:", result.sampledDescription);
        }
        if (result.mode === "game" && coordinateMode === "legacyLabelAnchor") {
            console.log("[territory-centers] Using legacy label-anchor coordinates to match territory_centers.js conventions.");
        }
        if (result.mode === "game" && coordinateMode === "troopMarkerCenter") {
            console.warn("[territory-centers] troopMarkerCenter mode can be globally shifted from legacy territory_centers.js values.");
            console.warn("[territory-centers] Use { coordinateMode: \"legacyLabelAnchor\" } to match existing datasets.");
        }
        if (result.mode === "map_editor") {
            console.warn("[territory-centers] You are exporting from map_editor preview mode.");
            console.warn("[territory-centers] Preview coordinates can be globally shifted from live game runtime.");
            console.warn("[territory-centers] For canonical runtime centers, run from an active game and set { requireGameContext: true }.");
        }
        if (result.missingTroopMarkers && result.missingTroopMarkers.length) {
            console.warn(
                "[territory-centers] missing troop markers for",
                result.missingTroopMarkers.length,
                "territories (used fallback or skipped):",
                result.missingTroopMarkers.join(", "),
            );
        }

        console.log("\n" + literal + "\n");

        if (copy) {
            copyLiteralWithFallbacks(literal);
        }

        const payload = {
            ...result,
            mapName,
            literal,
            codes: keys,
        };

        window.__emblitzTerritoryCenters = payload;
        return payload;
    }

    // Expose for reruns with options, then run once immediately.
    window.exportEmblitzTerritoryCenters = exportCenters;
    return exportCenters();
})();
