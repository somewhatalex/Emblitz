"use strict";

const SVG_CANDIDATE_SELECTOR = "path,polygon,rect,circle,ellipse,line,polyline";
const SVG_NS = "http://www.w3.org/2000/svg";
const PREVIEW_DRAG_THRESHOLD_PX = 4;
const PREVIEW_PAN_SPEED_DIVISOR = 1.3;
const PREVIEW_ZOOM_MIN = 0.5;
const PREVIEW_ZOOM_MAX = 1.7;
const PREVIEW_ZOOM_DELTA_MAX = 0.3;
const MIN_VIEWBOX_SIZE = 1;
const TERRITORY_COLOR_DATA = {
    default: { normal: "#ffe2bf", darken: "#ffc580" },
    red: { normal: "#de4343", darken: "#de2323" },
    orange: { normal: "#e38d24", darken: "#bf6b04" },
    yellow: { normal: "#dec433", darken: "#c2a710" },
    green: { normal: "#41b037", darken: "#0e9602" },
    blue: { normal: "#4367ab", darken: "#073ea6" },
    purple: { normal: "#b240b8", darken: "#83008a" },
};

const state = {
    loadedFileName: "",
    svgRoot: null,
    selectedElementId: null,
    hoveredElementId: null,
    candidates: new Map(),
    territories: new Map(),
    edges: new Set(),
    generated: null,
    preview: {
        zoom: 1,
        translateX: 0,
        translateY: 0,
        dragging: false,
        dragPointerId: null,
        pointerDownCandidateId: null,
        dragStartX: 0,
        dragStartY: 0,
        lastPointerX: 0,
        lastPointerY: 0,
        didDrag: false,
        suppressClick: false,
        showMoveGraph: false,
        showViewBoxOverlay: false,
        showCameraBoundsOverlay: false,
    },
    viewBoxDrag: {
        active: false,
        pointerId: null,
        captureElement: null,
        mode: null,
        changed: false,
        startClientX: 0,
        startClientY: 0,
        startCenterX: 0,
        startCenterY: 0,
        startWidth: 0,
        startHeight: 0,
        referenceWidth: 0,
        referenceHeight: 0,
    },
    cameraBoundsDrag: {
        active: false,
        pointerId: null,
        captureElement: null,
        mode: null,
        changed: false,
        startClientX: 0,
        startClientY: 0,
        startCenterX: 0,
        startCenterY: 0,
        startWidth: 0,
        startHeight: 0,
        referenceWidth: 0,
        referenceHeight: 0,
        viewBoxMinX: 0,
        viewBoxMinY: 0,
        viewBoxWidth: 0,
        viewBoxHeight: 0,
    },
};

const refs = {
    xmlFileInput: document.getElementById("xmlFileInput"),
    loadedFileName: document.getElementById("loadedFileName"),
    candidateCount: document.getElementById("candidateCount"),
    territoryCount: document.getElementById("territoryCount"),
    moveCount: document.getElementById("moveCount"),

    importJsonInput: document.getElementById("importJsonInput"),
    importStatus: document.getElementById("importStatus"),
    applyImportBtn: document.getElementById("applyImportBtn"),
    clearImportBtn: document.getElementById("clearImportBtn"),

    folderNameInput: document.getElementById("folderNameInput"),
    mapDisplayNameInput: document.getElementById("mapDisplayNameInput"),
    boundsXMax: document.getElementById("boundsXMax"),
    boundsXMin: document.getElementById("boundsXMin"),
    boundsYMax: document.getElementById("boundsYMax"),
    boundsYMin: document.getElementById("boundsYMin"),
    viewBoxCenterXInput: document.getElementById("viewBoxCenterXInput"),
    viewBoxCenterYInput: document.getElementById("viewBoxCenterYInput"),
    viewBoxWidthInput: document.getElementById("viewBoxWidthInput"),
    viewBoxHeightInput: document.getElementById("viewBoxHeightInput"),
    applyViewBoxBtn: document.getElementById("applyViewBoxBtn"),
    syncViewBoxBtn: document.getElementById("syncViewBoxBtn"),
    toggleViewBoxOverlayBtn: document.getElementById("toggleViewBoxOverlayBtn"),
    toggleCameraBoundsOverlayBtn: document.getElementById("toggleCameraBoundsOverlayBtn"),
    guessBoundsBtn: document.getElementById("guessBoundsBtn"),
    fitViewBoxBtn: document.getElementById("fitViewBoxBtn"),
    autoCenterOffsetsBtn: document.getElementById("autoCenterOffsetsBtn"),

    selectedInfo: document.getElementById("selectedInfo"),
    selectedCodeInput: document.getElementById("selectedCodeInput"),
    selectedNameInput: document.getElementById("selectedNameInput"),
    selectedOffsetXInput: document.getElementById("selectedOffsetXInput"),
    selectedOffsetYInput: document.getElementById("selectedOffsetYInput"),
    markTerritoryBtn: document.getElementById("markTerritoryBtn"),
    unmarkTerritoryBtn: document.getElementById("unmarkTerritoryBtn"),
    applySelectedBtn: document.getElementById("applySelectedBtn"),

    moveASelect: document.getElementById("moveASelect"),
    moveBSelect: document.getElementById("moveBSelect"),
    addMoveBtn: document.getElementById("addMoveBtn"),
    removeMoveBtn: document.getElementById("removeMoveBtn"),
    autolinkThresholdInput: document.getElementById("autolinkThresholdInput"),
    autoDetectMovesBtn: document.getElementById("autoDetectMovesBtn"),
    edgeList: document.getElementById("edgeList"),

    svgPreview: document.getElementById("svgPreview"),
    previewPanZoomLayer: document.getElementById("previewPanZoomLayer"),
    previewSvgMount: document.getElementById("previewSvgMount"),
    previewMovesSvg: document.getElementById("previewMovesSvg"),
    previewLabelsLayer: document.getElementById("previewLabelsLayer"),
    viewBoxOverlay: document.getElementById("viewBoxOverlay"),
    viewBoxFrame: document.getElementById("viewBoxFrame"),
    cameraBoundsOverlay: document.getElementById("cameraBoundsOverlay"),
    cameraBoundsFrame: document.getElementById("cameraBoundsFrame"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    toggleMovesGraphBtn: document.getElementById("toggleMovesGraphBtn"),
    territoryEditorMenu: document.getElementById("territoryEditorMenu"),
    territoryMenuTitle: document.getElementById("territoryMenuTitle"),
    closeTerritoryMenuBtn: document.getElementById("closeTerritoryMenuBtn"),
    territoryMenuCodeInput: document.getElementById("territoryMenuCodeInput"),
    territoryMenuNameInput: document.getElementById("territoryMenuNameInput"),
    territoryMenuOffsetXInput: document.getElementById("territoryMenuOffsetXInput"),
    territoryMenuOffsetYInput: document.getElementById("territoryMenuOffsetYInput"),
    territoryMenuSaveBtn: document.getElementById("territoryMenuSaveBtn"),
    territoryMenuUnmarkBtn: document.getElementById("territoryMenuUnmarkBtn"),
    territoryMenuMovesList: document.getElementById("territoryMenuMovesList"),
    territoryTableBody: document.getElementById("territoryTableBody"),

    validationStatus: document.getElementById("validationStatus"),
    generatePreviewBtn: document.getElementById("generatePreviewBtn"),
    downloadFilesBtn: document.getElementById("downloadFilesBtn"),
    downloadZipBtn: document.getElementById("downloadZipBtn"),

    mapdictOutput: document.getElementById("mapdictOutput"),
    coordadjustOutput: document.getElementById("coordadjustOutput"),
    movesOutput: document.getElementById("movesOutput"),
    metadataOutput: document.getElementById("metadataOutput"),
    maptxtOutput: document.getElementById("maptxtOutput"),
};

wireEvents();

function wireEvents() {
    refs.xmlFileInput.addEventListener("change", onFileUpload);

    refs.importJsonInput.addEventListener("change", updateImportStatusText);
    refs.applyImportBtn.addEventListener("click", applyImportedMapData);
    refs.clearImportBtn.addEventListener("click", clearImportSelection);

    refs.applyViewBoxBtn.addEventListener("click", applyViewBoxCenterAndSize);
    refs.syncViewBoxBtn.addEventListener("click", syncViewBoxInputsFromRoot);
    refs.toggleViewBoxOverlayBtn.addEventListener("click", toggleViewBoxOverlayVisibility);
    refs.toggleCameraBoundsOverlayBtn.addEventListener("click", toggleCameraBoundsOverlayVisibility);
    refs.guessBoundsBtn.addEventListener("click", applyBoundsGuess);
    refs.fitViewBoxBtn.addEventListener("click", fitViewBoxToTerritories);
    refs.autoCenterOffsetsBtn.addEventListener("click", autoCenterTerritoryOffsets);

    const boundsInputs = [refs.boundsXMax, refs.boundsXMin, refs.boundsYMax, refs.boundsYMin];
    for (const input of boundsInputs) {
        if (input) {
            input.addEventListener("input", onBoundsInputChanged);
        }
    }

    refs.markTerritoryBtn.addEventListener("click", markSelectedAsTerritory);
    refs.unmarkTerritoryBtn.addEventListener("click", unmarkSelectedTerritory);
    refs.applySelectedBtn.addEventListener("click", applySelectedFieldUpdates);

    refs.addMoveBtn.addEventListener("click", addMoveFromSelectors);
    refs.removeMoveBtn.addEventListener("click", removeMoveFromSelectors);
    refs.autoDetectMovesBtn.addEventListener("click", autoDetectMoves);

    refs.generatePreviewBtn.addEventListener("click", generateOutputFiles);
    refs.downloadFilesBtn.addEventListener("click", downloadIndividualFiles);
    refs.downloadZipBtn.addEventListener("click", downloadZip);

    refs.resetViewBtn.addEventListener("click", resetPreviewView);
    refs.toggleMovesGraphBtn.addEventListener("click", toggleMovesGraphVisibility);

    if (refs.closeTerritoryMenuBtn) {
        refs.closeTerritoryMenuBtn.addEventListener("click", hideTerritoryEditorMenu);
    }
    if (refs.territoryMenuSaveBtn) {
        refs.territoryMenuSaveBtn.addEventListener("click", applyTerritoryMenuUpdates);
    }
    if (refs.territoryMenuUnmarkBtn) {
        refs.territoryMenuUnmarkBtn.addEventListener("click", unmarkSelectedTerritoryFromMenu);
    }
    if (refs.territoryMenuCodeInput) {
        refs.territoryMenuCodeInput.addEventListener("input", () => {
            refs.territoryMenuCodeInput.value = normalizeTwoLetterCode(refs.territoryMenuCodeInput.value);
        });
    }
    if (refs.territoryEditorMenu) {
        refs.territoryEditorMenu.addEventListener("pointerdown", (event) => event.stopPropagation());
        refs.territoryEditorMenu.addEventListener("wheel", (event) => event.stopPropagation());
    }
    if (refs.viewBoxOverlay) {
        refs.viewBoxOverlay.addEventListener("pointerdown", onViewBoxOverlayPointerDown);
    }
    if (refs.cameraBoundsOverlay) {
        refs.cameraBoundsOverlay.addEventListener("pointerdown", onCameraBoundsOverlayPointerDown);
    }

    window.addEventListener("pointermove", onViewBoxOverlayPointerMove);
    window.addEventListener("pointerup", onViewBoxOverlayPointerUp);
    window.addEventListener("pointercancel", onViewBoxOverlayPointerUp);
    window.addEventListener("pointermove", onCameraBoundsOverlayPointerMove);
    window.addEventListener("pointerup", onCameraBoundsOverlayPointerUp);
    window.addEventListener("pointercancel", onCameraBoundsOverlayPointerUp);

    setupPreviewPanZoom();
    updateMoveGraphToggleUi();
    updateViewBoxOverlayToggleUi();
    updateCameraBoundsOverlayToggleUi();
    window.addEventListener("resize", onWindowResize);
}

function setupPreviewPanZoom() {
    if (!refs.svgPreview) {
        return;
    }

    refs.svgPreview.addEventListener("wheel", onPreviewWheel, { passive: false });
    refs.svgPreview.addEventListener("pointerdown", onPreviewPointerDown);
    refs.svgPreview.addEventListener("pointermove", onPreviewPointerMove);
    refs.svgPreview.addEventListener("pointerup", onPreviewPointerUp);
    refs.svgPreview.addEventListener("pointercancel", onPreviewPointerUp);
}

function onWindowResize() {
    applyPreviewTransformWithClamp();
    renderPreviewOverlays();
    positionTerritoryEditorMenu();
}

function applyPreviewTransformWithClamp() {
    applyPreviewTransform();
    clampPreviewTranslation();
    applyPreviewTransform();
}

function toggleMovesGraphVisibility() {
    state.preview.showMoveGraph = !state.preview.showMoveGraph;
    updateMoveGraphToggleUi();
    renderPreviewMovesGraph();
}

function updateMoveGraphToggleUi() {
    if (!refs.toggleMovesGraphBtn) {
        return;
    }

    refs.toggleMovesGraphBtn.textContent = state.preview.showMoveGraph ? "Hide Moves Graph" : "Show Moves Graph";
    refs.toggleMovesGraphBtn.setAttribute("aria-pressed", state.preview.showMoveGraph ? "true" : "false");
}

function toggleViewBoxOverlayVisibility() {
    state.preview.showViewBoxOverlay = !state.preview.showViewBoxOverlay;
    updateViewBoxOverlayToggleUi();
    renderViewBoxOverlay();
}

function toggleCameraBoundsOverlayVisibility() {
    state.preview.showCameraBoundsOverlay = !state.preview.showCameraBoundsOverlay;
    updateCameraBoundsOverlayToggleUi();
    renderCameraBoundsOverlay();
}

function updateViewBoxOverlayToggleUi() {
    if (!refs.toggleViewBoxOverlayBtn) {
        return;
    }

    const isVisible = !!state.preview.showViewBoxOverlay;
    refs.toggleViewBoxOverlayBtn.textContent = isVisible ? "Hide ViewBox Outline" : "Show ViewBox Outline";
    refs.toggleViewBoxOverlayBtn.setAttribute("aria-pressed", isVisible ? "true" : "false");
}

function updateCameraBoundsOverlayToggleUi() {
    if (!refs.toggleCameraBoundsOverlayBtn) {
        return;
    }

    const isVisible = !!state.preview.showCameraBoundsOverlay;
    refs.toggleCameraBoundsOverlayBtn.textContent = isVisible ? "Hide Camera Bounds" : "Show Camera Bounds";
    refs.toggleCameraBoundsOverlayBtn.setAttribute("aria-pressed", isVisible ? "true" : "false");
}

function onBoundsInputChanged() {
    applyPreviewTransformWithClamp();
    renderCameraBoundsOverlay();
}

function onPreviewWheel(event) {
    if (!state.svgRoot) {
        return;
    }

    event.preventDefault();

    let zoomDelta = event.deltaY / -500;
    if (zoomDelta > PREVIEW_ZOOM_DELTA_MAX) {
        zoomDelta = PREVIEW_ZOOM_DELTA_MAX;
    } else if (zoomDelta < -PREVIEW_ZOOM_DELTA_MAX) {
        zoomDelta = -PREVIEW_ZOOM_DELTA_MAX;
    }

    const nextZoom = clampNumber(state.preview.zoom + zoomDelta, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_MAX);
    if (nextZoom === state.preview.zoom) {
        return;
    }

    state.preview.zoom = nextZoom;
    applyPreviewTransformWithClamp();
}

function onPreviewPointerDown(event) {
    if (!state.svgRoot) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    state.preview.dragging = true;
    state.preview.dragPointerId = event.pointerId;
    state.preview.pointerDownCandidateId = findCandidateIdAtPoint(event.clientX, event.clientY);
    state.preview.dragStartX = event.clientX;
    state.preview.dragStartY = event.clientY;
    state.preview.lastPointerX = event.clientX;
    state.preview.lastPointerY = event.clientY;
    state.preview.didDrag = false;

    if (refs.svgPreview.setPointerCapture) {
        refs.svgPreview.setPointerCapture(event.pointerId);
    }
    refs.svgPreview.classList.add("is-panning");
}

function onPreviewPointerMove(event) {
    if (!state.preview.dragging || event.pointerId !== state.preview.dragPointerId) {
        return;
    }

    const pointerDeltaX = event.clientX - state.preview.lastPointerX;
    const pointerDeltaY = event.clientY - state.preview.lastPointerY;

    if (!state.preview.didDrag) {
        const totalDeltaX = event.clientX - state.preview.dragStartX;
        const totalDeltaY = event.clientY - state.preview.dragStartY;
        const movement = Math.hypot(totalDeltaX, totalDeltaY);
        if (movement >= PREVIEW_DRAG_THRESHOLD_PX) {
            state.preview.didDrag = true;
        } else {
            state.preview.lastPointerX = event.clientX;
            state.preview.lastPointerY = event.clientY;
            return;
        }
    }

    state.preview.lastPointerX = event.clientX;
    state.preview.lastPointerY = event.clientY;

    const zoomLevel = Number.isFinite(state.preview.zoom) && state.preview.zoom > 0 ? state.preview.zoom : 1;
    const deltaX = pointerDeltaX / PREVIEW_PAN_SPEED_DIVISOR;
    const deltaY = pointerDeltaY / PREVIEW_PAN_SPEED_DIVISOR;

    // Match runtime panning: translation units are in map space and scaled by zoom.
    state.preview.translateX += deltaX / zoomLevel;
    state.preview.translateY += deltaY / zoomLevel;

    applyPreviewTransformWithClamp();

    if (state.preview.didDrag) {
        event.preventDefault();
    }
}

function onPreviewPointerUp(event) {
    if (event.pointerId !== state.preview.dragPointerId) {
        return;
    }

    const didDrag = state.preview.didDrag;
    const pointerDownCandidateId = state.preview.pointerDownCandidateId;

    if (refs.svgPreview.releasePointerCapture) {
        try {
            refs.svgPreview.releasePointerCapture(event.pointerId);
        } catch (error) {
            // Ignore release errors when pointer capture has already ended.
        }
    }

    state.preview.dragging = false;
    state.preview.dragPointerId = null;
    state.preview.pointerDownCandidateId = null;
    state.preview.suppressClick = didDrag;
    state.preview.didDrag = false;
    refs.svgPreview.classList.remove("is-panning");

    // Resolve selection from pointer-up so minor pointer jitter does not break click selection.
    if (!didDrag) {
        if (pointerDownCandidateId && state.candidates.has(pointerDownCandidateId)) {
            selectElement(pointerDownCandidateId);
        } else {
            selectCandidateAtPoint(event.clientX, event.clientY);
        }
    }
}

function onViewBoxOverlayPointerDown(event) {
    if (!state.svgRoot || !refs.viewBoxFrame) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    const handle = event.target.closest("[data-viewbox-handle]");
    if (!handle) {
        return;
    }

    const mode = String(handle.getAttribute("data-viewbox-handle") || "").toLowerCase();
    beginViewBoxOverlayDrag(event, mode || "move");
}

function onCameraBoundsOverlayPointerDown(event) {
    if (!state.svgRoot || !refs.cameraBoundsFrame) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    const handle = event.target.closest("[data-camera-bounds-handle]");
    if (!handle) {
        return;
    }

    const mode = String(handle.getAttribute("data-camera-bounds-handle") || "").toLowerCase();
    beginCameraBoundsOverlayDrag(event, mode || "move");
}

function beginViewBoxOverlayDrag(event, mode) {
    const centerX = Number(refs.viewBoxCenterXInput.value);
    const centerY = Number(refs.viewBoxCenterYInput.value);
    const width = Number(refs.viewBoxWidthInput.value);
    const height = Number(refs.viewBoxHeightInput.value);
    const reference = getViewBoxOverlayReference();

    if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(width) || !Number.isFinite(height)) {
        setValidationStatus("Read current viewBox before dragging the overlay.", true);
        return;
    }
    if (!Number.isFinite(reference?.width) || !Number.isFinite(reference?.height) || reference.width <= 0 || reference.height <= 0) {
        setValidationStatus("Could not start viewBox drag; reference bounds are unavailable.", true);
        return;
    }

    state.viewBoxDrag.active = true;
    state.viewBoxDrag.pointerId = event.pointerId;
    state.viewBoxDrag.mode = mode;
    state.viewBoxDrag.changed = false;
    state.viewBoxDrag.startClientX = event.clientX;
    state.viewBoxDrag.startClientY = event.clientY;
    state.viewBoxDrag.startCenterX = centerX;
    state.viewBoxDrag.startCenterY = centerY;
    state.viewBoxDrag.startWidth = width;
    state.viewBoxDrag.startHeight = height;
    state.viewBoxDrag.referenceWidth = reference.width;
    state.viewBoxDrag.referenceHeight = reference.height;

    const captureElement = event.target && event.target.setPointerCapture ? event.target : refs.viewBoxFrame;
    state.viewBoxDrag.captureElement = captureElement || null;

    if (captureElement && captureElement.setPointerCapture) {
        try {
            captureElement.setPointerCapture(event.pointerId);
        } catch (error) {
            // Ignore pointer capture errors; drag still works with window listeners.
        }
    }

    if (refs.viewBoxOverlay) {
        refs.viewBoxOverlay.classList.remove("is-hidden");
        refs.viewBoxOverlay.classList.add("is-dragging");
    }
    refs.viewBoxFrame.classList.toggle("is-moving", mode === "move");

    event.preventDefault();
    event.stopPropagation();
}

function beginCameraBoundsOverlayDrag(event, mode) {
    const viewBoxRect = getCurrentViewBoxRect();
    const cameraRect = getCameraBoundsRect(viewBoxRect);
    const reference = getViewBoxOverlayReference(viewBoxRect);

    if (!viewBoxRect || !cameraRect) {
        setValidationStatus("Set a valid viewBox and camera bounds before dragging camera bounds.", true);
        return;
    }
    if (!Number.isFinite(reference?.width) || !Number.isFinite(reference?.height) || reference.width <= 0 || reference.height <= 0) {
        setValidationStatus("Could not start camera bounds drag; reference bounds are unavailable.", true);
        return;
    }

    const startWidth = cameraRect.maxX - cameraRect.minX;
    const startHeight = cameraRect.maxY - cameraRect.minY;
    const startCenterX = cameraRect.minX + (startWidth / 2);
    const startCenterY = cameraRect.minY + (startHeight / 2);

    state.cameraBoundsDrag.active = true;
    state.cameraBoundsDrag.pointerId = event.pointerId;
    state.cameraBoundsDrag.mode = mode;
    state.cameraBoundsDrag.changed = false;
    state.cameraBoundsDrag.startClientX = event.clientX;
    state.cameraBoundsDrag.startClientY = event.clientY;
    state.cameraBoundsDrag.startCenterX = startCenterX;
    state.cameraBoundsDrag.startCenterY = startCenterY;
    state.cameraBoundsDrag.startWidth = startWidth;
    state.cameraBoundsDrag.startHeight = startHeight;
    state.cameraBoundsDrag.referenceWidth = reference.width;
    state.cameraBoundsDrag.referenceHeight = reference.height;
    state.cameraBoundsDrag.viewBoxMinX = viewBoxRect.minX;
    state.cameraBoundsDrag.viewBoxMinY = viewBoxRect.minY;
    state.cameraBoundsDrag.viewBoxWidth = viewBoxRect.width;
    state.cameraBoundsDrag.viewBoxHeight = viewBoxRect.height;

    const captureElement = event.target && event.target.setPointerCapture ? event.target : refs.cameraBoundsFrame;
    state.cameraBoundsDrag.captureElement = captureElement || null;

    if (captureElement && captureElement.setPointerCapture) {
        try {
            captureElement.setPointerCapture(event.pointerId);
        } catch (error) {
            // Ignore pointer capture errors; drag still works with window listeners.
        }
    }

    if (refs.cameraBoundsOverlay) {
        refs.cameraBoundsOverlay.classList.remove("is-hidden");
        refs.cameraBoundsOverlay.classList.add("is-dragging");
    }
    refs.cameraBoundsFrame.classList.toggle("is-moving", mode === "move");

    event.preventDefault();
    event.stopPropagation();
}

function onViewBoxOverlayPointerMove(event) {
    if (!state.viewBoxDrag.active || event.pointerId !== state.viewBoxDrag.pointerId || !refs.svgPreview) {
        return;
    }

    const previewRect = refs.svgPreview.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
        return;
    }

    const zoomLevel = Number.isFinite(state.preview.zoom) && state.preview.zoom > 0 ? state.preview.zoom : 1;
    const scaleX = state.viewBoxDrag.referenceWidth / (previewRect.width * zoomLevel);
    const scaleY = state.viewBoxDrag.referenceHeight / (previewRect.height * zoomLevel);
    const deltaX = (event.clientX - state.viewBoxDrag.startClientX) * scaleX;
    const deltaY = (event.clientY - state.viewBoxDrag.startClientY) * scaleY;

    const nextBox = computeDraggedViewBox(state.viewBoxDrag, deltaX, deltaY);
    if (!nextBox) {
        return;
    }

    refs.viewBoxCenterXInput.value = formatNumberForInput(nextBox.centerX);
    refs.viewBoxCenterYInput.value = formatNumberForInput(nextBox.centerY);
    refs.viewBoxWidthInput.value = formatNumberForInput(nextBox.width);
    refs.viewBoxHeightInput.value = formatNumberForInput(nextBox.height);

    applyViewBoxCenterAndSize({ silentStatus: true });
    state.viewBoxDrag.changed = true;

    event.preventDefault();
    event.stopPropagation();
}

function onCameraBoundsOverlayPointerMove(event) {
    if (!state.cameraBoundsDrag.active || event.pointerId !== state.cameraBoundsDrag.pointerId || !refs.svgPreview) {
        return;
    }

    const previewRect = refs.svgPreview.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
        return;
    }

    const zoomLevel = Number.isFinite(state.preview.zoom) && state.preview.zoom > 0 ? state.preview.zoom : 1;
    const scaleX = state.cameraBoundsDrag.referenceWidth / (previewRect.width * zoomLevel);
    const scaleY = state.cameraBoundsDrag.referenceHeight / (previewRect.height * zoomLevel);
    const deltaX = (event.clientX - state.cameraBoundsDrag.startClientX) * scaleX;
    const deltaY = (event.clientY - state.cameraBoundsDrag.startClientY) * scaleY;

    const nextBox = computeDraggedViewBox(state.cameraBoundsDrag, deltaX, deltaY);
    if (!nextBox) {
        return;
    }

    const nextRect = {
        minX: nextBox.centerX - (nextBox.width / 2),
        maxX: nextBox.centerX + (nextBox.width / 2),
        minY: nextBox.centerY - (nextBox.height / 2),
        maxY: nextBox.centerY + (nextBox.height / 2),
    };

    applyCameraBoundsRectToInputs(nextRect, {
        minX: state.cameraBoundsDrag.viewBoxMinX,
        minY: state.cameraBoundsDrag.viewBoxMinY,
        width: state.cameraBoundsDrag.viewBoxWidth,
        height: state.cameraBoundsDrag.viewBoxHeight,
    });

    applyPreviewTransformWithClamp();
    renderCameraBoundsOverlay();
    state.cameraBoundsDrag.changed = true;

    event.preventDefault();
    event.stopPropagation();
}

function onViewBoxOverlayPointerUp(event) {
    if (!state.viewBoxDrag.active || event.pointerId !== state.viewBoxDrag.pointerId) {
        return;
    }

    const captureElement = state.viewBoxDrag.captureElement;
    if (captureElement && captureElement.releasePointerCapture) {
        try {
            captureElement.releasePointerCapture(event.pointerId);
        } catch (error) {
            // Ignore release errors when pointer capture has already ended.
        }
    }

    const changed = state.viewBoxDrag.changed;

    state.viewBoxDrag.active = false;
    state.viewBoxDrag.pointerId = null;
    state.viewBoxDrag.captureElement = null;
    state.viewBoxDrag.mode = null;
    state.viewBoxDrag.changed = false;

    if (refs.viewBoxOverlay) {
        refs.viewBoxOverlay.classList.remove("is-dragging");
    }
    if (refs.viewBoxFrame) {
        refs.viewBoxFrame.classList.remove("is-moving");
    }

    if (changed) {
        setValidationStatus("Applied viewBox center/size from drag handles.", false);
    }
}

function onCameraBoundsOverlayPointerUp(event) {
    if (!state.cameraBoundsDrag.active || event.pointerId !== state.cameraBoundsDrag.pointerId) {
        return;
    }

    const captureElement = state.cameraBoundsDrag.captureElement;
    if (captureElement && captureElement.releasePointerCapture) {
        try {
            captureElement.releasePointerCapture(event.pointerId);
        } catch (error) {
            // Ignore release errors when pointer capture has already ended.
        }
    }

    const changed = state.cameraBoundsDrag.changed;

    state.cameraBoundsDrag.active = false;
    state.cameraBoundsDrag.pointerId = null;
    state.cameraBoundsDrag.captureElement = null;
    state.cameraBoundsDrag.mode = null;
    state.cameraBoundsDrag.changed = false;
    state.cameraBoundsDrag.viewBoxMinX = 0;
    state.cameraBoundsDrag.viewBoxMinY = 0;
    state.cameraBoundsDrag.viewBoxWidth = 0;
    state.cameraBoundsDrag.viewBoxHeight = 0;

    if (refs.cameraBoundsOverlay) {
        refs.cameraBoundsOverlay.classList.remove("is-dragging");
    }
    if (refs.cameraBoundsFrame) {
        refs.cameraBoundsFrame.classList.remove("is-moving");
    }

    if (changed) {
        setValidationStatus("Applied camera bounds from drag handles.", false);
    }
}

function computeDraggedViewBox(dragState, deltaX, deltaY) {
    if (!dragState) {
        return null;
    }

    let minX = dragState.startCenterX - (dragState.startWidth / 2);
    let maxX = dragState.startCenterX + (dragState.startWidth / 2);
    let minY = dragState.startCenterY - (dragState.startHeight / 2);
    let maxY = dragState.startCenterY + (dragState.startHeight / 2);

    if (dragState.mode === "move") {
        minX += deltaX;
        maxX += deltaX;
        minY += deltaY;
        maxY += deltaY;
    } else {
        const hasNorth = dragState.mode === "n" || dragState.mode === "ne" || dragState.mode === "nw";
        const hasSouth = dragState.mode === "s" || dragState.mode === "se" || dragState.mode === "sw";
        const hasWest = dragState.mode === "w" || dragState.mode === "nw" || dragState.mode === "sw";
        const hasEast = dragState.mode === "e" || dragState.mode === "ne" || dragState.mode === "se";

        if (hasEast) {
            maxX += deltaX;
        }
        if (hasWest) {
            minX += deltaX;
        }
        if (hasSouth) {
            maxY += deltaY;
        }
        if (hasNorth) {
            minY += deltaY;
        }

        if ((maxX - minX) < MIN_VIEWBOX_SIZE) {
            if (hasWest && !hasEast) {
                minX = maxX - MIN_VIEWBOX_SIZE;
            } else {
                maxX = minX + MIN_VIEWBOX_SIZE;
            }
        }
        if ((maxY - minY) < MIN_VIEWBOX_SIZE) {
            if (hasNorth && !hasSouth) {
                minY = maxY - MIN_VIEWBOX_SIZE;
            } else {
                maxY = minY + MIN_VIEWBOX_SIZE;
            }
        }
    }

    const width = Math.max(MIN_VIEWBOX_SIZE, maxX - minX);
    const height = Math.max(MIN_VIEWBOX_SIZE, maxY - minY);
    const centerX = minX + (width / 2);
    const centerY = minY + (height / 2);

    return {
        centerX,
        centerY,
        width,
        height,
    };
}

function resetPreviewView() {
    state.preview.zoom = 1;
    state.preview.translateX = 0;
    state.preview.translateY = 0;
    state.preview.dragging = false;
    state.preview.dragPointerId = null;
    state.preview.pointerDownCandidateId = null;
    state.preview.dragStartX = 0;
    state.preview.dragStartY = 0;
    state.preview.didDrag = false;
    state.preview.suppressClick = false;
    applyPreviewTransformWithClamp();
}

function clampPreviewTranslation() {
    const panBounds = getPreviewPanBounds();
    if (!panBounds) {
        return;
    }

    state.preview.translateX = clampNumber(state.preview.translateX, panBounds.minX, panBounds.maxX);
    state.preview.translateY = clampNumber(state.preview.translateY, panBounds.minY, panBounds.maxY);
}

function applyPreviewTransform() {
    if (!refs.previewPanZoomLayer) {
        return;
    }

    const transformValue =
        "scale(" + state.preview.zoom + ") translate(" + state.preview.translateX + "px, " + state.preview.translateY + "px)";

    refs.previewPanZoomLayer.style.transform = transformValue;

    // Keep bounds/viewBox editor overlays in the same transformed space as the map preview.
    if (refs.viewBoxOverlay) {
        refs.viewBoxOverlay.style.transform = transformValue;
    }
    if (refs.cameraBoundsOverlay) {
        refs.cameraBoundsOverlay.style.transform = transformValue;
    }

    positionTerritoryEditorMenu();
}

function getPreviewPanBounds() {
    const xMax = Number(refs.boundsXMax.value);
    const xMin = Number(refs.boundsXMin.value);
    const yMax = Number(refs.boundsYMax.value);
    const yMin = Number(refs.boundsYMin.value);

    if (!Number.isFinite(xMax) || !Number.isFinite(xMin) || !Number.isFinite(yMax) || !Number.isFinite(yMin)) {
        return null;
    }

    return {
        minX: Math.min(xMin, xMax),
        maxX: Math.max(xMin, xMax),
        minY: Math.min(yMin, yMax),
        maxY: Math.max(yMin, yMax),
    };
}

function updateImportStatusText() {
    const files = Array.from(refs.importJsonInput.files || []);
    if (!files.length) {
        refs.importStatus.textContent = "No import files selected.";
        return;
    }

    const names = files.map((f) => f.name).join(", ");
    refs.importStatus.textContent = "Selected: " + names;
}

function clearImportSelection() {
    refs.importJsonInput.value = "";
    refs.importStatus.textContent = "No import files selected.";
}

async function applyImportedMapData() {
    const files = Array.from(refs.importJsonInput.files || []);
    if (!files.length) {
        setValidationStatus("Choose one or more mapdata JSON files to import.", true);
        return;
    }

    const parsed = {
        mapdict: null,
        coordadjust: null,
        moves: null,
        metadata: null,
    };

    const parseErrors = [];

    for (const file of files) {
        const category = classifyImportFile(file.name);
        if (!category) {
            continue;
        }

        let text;
        try {
            text = await file.text();
        } catch (error) {
            parseErrors.push("Failed to read " + file.name + ".");
            continue;
        }

        try {
            parsed[category] = JSON.parse(text);
        } catch (error) {
            parseErrors.push("Invalid JSON in " + file.name + ".");
        }
    }

    if (parseErrors.length) {
        setValidationStatus(parseErrors.join(" | "), true);
        return;
    }

    const hasCore = !!(parsed.mapdict || parsed.coordadjust || parsed.moves);
    if (hasCore && !state.svgRoot) {
        setValidationStatus("Load an SVG first before importing mapdict/coordadjust/moves.", true);
        return;
    }

    const importSummary = applyParsedMapData(parsed);
    const loadedTypes = importSummary.loadedTypes;
    let statusMessage = "Imported " + loadedTypes.join(", ") + ".";
    if (!loadedTypes.length) {
        statusMessage = "No recognized mapdata JSON files were selected.";
    }
    if (importSummary.matchedTerritoryCount > 0) {
        statusMessage += " Matched territories: " + importSummary.matchedTerritoryCount + ".";
    }
    if (importSummary.missingCodes.length) {
        statusMessage += " Missing code(s) in SVG: " + importSummary.missingCodes.join(", ") + ".";
    }

    setValidationStatus(statusMessage, false);
    refs.importStatus.textContent = statusMessage;
}

function applyParsedMapData(parsed) {
    const matchedTerritoryIds = new Set();
    const missingCodes = new Set();

    if (parsed.mapdict && typeof parsed.mapdict === "object" && !Array.isArray(parsed.mapdict)) {
        for (const [rawCode, rawName] of Object.entries(parsed.mapdict)) {
            const code = normalizeCode(rawCode);
            if (!code) {
                continue;
            }
            const territoryId = ensureTerritoryForCode(code);
            if (!territoryId) {
                missingCodes.add(code);
                continue;
            }
            const t = state.territories.get(territoryId);
            t.code = code;
            t.name = String(rawName || code).trim() || code;
            writeTerritoryToElement(territoryId);
            matchedTerritoryIds.add(territoryId);
        }
    }

    if (parsed.coordadjust && typeof parsed.coordadjust === "object" && !Array.isArray(parsed.coordadjust)) {
        for (const [rawCode, rawOffsets] of Object.entries(parsed.coordadjust)) {
            const code = normalizeCode(rawCode);
            if (!code) {
                continue;
            }
            const territoryId = ensureTerritoryForCode(code);
            if (!territoryId) {
                missingCodes.add(code);
                continue;
            }

            const t = state.territories.get(territoryId);
            if (Array.isArray(rawOffsets) && rawOffsets.length >= 2) {
                t.offsetX = parseNumber(rawOffsets[0], 0);
                t.offsetY = parseNumber(rawOffsets[1], 0);
            }
            writeTerritoryToElement(territoryId);
            matchedTerritoryIds.add(territoryId);
        }
    }

    if (Array.isArray(parsed.moves)) {
        state.edges.clear();
        for (const move of parsed.moves) {
            if (typeof move !== "string") {
                continue;
            }

            const parts = move.trim().split(/\s+/);
            if (parts.length < 2) {
                continue;
            }

            const codeA = normalizeCode(parts[0]);
            const codeB = normalizeCode(parts[1]);
            if (!codeA || !codeB || codeA === codeB) {
                continue;
            }

            const idA = ensureTerritoryForCode(codeA);
            const idB = ensureTerritoryForCode(codeB);
            if (!idA || !idB) {
                if (!idA) {
                    missingCodes.add(codeA);
                }
                if (!idB) {
                    missingCodes.add(codeB);
                }
                continue;
            }

            state.edges.add(edgeKey(idA, idB));
        }
    }

    if (parsed.metadata && typeof parsed.metadata === "object" && !Array.isArray(parsed.metadata)) {
        if (typeof parsed.metadata.name === "string" && parsed.metadata.name.trim()) {
            refs.mapDisplayNameInput.value = parsed.metadata.name.trim();
        }
        if (Array.isArray(parsed.metadata.boundsX) && parsed.metadata.boundsX.length >= 2) {
            refs.boundsXMax.value = String(parseNumber(parsed.metadata.boundsX[0], refs.boundsXMax.value));
            refs.boundsXMin.value = String(parseNumber(parsed.metadata.boundsX[1], refs.boundsXMin.value));
        }
        if (Array.isArray(parsed.metadata.boundsY) && parsed.metadata.boundsY.length >= 2) {
            refs.boundsYMax.value = String(parseNumber(parsed.metadata.boundsY[0], refs.boundsYMax.value));
            refs.boundsYMin.value = String(parseNumber(parsed.metadata.boundsY[1], refs.boundsYMin.value));
        }
    }

    state.generated = null;
    refreshAllUi();

    return {
        loadedTypes: ["mapdict", "coordadjust", "moves", "metadata"].filter((key) => parsed[key] !== null),
        matchedTerritoryCount: matchedTerritoryIds.size,
        missingCodes: Array.from(missingCodes).sort(),
    };
}

function classifyImportFile(fileName) {
    const lower = String(fileName || "").toLowerCase().trim();
    if (lower.endsWith("mapdict.json")) {
        return "mapdict";
    }
    if (lower.endsWith("coordadjust.json")) {
        return "coordadjust";
    }
    if (lower.endsWith("moves.json")) {
        return "moves";
    }
    if (lower.endsWith("metadata.json")) {
        return "metadata";
    }
    return null;
}

async function tryAutoImportSiblingMapData(fileName) {
    const summary = {
        mapKey: null,
        loadedTypes: [],
        matchedTerritoryCount: 0,
        missingCodes: [],
        failedFiles: [],
    };

    if (!state.svgRoot) {
        return summary;
    }

    const mapKey = inferMapFolderKey(fileName);
    if (!mapKey) {
        return summary;
    }

    summary.mapKey = mapKey;

    const parsed = {
        mapdict: null,
        coordadjust: null,
        moves: null,
        metadata: null,
    };

    const fileCategories = ["mapdict", "coordadjust", "moves", "metadata"];
    let foundAny = false;

    for (const category of fileCategories) {
        const relativePath = "../mapdata/" + mapKey + "/" + category + ".json";

        let response = null;
        try {
            response = await fetch(relativePath, { cache: "no-store" });
        } catch (error) {
            continue;
        }

        if (!response || !response.ok) {
            continue;
        }

        foundAny = true;

        try {
            const text = await response.text();
            parsed[category] = JSON.parse(text);
        } catch (error) {
            summary.failedFiles.push(category + ".json");
        }
    }

    if (!foundAny) {
        return summary;
    }

    const applied = applyParsedMapData(parsed);
    summary.loadedTypes = applied.loadedTypes;
    summary.matchedTerritoryCount = applied.matchedTerritoryCount;
    summary.missingCodes = applied.missingCodes;

    return summary;
}

function inferMapFolderKey(fileName) {
    const value = String(fileName || "").trim();
    if (!value) {
        return "";
    }

    const withoutExt = value.replace(/\.[^/.]+$/, "");
    return sanitizeFolderName(withoutExt);
}

function ensureTerritoryForCode(code) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
        return null;
    }

    const existingByCode = findTerritoryIdByCode(normalizedCode);
    if (existingByCode) {
        return existingByCode;
    }

    const candidateId = findCandidateIdByPreCode(normalizedCode);
    if (!candidateId) {
        return null;
    }

    if (!state.territories.has(candidateId)) {
        state.territories.set(candidateId, {
            elementId: candidateId,
            code: normalizedCode,
            name: normalizedCode,
            offsetX: 0,
            offsetY: 0,
        });
    }

    const t = state.territories.get(candidateId);
    t.code = normalizedCode;

    const candidate = state.candidates.get(candidateId);
    if (candidate) {
        candidate.preCode = normalizedCode;
    }

    writeTerritoryToElement(candidateId);

    return candidateId;
}

function findTerritoryIdByCode(code) {
    const normalizedCode = normalizeCode(code);
    for (const [elementId, t] of state.territories.entries()) {
        if (normalizeCode(t.code) === normalizedCode) {
            return elementId;
        }
    }
    return null;
}

function findCandidateIdByPreCode(code) {
    const normalizedCode = normalizeCode(code);
    for (const [elementId, c] of state.candidates.entries()) {
        if (normalizeCode(c.preCode) === normalizedCode) {
            return elementId;
        }
        const runtimeCode = normalizeCode(c.element.getAttribute("data-code") || "");
        if (runtimeCode === normalizedCode) {
            return elementId;
        }
    }
    return null;
}

async function onFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const text = await file.text();
    await loadSvgText(text, file.name);
}

async function loadSvgText(text, fileName) {
    const parser = new DOMParser();
    let rawRoot = null;
    let usedFallbackParser = false;

    const strictDoc = parser.parseFromString(text, "image/svg+xml");
    const parserError = strictDoc.querySelector("parsererror");
    const strictRoot = strictDoc.documentElement;
    const strictRootIsSvg = !!strictRoot && strictRoot.tagName.toLowerCase() === "svg";
    const strictHasSvgNamespace = strictRoot && strictRoot.namespaceURI === "http://www.w3.org/2000/svg";
    if (!parserError && strictRootIsSvg && strictHasSvgNamespace) {
        rawRoot = strictRoot;
    }

    // Some internal map files are not strict XML (duplicate attrs, malformed style attrs, etc.).
    // This fallback keeps the editor compatible with existing repository map text files.
    if (!rawRoot) {
        const tolerantDoc = parser.parseFromString(text, "text/html");
        rawRoot = tolerantDoc.querySelector("svg");
        usedFallbackParser = !!rawRoot;
    }

    if (!rawRoot) {
        setValidationStatus("Uploaded file does not contain an SVG root element.", true);
        return;
    }

    const importedRoot = document.importNode(rawRoot, true);
    importedRoot.setAttribute("id", "mapsvgbox");

    resetEditorState();
    state.loadedFileName = fileName;
    state.svgRoot = importedRoot;

    refs.loadedFileName.textContent = "Loaded: " + fileName;
    if (refs.previewSvgMount) {
        refs.previewSvgMount.replaceChildren(importedRoot);
    } else {
        refs.svgPreview.replaceChildren(importedRoot);
    }
    resetPreviewView();

    const initSummary = initializeCandidates(importedRoot);
    bindSvgSelection(importedRoot);
    syncViewBoxInputsFromRoot();
    applyBoundsGuess();

    refreshAllUi();
    const statusFragments = [];
    if (usedFallbackParser) {
        statusFragments.push("Map loaded with tolerant parser (non-strict XML detected).");
    } else {
        statusFragments.push("Map loaded.");
    }
    if (initSummary.inferredCount > 0) {
        statusFragments.push("Inferred " + initSummary.inferredCount + " additional territories from unstyled region shapes.");
    } else if (initSummary.preMarkedCount > 0) {
        statusFragments.push("Detected " + initSummary.preMarkedCount + " pre-tagged territories.");
    } else {
        statusFragments.push("Select shapes and mark territories.");
    }
    setValidationStatus(statusFragments.join(" "), false);

    const autoImportSummary = await tryAutoImportSiblingMapData(fileName);
    if (autoImportSummary.loadedTypes.length) {
        let autoStatus =
            "Auto-imported " +
            autoImportSummary.loadedTypes.join(", ") +
            " from mapdata/" +
            autoImportSummary.mapKey +
            "/.";

        if (autoImportSummary.matchedTerritoryCount > 0) {
            autoStatus += " Matched territories: " + autoImportSummary.matchedTerritoryCount + ".";
        }
        if (autoImportSummary.missingCodes.length) {
            autoStatus += " Missing code(s) in SVG: " + autoImportSummary.missingCodes.join(", ") + ".";
        }
        if (autoImportSummary.failedFiles.length) {
            autoStatus += " Failed to parse: " + autoImportSummary.failedFiles.join(", ") + ".";
        }

        setValidationStatus(autoStatus, false);
        refs.importStatus.textContent = autoStatus;
    }
}

function resetEditorState() {
    state.svgRoot = null;
    state.selectedElementId = null;
    state.hoveredElementId = null;
    state.candidates.clear();
    state.territories.clear();
    state.edges.clear();
    state.generated = null;

    if (refs.previewSvgMount) {
        refs.previewSvgMount.innerHTML = "";
    }
    if (refs.previewMovesSvg) {
        refs.previewMovesSvg.innerHTML = "";
    }
    if (refs.previewLabelsLayer) {
        refs.previewLabelsLayer.innerHTML = "";
    }
    if (!refs.previewSvgMount && refs.previewPanZoomLayer) {
        refs.previewPanZoomLayer.innerHTML = "";
    } else if (!refs.previewSvgMount) {
        refs.svgPreview.innerHTML = "";
    }
    refs.territoryTableBody.innerHTML = "";
    refs.edgeList.innerHTML = "";

    refs.mapdictOutput.value = "";
    refs.coordadjustOutput.value = "";
    refs.movesOutput.value = "";
    refs.metadataOutput.value = "";
    refs.maptxtOutput.value = "";
    refs.viewBoxCenterXInput.value = "";
    refs.viewBoxCenterYInput.value = "";
    refs.viewBoxWidthInput.value = "";
    refs.viewBoxHeightInput.value = "";
    if (refs.viewBoxOverlay) {
        refs.viewBoxOverlay.classList.add("is-hidden");
        refs.viewBoxOverlay.classList.remove("is-dragging");
    }
    if (refs.viewBoxFrame) {
        refs.viewBoxFrame.classList.remove("is-moving");
    }
    if (refs.cameraBoundsOverlay) {
        refs.cameraBoundsOverlay.classList.add("is-hidden");
        refs.cameraBoundsOverlay.classList.remove("is-dragging");
    }
    if (refs.cameraBoundsFrame) {
        refs.cameraBoundsFrame.classList.remove("is-moving");
    }

    state.viewBoxDrag.active = false;
    state.viewBoxDrag.pointerId = null;
    state.viewBoxDrag.captureElement = null;
    state.viewBoxDrag.mode = null;
    state.viewBoxDrag.changed = false;

    state.cameraBoundsDrag.active = false;
    state.cameraBoundsDrag.pointerId = null;
    state.cameraBoundsDrag.captureElement = null;
    state.cameraBoundsDrag.mode = null;
    state.cameraBoundsDrag.changed = false;
    state.cameraBoundsDrag.viewBoxMinX = 0;
    state.cameraBoundsDrag.viewBoxMinY = 0;
    state.cameraBoundsDrag.viewBoxWidth = 0;
    state.cameraBoundsDrag.viewBoxHeight = 0;

    if (refs.territoryMenuMovesList) {
        refs.territoryMenuMovesList.innerHTML = "";
    }
    hideTerritoryEditorMenu();

    state.preview.showMoveGraph = false;
    updateMoveGraphToggleUi();
    resetPreviewView();
}

function initializeCandidates(svgRoot) {
    const candidates = svgRoot.querySelectorAll(SVG_CANDIDATE_SELECTOR);

    let index = 1;
    const preMarkedTerritoryIds = [];
    const inferredTerritoryIds = [];

    for (const el of candidates) {
        if (el.closest("defs")) {
            continue;
        }

        const elementId = "el" + String(index++).padStart(4, "0");
        el.setAttribute("data-editor-id", elementId);
        el.classList.add("editor-candidate");
        const tagName = el.tagName.toLowerCase();
        const originalStyle = el.getAttribute("style");
        const colorKey = normalizeTerritoryColorKey(el.getAttribute("data-color"));
        const hasTerritoryMarker = el.classList.contains("map-region") || !!el.getAttribute("data-code");
        const shouldInferTerritory = !hasTerritoryMarker && candidateLooksLikeUnclassifiedTerritory(el, tagName, originalStyle);

        state.candidates.set(elementId, {
            id: elementId,
            element: el,
            tagName,
            preCode: normalizeCode(el.getAttribute("data-code") || ""),
            colorKey,
            originalStyle,
        });

        el.addEventListener("mouseenter", () => onCandidateHover(elementId, true));
        el.addEventListener("mouseleave", () => onCandidateHover(elementId, false));

        if (hasTerritoryMarker) {
            const inferredCode = normalizeCode(el.getAttribute("data-code") || nextAvailableCode());
            state.territories.set(elementId, {
                elementId,
                code: inferredCode,
                name: inferredCode,
                offsetX: 0,
                offsetY: 0,
            });
            writeTerritoryToElement(elementId);
            preMarkedTerritoryIds.push(elementId);
            continue;
        }

        if (shouldInferTerritory) {
            inferredTerritoryIds.push(elementId);
        }
    }

    let inferredCount = 0;
    if (shouldInferTerritoriesFromStyles(preMarkedTerritoryIds.length, inferredTerritoryIds.length)) {
        for (const elementId of inferredTerritoryIds) {
            if (state.territories.has(elementId)) {
                continue;
            }

            const inferredCode = nextAvailableCode();
            state.territories.set(elementId, {
                elementId,
                code: inferredCode,
                name: inferredCode,
                offsetX: 0,
                offsetY: 0,
            });

            const candidate = state.candidates.get(elementId);
            if (candidate) {
                candidate.preCode = inferredCode;
            }

            writeTerritoryToElement(elementId);
            inferredCount += 1;
        }
    }

    return {
        preMarkedCount: preMarkedTerritoryIds.length,
        inferredCount,
    };
}

function candidateLooksLikeUnclassifiedTerritory(element, tagName, styleText) {
    if (!isTerritoryGeometryTag(tagName)) {
        return false;
    }
    if (element.classList.contains("rotate-svg")) {
        return false;
    }
    if (classListHasPrefix(element, "particle-move-")) {
        return false;
    }

    const style = String(styleText || "").toLowerCase();
    if (!style) {
        return false;
    }

    const hasStrokeWidthZero = /(?:^|;)\s*stroke-width\s*:\s*0(?:px)?\b/.test(style);
    if (!hasStrokeWidthZero) {
        return false;
    }

    const hasFill = /(?:^|;)\s*fill\s*:/.test(style);
    return !hasFill;
}

function isTerritoryGeometryTag(tagName) {
    return tagName === "path" || tagName === "polygon" || tagName === "polyline" || tagName === "rect";
}

function classListHasPrefix(element, prefix) {
    if (!element || !element.classList) {
        return false;
    }

    for (const className of element.classList) {
        if (className.startsWith(prefix)) {
            return true;
        }
    }

    return false;
}

function shouldInferTerritoriesFromStyles(preMarkedCount, inferredCandidateCount) {
    if (inferredCandidateCount === 0) {
        return false;
    }

    // Only infer when a map has no explicit territory markers at all.
    // Partially tagged maps (like Hawaii) often include decorative geometry that matches
    // stroke-width heuristics but should not become playable territories.
    if (preMarkedCount > 0) {
        return false;
    }

    return inferredCandidateCount >= 8;
}

function bindSvgSelection(svgRoot) {
    svgRoot.addEventListener("click", (event) => {
        if (state.preview.suppressClick) {
            state.preview.suppressClick = false;
            return;
        }

        const target = event.target.closest("[data-editor-id]");
        let elementId = target ? target.getAttribute("data-editor-id") : null;
        if (!elementId) {
            elementId = findCandidateIdAtPoint(event.clientX, event.clientY);
        }

        if (!elementId) {
            state.selectedElementId = null;
            refreshAllUi();
            return;
        }

        selectElement(elementId);
    });
}

function selectCandidateAtPoint(clientX, clientY) {
    const elementId = findCandidateIdAtPoint(clientX, clientY);
    if (!elementId) {
        state.selectedElementId = null;
        refreshAllUi();
        return;
    }

    selectElement(elementId);
}

function findCandidateIdAtPoint(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
        return null;
    }

    const hit = document.elementFromPoint(clientX, clientY);
    if (hit && hit.closest) {
        const directTarget = hit.closest("[data-editor-id]");
        if (directTarget) {
            const directId = directTarget.getAttribute("data-editor-id");
            if (state.candidates.has(directId)) {
                return directId;
            }
        }
    }

    // Fallback: treat any click inside a candidate's rendered bounds as selecting that candidate.
    let bestId = null;
    let bestArea = Infinity;
    for (const [id, entry] of state.candidates.entries()) {
        const rect = entry.element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            continue;
        }

        const withinX = clientX >= rect.left && clientX <= rect.right;
        const withinY = clientY >= rect.top && clientY <= rect.bottom;
        if (!withinX || !withinY) {
            continue;
        }

        const area = rect.width * rect.height;
        if (area < bestArea) {
            bestArea = area;
            bestId = id;
        }
    }

    return bestId;
}

function onCandidateHover(elementId, isHovering) {
    if (isHovering) {
        state.hoveredElementId = elementId;
    } else if (state.hoveredElementId === elementId) {
        state.hoveredElementId = null;
    }

    refreshCandidateHighlights();
}

function selectElement(elementId) {
    if (!state.candidates.has(elementId)) {
        return;
    }

    state.selectedElementId = elementId;
    refreshSelectionUi();
    refreshCandidateHighlights();
}

function markSelectedAsTerritory() {
    const id = state.selectedElementId;
    if (!id || !state.candidates.has(id)) {
        setValidationStatus("Select a shape before marking it as a territory.", true);
        return;
    }

    if (!state.territories.has(id)) {
        const existingCode = state.candidates.get(id).preCode;
        const code = existingCode || nextAvailableCode();
        state.territories.set(id, {
            elementId: id,
            code,
            name: code,
            offsetX: 0,
            offsetY: 0,
        });
    }

    const candidate = state.candidates.get(id);
    if (candidate) {
        candidate.preCode = state.territories.get(id).code;
    }

    writeTerritoryToElement(id);
    refreshAllUi();
    setValidationStatus("Territory marked.", false);
}

function unmarkSelectedTerritory() {
    const id = state.selectedElementId;
    if (!id || !state.territories.has(id)) {
        return;
    }

    state.territories.delete(id);
    removeTerritoryFromEdges(id);

    const candidate = state.candidates.get(id);
    if (candidate) {
        candidate.element.removeAttribute("data-code");
        candidate.element.classList.remove("map-region", "map-element");
    }

    refreshAllUi();
    setValidationStatus("Territory removed.", false);
}

function applySelectedFieldUpdates() {
    const id = state.selectedElementId;
    if (!id || !state.territories.has(id)) {
        setValidationStatus("Select a marked territory to apply field updates.", true);
        return;
    }

    const t = state.territories.get(id);
    t.code = normalizeCode(refs.selectedCodeInput.value) || t.code;
    t.name = refs.selectedNameInput.value.trim() || t.name;
    t.offsetX = parseNumber(refs.selectedOffsetXInput.value, t.offsetX);
    t.offsetY = parseNumber(refs.selectedOffsetYInput.value, t.offsetY);

    const candidate = state.candidates.get(id);
    if (candidate) {
        candidate.preCode = t.code;
    }

    writeTerritoryToElement(id);
    refreshAllUi();
    setValidationStatus("Selection fields applied.", false);
}

function refreshAllUi() {
    refreshStats();
    refreshSelectionUi();
    refreshCandidateHighlights();
    renderTerritoryTable();
    renderMoveSelectors();
    renderEdgeList();
    renderPreviewOverlays();
}

function refreshStats() {
    refs.candidateCount.textContent = String(state.candidates.size);
    refs.territoryCount.textContent = String(state.territories.size);
    refs.moveCount.textContent = String(state.edges.size);
}

function refreshSelectionUi() {
    const id = state.selectedElementId;
    if (!id || !state.candidates.has(id)) {
        refs.selectedInfo.textContent = "Click a shape in the map preview.";
        refs.selectedCodeInput.value = "";
        refs.selectedNameInput.value = "";
        refs.selectedOffsetXInput.value = "0";
        refs.selectedOffsetYInput.value = "0";
        hideTerritoryEditorMenu();
        return;
    }

    const candidate = state.candidates.get(id);
    const territory = state.territories.get(id);

    refs.selectedInfo.textContent = "Selected: " + candidate.tagName + " (" + id + ")";

    if (territory) {
        refs.selectedCodeInput.value = territory.code;
        refs.selectedNameInput.value = territory.name;
        refs.selectedOffsetXInput.value = String(territory.offsetX);
        refs.selectedOffsetYInput.value = String(territory.offsetY);
    } else {
        refs.selectedCodeInput.value = candidate.preCode || nextAvailableCode();
        refs.selectedNameInput.value = "";
        refs.selectedOffsetXInput.value = "0";
        refs.selectedOffsetYInput.value = "0";
    }

    syncTerritoryEditorMenu();
}

function syncTerritoryEditorMenu() {
    if (!refs.territoryEditorMenu) {
        return;
    }

    const id = state.selectedElementId;
    if (!id || !state.candidates.has(id)) {
        hideTerritoryEditorMenu();
        return;
    }

    const candidate = state.candidates.get(id);
    const territory = state.territories.get(id);
    const suggestedCode = normalizeTwoLetterCode(territory ? territory.code : candidate.preCode);

    refs.territoryMenuTitle.textContent = candidate.tagName + " (" + id + ")";
    refs.territoryMenuCodeInput.value = suggestedCode;
    refs.territoryMenuNameInput.value = territory ? territory.name : "";
    refs.territoryMenuOffsetXInput.value = territory ? String(territory.offsetX) : "0";
    refs.territoryMenuOffsetYInput.value = territory ? String(territory.offsetY) : "0";
    refs.territoryMenuSaveBtn.textContent = territory ? "Apply Territory" : "Mark Territory";
    refs.territoryMenuUnmarkBtn.disabled = !territory;

    renderTerritoryMenuMoves(id);
    refs.territoryEditorMenu.classList.remove("is-hidden");
    positionTerritoryEditorMenu();
}

function hideTerritoryEditorMenu() {
    if (!refs.territoryEditorMenu) {
        return;
    }
    refs.territoryEditorMenu.classList.add("is-hidden");
}

function positionTerritoryEditorMenu() {
    if (!refs.territoryEditorMenu || refs.territoryEditorMenu.classList.contains("is-hidden")) {
        return;
    }

    const id = state.selectedElementId;
    const candidate = state.candidates.get(id);
    if (!id || !candidate || !refs.svgPreview) {
        return;
    }

    const previewRect = refs.svgPreview.getBoundingClientRect();
    const targetRect = candidate.element.getBoundingClientRect();
    const menuRect = refs.territoryEditorMenu.getBoundingClientRect();

    let left = (targetRect.right - previewRect.left) + 12;
    let top = targetRect.top - previewRect.top;

    if (left + menuRect.width > previewRect.width - 8) {
        left = (targetRect.left - previewRect.left) - menuRect.width - 12;
    }

    left = clampNumber(left, 8, Math.max(8, previewRect.width - menuRect.width - 8));
    top = clampNumber(top, 8, Math.max(8, previewRect.height - menuRect.height - 8));

    refs.territoryEditorMenu.style.left = String(left) + "px";
    refs.territoryEditorMenu.style.top = String(top) + "px";
}

function renderTerritoryMenuMoves(selectedElementId) {
    if (!refs.territoryMenuMovesList) {
        return;
    }

    refs.territoryMenuMovesList.innerHTML = "";

    if (!state.territories.has(selectedElementId)) {
        const hint = document.createElement("p");
        hint.className = "territory-editor-hint";
        hint.textContent = "Mark this shape as a territory first to edit moves.";
        refs.territoryMenuMovesList.appendChild(hint);
        return;
    }

    const territories = sortedTerritoriesByProximity(selectedElementId);
    if (!territories.length) {
        const hint = document.createElement("p");
        hint.className = "territory-editor-hint";
        hint.textContent = "Add at least one other territory to define moves.";
        refs.territoryMenuMovesList.appendChild(hint);
        return;
    }

    for (const territory of territories) {
        const option = document.createElement("label");
        option.className = "territory-editor-move-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.edges.has(edgeKey(selectedElementId, territory.elementId));
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                state.edges.add(edgeKey(selectedElementId, territory.elementId));
            } else {
                state.edges.delete(edgeKey(selectedElementId, territory.elementId));
            }

            refreshStats();
            renderMoveSelectors();
            renderEdgeList();
            renderPreviewMovesGraph();
        });

        const label = document.createElement("span");
        label.textContent = territory.code + " - " + territory.name;

        option.appendChild(checkbox);
        option.appendChild(label);
        refs.territoryMenuMovesList.appendChild(option);
    }
}

function applyTerritoryMenuUpdates() {
    const id = state.selectedElementId;
    if (!id || !state.candidates.has(id)) {
        setValidationStatus("Select a shape before saving territory fields.", true);
        return;
    }

    const code = normalizeTwoLetterCode(refs.territoryMenuCodeInput.value);
    if (code.length !== 2) {
        setValidationStatus("Territory code must be exactly 2 letters.", true);
        refs.territoryMenuCodeInput.focus();
        return;
    }

    const duplicateOwner = findTerritoryIdByCode(code);
    if (duplicateOwner && duplicateOwner !== id) {
        setValidationStatus("Code " + code + " is already used by another territory.", true);
        return;
    }

    const territory = state.territories.get(id) || {
        elementId: id,
        code,
        name: code,
        offsetX: 0,
        offsetY: 0,
    };

    territory.code = code;
    territory.name = refs.territoryMenuNameInput.value.trim() || code;
    territory.offsetX = parseNumber(refs.territoryMenuOffsetXInput.value, 0);
    territory.offsetY = parseNumber(refs.territoryMenuOffsetYInput.value, 0);

    state.territories.set(id, territory);

    const candidate = state.candidates.get(id);
    candidate.preCode = code;
    writeTerritoryToElement(id);

    refreshAllUi();
    setValidationStatus("Territory fields saved.", false);
}

function unmarkSelectedTerritoryFromMenu() {
    const id = state.selectedElementId;
    if (!id || !state.territories.has(id)) {
        return;
    }

    unmarkSelectedTerritory();
}

function normalizeTwoLetterCode(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 2);
}

function refreshCandidateHighlights() {
    for (const [id, entry] of state.candidates.entries()) {
        const isTerritory = state.territories.has(id);
        const isSelected = state.selectedElementId === id;
        const isHovered = state.hoveredElementId === id;

        entry.element.classList.toggle("is-territory", isTerritory);
        entry.element.classList.toggle("is-selected", isSelected);
        entry.element.classList.toggle("is-hovered", isHovered);

        restoreCandidateOriginalStyle(entry);

        const styleDecl = entry.element && entry.element.style;
        if (!styleDecl || typeof styleDecl.setProperty !== "function") {
            continue;
        }

        if (!isTerritory) {
            applyNonTerritoryFillFallback(entry);

            if (isSelected) {
                styleDecl.setProperty("stroke", "#004ab3", "important");
                styleDecl.setProperty("stroke-width", "5px", "important");
                styleDecl.setProperty("stroke-linejoin", "round", "important");
            } else if (isHovered) {
                styleDecl.setProperty("stroke", "#ffe18d", "important");
                styleDecl.setProperty("stroke-width", "4px", "important");
                styleDecl.setProperty("stroke-linejoin", "round", "important");
            }
            continue;
        }

        const colorKey = normalizeTerritoryColorKey(entry.colorKey);
        const fillColor = getTerritoryColor(colorKey, isHovered);

        styleDecl.setProperty("fill", fillColor, "important");
        styleDecl.setProperty("stroke-linejoin", "round", "important");

        if (isSelected) {
            styleDecl.setProperty("stroke", "#004ab3", "important");
            styleDecl.setProperty("stroke-width", "5px", "important");
        } else if (isHovered) {
            styleDecl.setProperty("stroke", "#ffffff", "important");
            styleDecl.setProperty("stroke-width", "5px", "important");
        } else {
            styleDecl.setProperty("stroke", "#171717", "important");
            styleDecl.setProperty("stroke-width", "2px", "important");
        }
    }
}

function applyNonTerritoryFillFallback(candidateEntry) {
    if (!candidateEntry || !candidateEntry.element) {
        return;
    }

    const styleDecl = candidateEntry.element.style;
    if (!styleDecl || typeof styleDecl.setProperty !== "function") {
        return;
    }

    if (!isTerritoryGeometryTag(candidateEntry.tagName)) {
        return;
    }

    const style = String(candidateEntry.originalStyle || "").toLowerCase();
    const hasStyleFill = /(?:^|;)\s*fill\s*:/.test(style);
    const hasFillAttribute = candidateEntry.element.hasAttribute("fill");
    if (hasStyleFill || hasFillAttribute) {
        return;
    }

    const hasStrokeWidthZero = /(?:^|;)\s*stroke-width\s*:\s*0(?:px)?\b/.test(style);
    if (!hasStrokeWidthZero) {
        return;
    }

    // Keep unclassified shapes visible in preview while avoiding default black fills.
    styleDecl.setProperty("fill", "rgba(255, 226, 191, 0.68)", "important");
    styleDecl.setProperty("stroke", "rgba(23, 23, 23, 0.42)", "important");
    styleDecl.setProperty("stroke-width", "1.2px", "important");
    styleDecl.setProperty("stroke-linejoin", "round", "important");
}

function renderTerritoryTable() {
    refs.territoryTableBody.innerHTML = "";

    const sortedTerritories = Array.from(state.territories.values()).sort((a, b) => {
        return a.code.localeCompare(b.code);
    });

    for (const t of sortedTerritories) {
        const tr = document.createElement("tr");

        const elementCell = document.createElement("td");
        elementCell.innerHTML = "<span class=\"code-pill\">" + t.elementId + "</span>";

        const codeCell = document.createElement("td");
        const codeInput = document.createElement("input");
        codeInput.value = t.code;
        codeInput.addEventListener("input", () => {
            t.code = normalizeCode(codeInput.value);
            writeTerritoryToElement(t.elementId);
            renderMoveSelectors();
            renderEdgeList();
            renderPreviewOverlays();
        });
        codeCell.appendChild(codeInput);

        const nameCell = document.createElement("td");
        const nameInput = document.createElement("input");
        nameInput.value = t.name;
        nameInput.addEventListener("input", () => {
            t.name = nameInput.value;
            renderMoveSelectors();
            renderEdgeList();
            renderPreviewOverlays();
        });
        nameCell.appendChild(nameInput);

        const offsetXCell = document.createElement("td");
        const offsetXInput = document.createElement("input");
        offsetXInput.type = "number";
        offsetXInput.value = String(t.offsetX);
        offsetXInput.addEventListener("change", () => {
            t.offsetX = parseNumber(offsetXInput.value, 0);
            renderPreviewOverlays();
        });
        offsetXCell.appendChild(offsetXInput);

        const offsetYCell = document.createElement("td");
        const offsetYInput = document.createElement("input");
        offsetYInput.type = "number";
        offsetYInput.value = String(t.offsetY);
        offsetYInput.addEventListener("change", () => {
            t.offsetY = parseNumber(offsetYInput.value, 0);
            renderPreviewOverlays();
        });
        offsetYCell.appendChild(offsetYInput);

        const actionCell = document.createElement("td");
        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "btn ghost";
        selectBtn.textContent = "Select";
        selectBtn.addEventListener("click", () => selectElement(t.elementId));

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn ghost";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
            if (state.selectedElementId === t.elementId) {
                state.selectedElementId = null;
            }
            state.territories.delete(t.elementId);
            removeTerritoryFromEdges(t.elementId);
            const candidate = state.candidates.get(t.elementId);
            if (candidate) {
                candidate.element.removeAttribute("data-code");
                candidate.element.classList.remove("map-region", "map-element");
            }
            refreshAllUi();
        });

        actionCell.appendChild(selectBtn);
        actionCell.appendChild(document.createTextNode(" "));
        actionCell.appendChild(removeBtn);

        tr.appendChild(elementCell);
        tr.appendChild(codeCell);
        tr.appendChild(nameCell);
        tr.appendChild(offsetXCell);
        tr.appendChild(offsetYCell);
        tr.appendChild(actionCell);

        refs.territoryTableBody.appendChild(tr);
    }
}

function renderMoveSelectors() {
    const territories = sortedTerritoriesByCode();

    const options = [
        "<option value=\"\">Choose...</option>",
        ...territories.map((t) => {
            const label = territoryLabel(t.elementId);
            return "<option value=\"" + escapeHtml(t.elementId) + "\">" + escapeHtml(label) + "</option>";
        }),
    ];

    refs.moveASelect.innerHTML = options.join("");
    refs.moveBSelect.innerHTML = options.join("");
}

function renderEdgeList() {
    refs.edgeList.innerHTML = "";

    const edges = sortedEdgeEntries();
    for (const edge of edges) {
        const li = document.createElement("li");
        li.textContent = edge.label;
        refs.edgeList.appendChild(li);
    }
}

function renderPreviewOverlays() {
    renderPreviewLabels();
    renderPreviewMovesGraph();
    renderViewBoxOverlay();
    renderCameraBoundsOverlay();
}

function renderPreviewLabels() {
    if (!refs.previewLabelsLayer) {
        return;
    }

    refs.previewLabelsLayer.innerHTML = "";

    const fragment = document.createDocumentFragment();

    for (const territory of sortedTerritoriesByCode()) {
        const candidate = state.candidates.get(territory.elementId);
        if (!candidate) {
            continue;
        }

        const offset = getPreviewOffset(candidate.element);
        if (!offset) {
            continue;
        }

        const label = document.createElement("div");
        label.className = "territorylabel";
        // Compensate for runtime overlay layout (mapl2/map paddings) so editor labels match in-game placement.
        label.style.left = String(offset.left - 15 + Number(territory.offsetX || 0)) + "px";
        label.style.top = String(offset.top + Number(territory.offsetY || 0)) + "px";
        label.setAttribute("data-territory-id", territory.elementId);
        label.innerHTML =
            "<div class=\"t_troop_change\">+0</div>" +
            "<div class=\"t_name\"><span></span>" + escapeHtml(territory.name || territory.code) + "</div>" +
            "<div class=\"t_troops\"><div class=\"t_troops_value\" style=\"margin-top: -7px; font-weight: bold; margin-left: -45px; width: 100px;\">0</div></div>";

        fragment.appendChild(label);
    }

    refs.previewLabelsLayer.appendChild(fragment);
}

function renderPreviewMovesGraph() {
    if (!refs.previewMovesSvg) {
        return;
    }

    refs.previewMovesSvg.innerHTML = "";
    refs.previewMovesSvg.style.display = state.preview.showMoveGraph ? "block" : "none";

    if (!state.preview.showMoveGraph || !state.svgRoot) {
        return;
    }

    const graphBounds = getPreviewMovesGraphBounds();
    if (!graphBounds) {
        return;
    }

    refs.previewMovesSvg.style.left = formatNumberForInput(graphBounds.minX) + "px";
    refs.previewMovesSvg.style.top = formatNumberForInput(graphBounds.minY) + "px";
    refs.previewMovesSvg.style.width = formatNumberForInput(graphBounds.width) + "px";
    refs.previewMovesSvg.style.height = formatNumberForInput(graphBounds.height) + "px";
    refs.previewMovesSvg.setAttribute("width", formatNumberForInput(graphBounds.width));
    refs.previewMovesSvg.setAttribute("height", formatNumberForInput(graphBounds.height));
    refs.previewMovesSvg.setAttribute(
        "viewBox",
        formatNumberForInput(graphBounds.minX) +
            " " +
            formatNumberForInput(graphBounds.minY) +
            " " +
            formatNumberForInput(graphBounds.width) +
            " " +
            formatNumberForInput(graphBounds.height),
    );

    for (const key of state.edges) {
        const [idA, idB] = key.split("|");
        const pointA = getTerritoryCenterInPreview(idA);
        const pointB = getTerritoryCenterInPreview(idB);
        if (!pointA || !pointB) {
            continue;
        }

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", String(pointA.x));
        line.setAttribute("y1", String(pointA.y));
        line.setAttribute("x2", String(pointB.x));
        line.setAttribute("y2", String(pointB.y));
        line.setAttribute("class", "preview-move-edge");
        refs.previewMovesSvg.appendChild(line);
    }
}

function getPreviewMovesGraphBounds() {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    let hasBounds = false;

    const mapSize = getPreviewMapDimensions();
    if (mapSize) {
        minX = 0;
        minY = 0;
        maxX = mapSize.width;
        maxY = mapSize.height;
        hasBounds = true;
    }

    for (const territory of state.territories.values()) {
        const point = getTerritoryCenterInPreview(territory.elementId);
        if (!point) {
            continue;
        }

        if (!hasBounds) {
            minX = point.x;
            maxX = point.x;
            minY = point.y;
            maxY = point.y;
            hasBounds = true;
            continue;
        }

        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    if (!hasBounds) {
        return null;
    }

    const padding = 24;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }

    return {
        minX,
        minY,
        width,
        height,
    };
}

function getPreviewMapDimensions() {
    if (!state.svgRoot) {
        return null;
    }

    const rect = state.svgRoot.getBoundingClientRect();
    const zoomLevel = state.preview.zoom || 1;
    if (!Number.isFinite(zoomLevel) || zoomLevel <= 0) {
        return null;
    }

    const width = rect.width / zoomLevel;
    const height = rect.height / zoomLevel;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }

    return {
        width,
        height,
    };
}

function getViewUnitsPerPanPixel(viewBoxRect) {
    if (!viewBoxRect || viewBoxRect.width <= 0 || viewBoxRect.height <= 0) {
        return null;
    }

    const mapSize = getPreviewMapDimensions();
    if (!mapSize || mapSize.width <= 0 || mapSize.height <= 0) {
        return null;
    }

    const unitsX = viewBoxRect.width / mapSize.width;
    const unitsY = viewBoxRect.height / mapSize.height;

    if (!Number.isFinite(unitsX) || !Number.isFinite(unitsY) || unitsX <= 0 || unitsY <= 0) {
        return null;
    }

    return {
        x: unitsX,
        y: unitsY,
    };
}

function renderViewBoxOverlay() {
    if (!refs.viewBoxOverlay || !refs.viewBoxFrame || !refs.svgPreview || !state.svgRoot) {
        if (refs.viewBoxOverlay) {
            refs.viewBoxOverlay.classList.add("is-hidden");
        }
        return;
    }

    if (!state.preview.showViewBoxOverlay) {
        refs.viewBoxOverlay.classList.add("is-hidden");
        return;
    }

    const previewRect = refs.svgPreview.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
        refs.viewBoxOverlay.classList.add("is-hidden");
        return;
    }

    let vb = parseViewBox(state.svgRoot.getAttribute("viewBox"));
    if (!vb) {
        const centerX = Number(refs.viewBoxCenterXInput.value);
        const centerY = Number(refs.viewBoxCenterYInput.value);
        const width = Number(refs.viewBoxWidthInput.value);
        const height = Number(refs.viewBoxHeightInput.value);
        if (Number.isFinite(centerX) && Number.isFinite(centerY) && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
            vb = {
                minX: centerX - (width / 2),
                minY: centerY - (height / 2),
                width,
                height,
            };
        }
    }
    const reference = getViewBoxOverlayReference(vb);
    if (!vb || !reference || reference.width <= 0 || reference.height <= 0) {
        refs.viewBoxOverlay.classList.add("is-hidden");
        return;
    }

    const normalizedLeft = (vb.minX - reference.minX) / reference.width;
    const normalizedTop = (vb.minY - reference.minY) / reference.height;
    const normalizedWidth = vb.width / reference.width;
    const normalizedHeight = vb.height / reference.height;

    if (!Number.isFinite(normalizedLeft) || !Number.isFinite(normalizedTop) || !Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight)) {
        refs.viewBoxOverlay.classList.add("is-hidden");
        return;
    }

    const minFramePx = 20;
    let left = normalizedLeft * previewRect.width;
    let top = normalizedTop * previewRect.height;
    let width = Math.max(minFramePx, normalizedWidth * previewRect.width);
    let height = Math.max(minFramePx, normalizedHeight * previewRect.height);

    left = clampNumber(left, -width + 12, previewRect.width - 12);
    top = clampNumber(top, -height + 12, previewRect.height - 12);

    refs.viewBoxFrame.style.left = formatNumberForInput(left) + "px";
    refs.viewBoxFrame.style.top = formatNumberForInput(top) + "px";
    refs.viewBoxFrame.style.width = formatNumberForInput(width) + "px";
    refs.viewBoxFrame.style.height = formatNumberForInput(height) + "px";
    refs.viewBoxOverlay.classList.remove("is-hidden");
}

function renderCameraBoundsOverlay() {
    if (!refs.cameraBoundsOverlay || !refs.cameraBoundsFrame || !refs.svgPreview || !state.svgRoot) {
        if (refs.cameraBoundsOverlay) {
            refs.cameraBoundsOverlay.classList.add("is-hidden");
        }
        return;
    }

    if (!state.preview.showCameraBoundsOverlay) {
        refs.cameraBoundsOverlay.classList.add("is-hidden");
        return;
    }

    const previewRect = refs.svgPreview.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
        refs.cameraBoundsOverlay.classList.add("is-hidden");
        return;
    }

    const viewBoxRect = getCurrentViewBoxRect();
    const cameraRect = getCameraBoundsRect(viewBoxRect);
    const reference = getViewBoxOverlayReference(viewBoxRect);

    if (!viewBoxRect || !cameraRect || !reference || reference.width <= 0 || reference.height <= 0) {
        refs.cameraBoundsOverlay.classList.add("is-hidden");
        return;
    }

    const normalizedLeft = (cameraRect.minX - reference.minX) / reference.width;
    const normalizedTop = (cameraRect.minY - reference.minY) / reference.height;
    const normalizedWidth = (cameraRect.maxX - cameraRect.minX) / reference.width;
    const normalizedHeight = (cameraRect.maxY - cameraRect.minY) / reference.height;

    if (!Number.isFinite(normalizedLeft) || !Number.isFinite(normalizedTop) || !Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight)) {
        refs.cameraBoundsOverlay.classList.add("is-hidden");
        return;
    }

    const minFramePx = 20;
    let left = normalizedLeft * previewRect.width;
    let top = normalizedTop * previewRect.height;
    let width = Math.max(minFramePx, normalizedWidth * previewRect.width);
    let height = Math.max(minFramePx, normalizedHeight * previewRect.height);

    left = clampNumber(left, -width + 12, previewRect.width - 12);
    top = clampNumber(top, -height + 12, previewRect.height - 12);

    refs.cameraBoundsFrame.style.left = formatNumberForInput(left) + "px";
    refs.cameraBoundsFrame.style.top = formatNumberForInput(top) + "px";
    refs.cameraBoundsFrame.style.width = formatNumberForInput(width) + "px";
    refs.cameraBoundsFrame.style.height = formatNumberForInput(height) + "px";
    refs.cameraBoundsOverlay.classList.remove("is-hidden");
}

function getCurrentViewBoxRect() {
    if (!state.svgRoot) {
        return null;
    }

    let vb = parseViewBox(state.svgRoot.getAttribute("viewBox"));
    if (vb && vb.width > 0 && vb.height > 0) {
        return vb;
    }

    const centerX = Number(refs.viewBoxCenterXInput.value);
    const centerY = Number(refs.viewBoxCenterYInput.value);
    const width = Number(refs.viewBoxWidthInput.value);
    const height = Number(refs.viewBoxHeightInput.value);

    if (Number.isFinite(centerX) && Number.isFinite(centerY) && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        vb = {
            minX: centerX - (width / 2),
            minY: centerY - (height / 2),
            width,
            height,
        };
        return vb;
    }

    const explicitBounds = getConfiguredMapBoundsRect();
    if (explicitBounds) {
        return {
            minX: explicitBounds.minX,
            minY: explicitBounds.minY,
            width: explicitBounds.width,
            height: explicitBounds.height,
        };
    }

    const extents = computeMapElementExtents(Array.from(state.candidates.keys()));
    if (!extents) {
        return null;
    }

    return {
        minX: extents.minX,
        minY: extents.minY,
        width: extents.width,
        height: extents.height,
    };
}

function getCameraBoundsRect(viewBoxRect) {
    if (!viewBoxRect) {
        return null;
    }

    const boundsXMax = Number(refs.boundsXMax.value);
    const boundsXMin = Number(refs.boundsXMin.value);
    const boundsYMax = Number(refs.boundsYMax.value);
    const boundsYMin = Number(refs.boundsYMin.value);

    if (!Number.isFinite(boundsXMax) || !Number.isFinite(boundsXMin) || !Number.isFinite(boundsYMax) || !Number.isFinite(boundsYMin)) {
        return null;
    }

    const unitsPerPanPx = getViewUnitsPerPanPixel(viewBoxRect);
    if (!unitsPerPanPx) {
        return null;
    }

    const viewBoxCenterX = viewBoxRect.minX + (viewBoxRect.width / 2);
    const viewBoxCenterY = viewBoxRect.minY + (viewBoxRect.height / 2);

    const txMin = Math.min(boundsXMin, boundsXMax);
    const txMax = Math.max(boundsXMin, boundsXMax);
    const tyMin = Math.min(boundsYMin, boundsYMax);
    const tyMax = Math.max(boundsYMin, boundsYMax);

    // Pan bounds are stored in translate(px) units; convert them into viewBox units.
    const centerMinX = viewBoxCenterX - (txMax * unitsPerPanPx.x);
    const centerMaxX = viewBoxCenterX - (txMin * unitsPerPanPx.x);
    const centerMinY = viewBoxCenterY - (tyMax * unitsPerPanPx.y);
    const centerMaxY = viewBoxCenterY - (tyMin * unitsPerPanPx.y);

    // Camera bounds overlay represents the union of everything viewable while panning.
    const minX = centerMinX - (viewBoxRect.width / 2);
    const maxX = centerMaxX + (viewBoxRect.width / 2);
    const minY = centerMinY - (viewBoxRect.height / 2);
    const maxY = centerMaxY + (viewBoxRect.height / 2);

    if ((maxX - minX) <= 0 || (maxY - minY) <= 0) {
        return null;
    }

    return {
        minX,
        maxX,
        minY,
        maxY,
    };
}

function applyCameraBoundsRectToInputs(cameraRect, viewBoxCenter) {
    if (!cameraRect || !viewBoxCenter) {
        return;
    }

    const viewBoxRect = {
        minX: Number(viewBoxCenter.minX),
        minY: Number(viewBoxCenter.minY),
        width: Number(viewBoxCenter.width),
        height: Number(viewBoxCenter.height),
    };

    if (!Number.isFinite(viewBoxRect.minX) || !Number.isFinite(viewBoxRect.minY) || !Number.isFinite(viewBoxRect.width) || !Number.isFinite(viewBoxRect.height)) {
        return;
    }
    if (viewBoxRect.width <= 0 || viewBoxRect.height <= 0) {
        return;
    }

    const unitsPerPanPx = getViewUnitsPerPanPixel(viewBoxRect);
    if (!unitsPerPanPx) {
        return;
    }

    let minX = Number(cameraRect.minX);
    let maxX = Number(cameraRect.maxX);
    let minY = Number(cameraRect.minY);
    let maxY = Number(cameraRect.maxY);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
        return;
    }

    const unionWidth = Math.max(maxX - minX, viewBoxRect.width);
    const unionHeight = Math.max(maxY - minY, viewBoxRect.height);

    const centerUnionX = (minX + maxX) / 2;
    const centerUnionY = (minY + maxY) / 2;

    minX = centerUnionX - (unionWidth / 2);
    maxX = centerUnionX + (unionWidth / 2);
    minY = centerUnionY - (unionHeight / 2);
    maxY = centerUnionY + (unionHeight / 2);

    const viewBoxCenterX = viewBoxRect.minX + (viewBoxRect.width / 2);
    const viewBoxCenterY = viewBoxRect.minY + (viewBoxRect.height / 2);

    const centerMinX = minX + (viewBoxRect.width / 2);
    const centerMaxX = maxX - (viewBoxRect.width / 2);
    const centerMinY = minY + (viewBoxRect.height / 2);
    const centerMaxY = maxY - (viewBoxRect.height / 2);

    const nextBoundsXMax = (viewBoxCenterX - centerMinX) / unitsPerPanPx.x;
    const nextBoundsXMin = (viewBoxCenterX - centerMaxX) / unitsPerPanPx.x;
    const nextBoundsYMax = (viewBoxCenterY - centerMinY) / unitsPerPanPx.y;
    const nextBoundsYMin = (viewBoxCenterY - centerMaxY) / unitsPerPanPx.y;

    refs.boundsXMax.value = formatNumberForInput(nextBoundsXMax);
    refs.boundsXMin.value = formatNumberForInput(nextBoundsXMin);
    refs.boundsYMax.value = formatNumberForInput(nextBoundsYMax);
    refs.boundsYMin.value = formatNumberForInput(nextBoundsYMin);
}

function getViewBoxOverlayReference(currentViewBox) {
    const explicitBounds = getConfiguredMapBoundsRect();
    if (explicitBounds) {
        return explicitBounds;
    }

    const extents = computeMapElementExtents(Array.from(state.candidates.keys()));
    if (extents && Number.isFinite(extents.width) && Number.isFinite(extents.height) && extents.width > 0 && extents.height > 0) {
        const marginX = Math.max(20, extents.width * 0.08);
        const marginY = Math.max(20, extents.height * 0.08);

        return {
            minX: extents.minX - marginX,
            minY: extents.minY - marginY,
            width: extents.width + (marginX * 2),
            height: extents.height + (marginY * 2),
        };
    }

    if (currentViewBox && currentViewBox.width > 0 && currentViewBox.height > 0) {
        return currentViewBox;
    }

    return null;
}

function getTerritoryCenterInPreview(elementId) {
    const candidate = state.candidates.get(elementId);
    if (!candidate) {
        return null;
    }

    const offset = getPreviewOffset(candidate.element);
    if (!offset) {
        return null;
    }

    return {
        x: offset.left + (offset.width / 2),
        y: offset.top + (offset.height / 2),
    };
}

function getPreviewOffset(element) {
    if (!element || !state.svgRoot) {
        return null;
    }

    const rect = element.getBoundingClientRect();
    const boundingMap = state.svgRoot.getBoundingClientRect();
    const zoomLevel = state.preview.zoom || 1;
    if (!Number.isFinite(zoomLevel) || zoomLevel <= 0) {
        return null;
    }

    return {
        left: (rect.left / zoomLevel) - (boundingMap.left / zoomLevel),
        top: (rect.top / zoomLevel) - (boundingMap.top / zoomLevel),
        width: rect.width / zoomLevel,
        height: rect.height / zoomLevel,
    };
}

function addMoveFromSelectors() {
    const a = refs.moveASelect.value;
    const b = refs.moveBSelect.value;

    if (!a || !b || a === b) {
        setValidationStatus("Choose two different territories before adding a move.", true);
        return;
    }

    const key = edgeKey(a, b);
    state.edges.add(key);

    refreshAllUi();
    setValidationStatus("Move added.", false);
}

function removeMoveFromSelectors() {
    const a = refs.moveASelect.value;
    const b = refs.moveBSelect.value;

    if (!a || !b || a === b) {
        return;
    }

    state.edges.delete(edgeKey(a, b));
    refreshAllUi();
    setValidationStatus("Move removed if it existed.", false);
}

function autoDetectMoves() {
    const threshold = Math.max(0, parseFloat(refs.autolinkThresholdInput.value) || 0);
    const ids = sortedTerritoriesByCode().map((t) => t.elementId);

    let added = 0;

    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i];
            const idB = ids[j];

            const entryA = state.candidates.get(idA);
            const entryB = state.candidates.get(idB);
            if (!entryA || !entryB) {
                continue;
            }

            const boxA = safeBBox(entryA.element);
            const boxB = safeBBox(entryB.element);
            if (!boxA || !boxB) {
                continue;
            }

            const distance = bboxDistance(boxA, boxB);
            if (distance <= threshold) {
                const key = edgeKey(idA, idB);
                if (!state.edges.has(key)) {
                    state.edges.add(key);
                    added += 1;
                }
            }
        }
    }

    refreshAllUi();
    setValidationStatus("Auto-detect complete. Added " + added + " move(s).", false);
}

function generateOutputFiles() {
    const validation = validateState();
    if (!validation.ok) {
        setValidationStatus(validation.messages.join(" | "), true);
        return;
    }

    const folderName = sanitizeFolderName(refs.folderNameInput.value);
    const mapDisplayName = refs.mapDisplayNameInput.value.trim();

    const territoryRecords = sortedTerritoriesByCode();

    const mapdict = {};
    const coordadjust = {};

    for (const t of territoryRecords) {
        mapdict[t.code] = t.name.trim();
        coordadjust[t.code] = [Number(t.offsetX), Number(t.offsetY)];
    }

    const moves = sortedEdgeEntries()
        .map((edge) => edge.asMove)
        .sort((a, b) => a.localeCompare(b));

    const metadata = {
        name: mapDisplayName,
        boundsX: [
            Number(refs.boundsXMax.value),
            Number(refs.boundsXMin.value),
        ],
        boundsY: [
            Number(refs.boundsYMax.value),
            Number(refs.boundsYMin.value),
        ],
    };

    const mapText = serializeExportSvg();

    state.generated = {
        folderName,
        fileName: folderName + ".txt",
        mapdict,
        coordadjust,
        moves,
        metadata,
        mapText,
    };

    refs.mapdictOutput.value = JSON.stringify(mapdict, null, 4);
    refs.coordadjustOutput.value = JSON.stringify(coordadjust, null, 4);
    refs.movesOutput.value = JSON.stringify(moves, null, 4);
    refs.metadataOutput.value = JSON.stringify(metadata, null, 4);
    refs.maptxtOutput.value = mapText;

    setValidationStatus("Files generated. Review and download zip.", false);
}

async function downloadZip() {
    if (!state.generated) {
        generateOutputFiles();
        if (!state.generated) {
            return;
        }
    }

    if (typeof JSZip === "undefined") {
        downloadIndividualFiles();
        setValidationStatus("JSZip not available. Downloaded individual files instead.", false);
        return;
    }

    const zip = new JSZip();
    const root = zip.folder(state.generated.folderName);

    root.file(state.generated.fileName, state.generated.mapText);
    root.file("mapdict.json", JSON.stringify(state.generated.mapdict, null, 4));
    root.file("coordadjust.json", JSON.stringify(state.generated.coordadjust, null, 4));
    root.file("moves.json", JSON.stringify(state.generated.moves, null, 4));
    root.file("metadata.json", JSON.stringify(state.generated.metadata, null, 4));

    const blob = await zip.generateAsync({ type: "blob" });
    const filename = state.generated.folderName + "_mapdata.zip";
    triggerBlobDownload(blob, filename);

    setValidationStatus("Downloaded " + filename, false);
}

function downloadIndividualFiles() {
    if (!state.generated) {
        generateOutputFiles();
        if (!state.generated) {
            return;
        }
    }

    triggerBlobDownload(
        new Blob([state.generated.mapText], { type: "text/plain;charset=utf-8" }),
        state.generated.fileName,
    );
    triggerBlobDownload(
        new Blob([JSON.stringify(state.generated.mapdict, null, 4)], { type: "application/json;charset=utf-8" }),
        "mapdict.json",
    );
    triggerBlobDownload(
        new Blob([JSON.stringify(state.generated.coordadjust, null, 4)], { type: "application/json;charset=utf-8" }),
        "coordadjust.json",
    );
    triggerBlobDownload(
        new Blob([JSON.stringify(state.generated.moves, null, 4)], { type: "application/json;charset=utf-8" }),
        "moves.json",
    );
    triggerBlobDownload(
        new Blob([JSON.stringify(state.generated.metadata, null, 4)], { type: "application/json;charset=utf-8" }),
        "metadata.json",
    );

    setValidationStatus("Downloaded individual mapdata files.", false);
}

function applyBoundsGuess() {
    if (!state.svgRoot) {
        return;
    }

    let width = 0;
    let height = 0;

    const explicitBounds = getConfiguredMapBoundsRect();
    if (explicitBounds) {
        width = explicitBounds.width;
        height = explicitBounds.height;
    } else {
        const territoryExtents = computeMapElementExtents(Array.from(state.territories.keys()));
        if (territoryExtents) {
            width = territoryExtents.width;
            height = territoryExtents.height;
        } else {
            const vb = parseViewBox(state.svgRoot.getAttribute("viewBox"));
            if (!vb) {
                return;
            }
            width = vb.width;
            height = vb.height;
        }
    }

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
    }

    refs.boundsXMax.value = String(Math.round(width * 0.55));
    refs.boundsXMin.value = String(Math.round(-width * 0.7));
    refs.boundsYMax.value = String(Math.round(height * 0.45));
    refs.boundsYMin.value = String(Math.round(-height * 0.9));
}

function syncViewBoxInputsFromRoot() {
    if (!state.svgRoot) {
        if (refs.viewBoxOverlay) {
            refs.viewBoxOverlay.classList.add("is-hidden");
        }
        return;
    }

    let vb = parseViewBox(state.svgRoot.getAttribute("viewBox"));
    if (!vb) {
        const explicitBounds = getConfiguredMapBoundsRect();
        if (explicitBounds) {
            vb = {
                minX: explicitBounds.minX,
                minY: explicitBounds.minY,
                width: explicitBounds.width,
                height: explicitBounds.height,
            };
        } else {
            const extents = computeMapElementExtents(Array.from(state.candidates.keys()));
            if (!extents) {
                return;
            }

            vb = {
                minX: extents.minX,
                minY: extents.minY,
                width: extents.width,
                height: extents.height,
            };
        }
    }

    const centerX = vb.minX + (vb.width / 2);
    const centerY = vb.minY + (vb.height / 2);

    refs.viewBoxCenterXInput.value = formatNumberForInput(centerX);
    refs.viewBoxCenterYInput.value = formatNumberForInput(centerY);
    refs.viewBoxWidthInput.value = formatNumberForInput(vb.width);
    refs.viewBoxHeightInput.value = formatNumberForInput(vb.height);
    renderViewBoxOverlay();
    renderCameraBoundsOverlay();
}

function applyViewBoxCenterAndSize(options) {
    const opts = options || {};

    if (!state.svgRoot) {
        if (!opts.silentStatus) {
            setValidationStatus("Load an SVG before editing viewBox center/size.", true);
        }
        return;
    }

    const centerX = Number(refs.viewBoxCenterXInput.value);
    const centerY = Number(refs.viewBoxCenterYInput.value);
    const width = Number(refs.viewBoxWidthInput.value);
    const height = Number(refs.viewBoxHeightInput.value);

    if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(width) || !Number.isFinite(height)) {
        if (!opts.silentStatus) {
            setValidationStatus("ViewBox center and size must be numeric.", true);
        }
        return;
    }
    if (width <= 0 || height <= 0) {
        if (!opts.silentStatus) {
            setValidationStatus("ViewBox width and height must be greater than 0.", true);
        }
        return;
    }

    const minX = centerX - (width / 2);
    const minY = centerY - (height / 2);

    state.svgRoot.setAttribute(
        "viewBox",
        formatNumberForInput(minX) + " " + formatNumberForInput(minY) + " " + formatNumberForInput(width) + " " + formatNumberForInput(height),
    );

    syncViewBoxInputsFromRoot();
    renderPreviewOverlays();
    positionTerritoryEditorMenu();
    if (!opts.silentStatus) {
        setValidationStatus("Applied viewBox center/size.", false);
    }
}

function fitViewBoxToTerritories() {
    if (!state.svgRoot) {
        setValidationStatus("Load an SVG before fitting its viewBox.", true);
        return;
    }

    if (!state.territories.size) {
        setValidationStatus("Mark territories first, then fit viewBox to territory bounds.", true);
        return;
    }

    const extents = computeMapElementExtents(Array.from(state.territories.keys()));
    if (!extents) {
        setValidationStatus("Could not compute territory bounds for viewBox fitting.", true);
        return;
    }

    const padX = Math.max(30, extents.width * 0.12);
    const padY = Math.max(30, extents.height * 0.12);

    const minX = Math.round(extents.minX - padX);
    const minY = Math.round(extents.minY - padY);
    const width = Math.max(1, Math.round(extents.width + (padX * 2)));
    const height = Math.max(1, Math.round(extents.height + (padY * 2)));

    state.svgRoot.setAttribute("viewBox", minX + " " + minY + " " + width + " " + height);

    syncViewBoxInputsFromRoot();
    applyBoundsGuess();
    renderPreviewOverlays();
    positionTerritoryEditorMenu();

    setValidationStatus("Updated viewBox to fit marked territories.", false);
}

function autoCenterTerritoryOffsets() {
    if (!state.svgRoot || !state.territories.size) {
        setValidationStatus("Mark territories before auto-centering offsets.", true);
        return;
    }

    let updated = 0;

    for (const territory of state.territories.values()) {
        const candidate = state.candidates.get(territory.elementId);
        if (!candidate) {
            continue;
        }

        const previewOffset = getPreviewOffset(candidate.element);
        if (!previewOffset) {
            continue;
        }

        const computedX = clampNumber(Math.round((previewOffset.width / 2) - 25), -300, 300);
        const computedY = clampNumber(Math.round((previewOffset.height / 2) - 35), -300, 300);

        if (territory.offsetX !== computedX || territory.offsetY !== computedY) {
            updated += 1;
        }

        territory.offsetX = computedX;
        territory.offsetY = computedY;
    }

    refreshAllUi();
    setValidationStatus("Auto-centered offsets for " + updated + " territory(ies). Fine-tune overlaps manually.", false);
}

function getConfiguredMapBoundsRect() {
    if (!state.svgRoot) {
        return null;
    }

    const rects = Array.from(state.svgRoot.querySelectorAll("rect")).filter((rect) => !rect.closest("defs"));

    const explicitBoundsRect = rects.find(
        (rect) => String(rect.getAttribute("data-map-bounds") || "").toLowerCase() === "true",
    );
    if (explicitBoundsRect) {
        const explicitBounds = parseBoundsRect(explicitBoundsRect);
        if (explicitBounds) {
            return explicitBounds;
        }
    }

    for (const rect of rects) {
        if (rect === explicitBoundsRect) {
            continue;
        }

        if (rect.closest("defs")) {
            continue;
        }

        if (!isTransparentMapBoundsRect(rect)) {
            continue;
        }

        const parsedRect = parseBoundsRect(rect);
        if (parsedRect) {
            return parsedRect;
        }
    }

    return null;
}

function parseBoundsRect(rect) {
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }

    if (width < 100 || height < 100) {
        return null;
    }

    const x = parseNumber(rect.getAttribute("x"), 0);
    const y = parseNumber(rect.getAttribute("y"), 0);

    return {
        minX: x,
        minY: y,
        maxX: x + width,
        maxY: y + height,
        width,
        height,
    };
}

function isTransparentMapBoundsRect(rect) {
    if (!rect) {
        return false;
    }

    if (String(rect.getAttribute("data-map-bounds") || "").toLowerCase() === "true") {
        return true;
    }

    const normalizedStyle = String(rect.getAttribute("style") || "")
        .replace(/\s+/g, "")
        .toLowerCase();
    if (normalizedStyle.includes("fill:rgba(216,216,216,0)")) {
        return true;
    }

    const normalizedFill = String(rect.getAttribute("fill") || "")
        .replace(/\s+/g, "")
        .toLowerCase();
    if (normalizedFill === "rgba(216,216,216,0)" || normalizedFill === "transparent") {
        return true;
    }

    return false;
}

function computeMapElementExtents(elementIds) {
    if (!Array.isArray(elementIds) || !elementIds.length) {
        return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const elementId of elementIds) {
        const candidate = state.candidates.get(elementId);
        if (!candidate) {
            continue;
        }

        const box = safeBBox(candidate.element);
        if (!box) {
            continue;
        }

        if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) {
            continue;
        }

        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return null;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0 || height <= 0) {
        return null;
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width,
        height,
    };
}

function validateState() {
    const messages = [];

    if (!state.svgRoot) {
        messages.push("No SVG loaded.");
    }

    if (state.territories.size === 0) {
        messages.push("Add at least one territory.");
    }

    const codes = [];
    for (const t of state.territories.values()) {
        if (!t.code) {
            messages.push("Every territory needs a code.");
            break;
        }
        if (!t.name || !t.name.trim()) {
            messages.push("Every territory needs a display name.");
            break;
        }
        codes.push(t.code);
    }

    const dupes = findDuplicates(codes);
    if (dupes.length) {
        messages.push("Duplicate territory code(s): " + dupes.join(", "));
    }

    if (!sanitizeFolderName(refs.folderNameInput.value)) {
        messages.push("Folder name cannot be empty.");
    }

    const boundFields = [
        refs.boundsXMax.value,
        refs.boundsXMin.value,
        refs.boundsYMax.value,
        refs.boundsYMin.value,
    ];
    if (boundFields.some((value) => Number.isNaN(Number(value)))) {
        messages.push("Bounds values must be numeric.");
    }

    for (const edge of state.edges) {
        const [a, b] = edge.split("|");
        if (!state.territories.has(a) || !state.territories.has(b)) {
            messages.push("Moves must connect existing territories only.");
            break;
        }
    }

    return {
        ok: messages.length === 0,
        messages,
    };
}

function serializeExportSvg() {
    if (!state.svgRoot) {
        return "";
    }

    const clone = state.svgRoot.cloneNode(true);
    clone.setAttribute("id", "mapsvgbox");

    const territoryIds = new Set(state.territories.keys());

    for (const el of clone.querySelectorAll("[data-editor-id]")) {
        const id = el.getAttribute("data-editor-id");
        const sourceCandidate = state.candidates.get(id);

        el.classList.remove("editor-candidate", "is-selected", "is-territory", "is-hovered");
        el.removeAttribute("data-editor-id");

        if (sourceCandidate) {
            if (sourceCandidate.originalStyle === null || sourceCandidate.originalStyle === "") {
                el.removeAttribute("style");
            } else {
                el.setAttribute("style", sourceCandidate.originalStyle);
            }
        }

        sanitizeRotateSvgInlineStyle(el);

        if (territoryIds.has(id)) {
            const t = state.territories.get(id);
            el.setAttribute("data-code", t.code);
            el.classList.add("map-region", "map-element");
        } else {
            el.removeAttribute("data-code");
            el.classList.remove("map-region", "map-element");
        }
    }

    return new XMLSerializer().serializeToString(clone);
}

function writeTerritoryToElement(elementId) {
    const territory = state.territories.get(elementId);
    const candidate = state.candidates.get(elementId);

    if (!territory || !candidate) {
        return;
    }

    candidate.element.setAttribute("data-code", territory.code);
    candidate.element.classList.add("map-region", "map-element");
}

function removeTerritoryFromEdges(elementId) {
    for (const key of Array.from(state.edges)) {
        const [a, b] = key.split("|");
        if (a === elementId || b === elementId) {
            state.edges.delete(key);
        }
    }
}

function territoryLabel(elementId) {
    const t = state.territories.get(elementId);
    if (!t) {
        return elementId;
    }
    return t.code + " - " + t.name;
}

function sortedTerritoriesByCode() {
    return Array.from(state.territories.values()).sort((a, b) => {
        return a.code.localeCompare(b.code);
    });
}

function sortedTerritoriesByProximity(originElementId) {
    const territories = Array.from(state.territories.values()).filter((territory) => territory.elementId !== originElementId);
    const originCenter = getTerritoryCenterPoint(originElementId);

    if (!originCenter) {
        return territories.sort((a, b) => a.code.localeCompare(b.code));
    }

    const distanceById = new Map();
    for (const territory of territories) {
        const center = getTerritoryCenterPoint(territory.elementId);
        if (!center) {
            distanceById.set(territory.elementId, Number.POSITIVE_INFINITY);
            continue;
        }

        distanceById.set(territory.elementId, Math.hypot(center.x - originCenter.x, center.y - originCenter.y));
    }

    territories.sort((a, b) => {
        const distanceA = distanceById.get(a.elementId) ?? Number.POSITIVE_INFINITY;
        const distanceB = distanceById.get(b.elementId) ?? Number.POSITIVE_INFINITY;
        if (distanceA !== distanceB) {
            return distanceA - distanceB;
        }

        return a.code.localeCompare(b.code);
    });

    return territories;
}

function getTerritoryCenterPoint(elementId) {
    const candidate = state.candidates.get(elementId);
    if (!candidate) {
        return null;
    }

    const box = safeBBox(candidate.element);
    if (box) {
        return {
            x: box.x + (box.width / 2),
            y: box.y + (box.height / 2),
        };
    }

    return getTerritoryCenterInPreview(elementId);
}

function sortedEdgeEntries() {
    const entries = [];

    for (const key of state.edges) {
        const [idA, idB] = key.split("|");
        const tA = state.territories.get(idA);
        const tB = state.territories.get(idB);
        if (!tA || !tB) {
            continue;
        }

        const codeA = tA.code;
        const codeB = tB.code;
        const orderedCodes = codeA.localeCompare(codeB) <= 0 ? [codeA, codeB] : [codeB, codeA];
        entries.push({
            key,
            label: orderedCodes[0] + " <-> " + orderedCodes[1],
            asMove: orderedCodes[0] + " " + orderedCodes[1],
        });
    }

    entries.sort((a, b) => a.asMove.localeCompare(b.asMove));
    return entries;
}

function nextAvailableCode() {
    const used = new Set(Array.from(state.territories.values()).map((t) => t.code));
    let i = 1;
    while (i < 9999) {
        const code = "T" + i;
        if (!used.has(code)) {
            return code;
        }
        i += 1;
    }
    return "TERR";
}

function edgeKey(a, b) {
    return a < b ? a + "|" + b : b + "|" + a;
}

function restoreCandidateOriginalStyle(candidateEntry) {
    if (!candidateEntry || !candidateEntry.element) {
        return;
    }

    if (candidateEntry.originalStyle === null || candidateEntry.originalStyle === "") {
        candidateEntry.element.removeAttribute("style");
    } else {
        candidateEntry.element.setAttribute("style", candidateEntry.originalStyle);
    }
}

function sanitizeRotateSvgInlineStyle(element) {
    if (!element || !element.classList || !element.classList.contains("rotate-svg")) {
        return;
    }

    const sanitizedStyle = removeInlineStyleProperties(element.getAttribute("style"), ["transform-origin", "transform-box"]);
    if (sanitizedStyle) {
        element.setAttribute("style", sanitizedStyle);
    } else {
        element.removeAttribute("style");
    }
}

function removeInlineStyleProperties(styleText, propertyNames) {
    if (!styleText) {
        return "";
    }

    const blocked = new Set((propertyNames || []).map((name) => String(name || "").trim().toLowerCase()));
    const kept = [];

    for (const segment of String(styleText).split(";")) {
        const trimmedSegment = segment.trim();
        if (!trimmedSegment) {
            continue;
        }

        const separatorIndex = trimmedSegment.indexOf(":");
        if (separatorIndex <= 0) {
            kept.push(trimmedSegment);
            continue;
        }

        const propertyName = trimmedSegment.slice(0, separatorIndex).trim().toLowerCase();
        if (blocked.has(propertyName)) {
            continue;
        }

        kept.push(trimmedSegment);
    }

    return kept.join("; ");
}

function safeBBox(element) {
    try {
        return element.getBBox();
    } catch (error) {
        return null;
    }
}

function bboxDistance(a, b) {
    const ax2 = a.x + a.width;
    const ay2 = a.y + a.height;
    const bx2 = b.x + b.width;
    const by2 = b.y + b.height;

    const dx = Math.max(0, Math.max(a.x - bx2, b.x - ax2));
    const dy = Math.max(0, Math.max(a.y - by2, b.y - ay2));

    return Math.hypot(dx, dy);
}

function parseViewBox(viewBoxText) {
    if (!viewBoxText) {
        return null;
    }

    const parts = viewBoxText.trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) {
        return null;
    }

    return {
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3],
    };
}

function parseNumber(value, fallback) {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
}

function formatNumberForInput(value) {
    if (!Number.isFinite(value)) {
        return "";
    }

    const rounded = Math.round(value * 1000) / 1000;
    return String(rounded);
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeTerritoryColorKey(value) {
    const key = String(value || "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TERRITORY_COLOR_DATA, key)) {
        return key;
    }
    return "default";
}

function getTerritoryColor(colorKey, darken) {
    const key = normalizeTerritoryColorKey(colorKey);
    const record = TERRITORY_COLOR_DATA[key] || TERRITORY_COLOR_DATA.default;
    return darken ? record.darken : record.normal;
}

function normalizeCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

function sanitizeFolderName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "");
}

function setValidationStatus(message, isError) {
    refs.validationStatus.textContent = message;
    refs.validationStatus.classList.remove("status-ok", "status-error");
    refs.validationStatus.classList.add(isError ? "status-error" : "status-ok");
}

function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();

    for (const value of values) {
        if (seen.has(value)) {
            duplicates.add(value);
        }
        seen.add(value);
    }

    return Array.from(duplicates);
}

function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
