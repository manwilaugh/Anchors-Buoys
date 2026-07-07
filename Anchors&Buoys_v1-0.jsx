/**
 * Anchors & Buoys - Custom Layer Positioning Tool (v3)
 * After Effects CC 2021+
 *
 * v3.4
 * - FIX: expanding "Notes on Auto Enforce" now actually shows the text.
 *   (ScriptUI multiline statictext only renders at creation, so the notes
 *   are now created/destroyed on toggle rather than resized.)
 * - Notes height adapts to panel width so nothing clips when docked narrow
 * All v2 logic (undo-safe enforcement, comment preservation, locked-layer
 * handling, task cleanup) is unchanged.
 */

(function (thisObj) {

    // -----------------------------
    // Constants
    // -----------------------------
    var MARK_ANCHORED = "anchored";
    var MARK_BUOYANT  = "buoyant";

    var LABEL_BLUE   = 9;
    var LABEL_YELLOW = 4;

    var AUTO_INTERVAL_MS = 500;

    var TAG_REGEX    = /\[CLP:(anchored|buoyant):(-?\d+)\]\s*/;
    var LEGACY_REGEX = /^(anchored|buoyant)\|(-?\d+)$/;

    // UI palette (RGB 0-1)
    var COL_BUOYANT      = [0.95, 0.78, 0.14];  // yellow
    var COL_BUOYANT_HOV  = [1.00, 0.85, 0.25];
    var COL_ANCHORED     = [0.25, 0.50, 0.90];  // blue
    var COL_ANCHORED_HOV = [0.35, 0.60, 1.00];
    var COL_SECONDARY    = [0.28, 0.28, 0.28];  // dark grey
    var COL_SECONDARY_HOV= [0.36, 0.36, 0.36];
    var COL_TEXT_DARK    = [0.10, 0.10, 0.10];
    var COL_TEXT_LIGHT   = [0.92, 0.92, 0.92];
    var COL_TEXT_MUTED   = [0.55, 0.55, 0.55];
    var COL_DOT_ON       = [0.30, 0.80, 0.35];
    var COL_DOT_OFF      = [0.45, 0.45, 0.45];

    // -----------------------------
    // Core logic (unchanged from v2)
    // -----------------------------

    function parseComment(layer) {
        var info = { mark: null, originalLabel: null, userComment: "" };
        if (!layer) return info;

        var c = (layer.comment !== null && layer.comment !== undefined) ? ("" + layer.comment) : "";
        if (!c) return info;

        var m = c.match(TAG_REGEX);
        if (m) {
            info.mark = m[1];
            info.originalLabel = parseInt(m[2], 10);
            info.userComment = c.replace(TAG_REGEX, "");
            return info;
        }

        var lm = c.toLowerCase().match(LEGACY_REGEX);
        if (lm) {
            info.mark = lm[1];
            info.originalLabel = parseInt(lm[2], 10);
            return info;
        }

        info.userComment = c;
        return info;
    }

    function safeSetComment(layer, value) {
        if (layer.comment !== value) layer.comment = value;
    }
    function safeSetLabel(layer, value) {
        if (layer.label !== value) layer.label = value;
    }

    function setLayerMark(layer, type) {
        if (!layer) return;

        var parsed = parseComment(layer);
        var originalLabel = (parsed.originalLabel !== null) ? parsed.originalLabel : layer.label;

        if (type === MARK_ANCHORED || type === MARK_BUOYANT) {
            var tag = "[CLP:" + type + ":" + originalLabel + "]";
            var newComment = parsed.userComment ? (tag + " " + parsed.userComment) : tag;
            safeSetComment(layer, newComment);
            safeSetLabel(layer, (type === MARK_ANCHORED) ? LABEL_BLUE : LABEL_YELLOW);
        } else {
            if (parsed.originalLabel !== null) safeSetLabel(layer, parsed.originalLabel);
            safeSetComment(layer, parsed.userComment);
        }
    }

    function buildTargetState(comp) {
        var buoyant = [], neutral = [], anchored = [];
        var labelFixes = [];

        for (var i = 1; i <= comp.numLayers; i++) {
            var lyr = comp.layer(i);
            var info = parseComment(lyr);

            if (info.mark === MARK_BUOYANT) {
                buoyant.push(lyr);
                if (lyr.label !== LABEL_YELLOW) labelFixes.push({ layer: lyr, label: LABEL_YELLOW });
            } else if (info.mark === MARK_ANCHORED) {
                anchored.push(lyr);
                if (lyr.label !== LABEL_BLUE) labelFixes.push({ layer: lyr, label: LABEL_BLUE });
            } else {
                neutral.push(lyr);
            }
        }
        return { order: buoyant.concat(neutral).concat(anchored), labelFixes: labelFixes };
    }

    function isCurrentOrder(comp, target) {
        if (comp.numLayers !== target.length) return false;
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i) !== target[i - 1]) return false;
        }
        return true;
    }

    function applyOrder(target) {
        for (var i = target.length - 1; i >= 0; i--) {
            var lyr = target[i];
            var wasLocked = lyr.locked;
            if (wasLocked) lyr.locked = false;
            try {
                lyr.moveToBeginning();
            } finally {
                if (wasLocked) lyr.locked = true;
            }
        }
    }

    function enforceActiveComp() {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;

        var state = buildTargetState(comp);
        var orderWrong = !isCurrentOrder(comp, state.order);
        if (!orderWrong && state.labelFixes.length === 0) return;

        app.beginUndoGroup("Enforce Layer Groups");
        try {
            for (var i = 0; i < state.labelFixes.length; i++) {
                state.labelFixes[i].layer.label = state.labelFixes[i].label;
            }
            if (orderWrong) applyOrder(state.order);
        } finally {
            app.endUndoGroup();
        }
    }

    function clearFlagsSelected() {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;
        if (comp.selectedLayers.length === 0) return;

        app.beginUndoGroup("Clear Flags (Selected)");
        try {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                setLayerMark(comp.selectedLayers[i], null);
            }
        } finally {
            app.endUndoGroup();
        }
        enforceActiveComp();
    }

    function clearFlagsAll() {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;

        app.beginUndoGroup("Clear Flags (All)");
        try {
            for (var i = 1; i <= comp.numLayers; i++) {
                setLayerMark(comp.layer(i), null);
            }
        } finally {
            app.endUndoGroup();
        }
        enforceActiveComp();
    }

    function applyMarkToSelected(mark) {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;
        if (comp.selectedLayers.length === 0) return;

        app.beginUndoGroup("Set Layer Mark");
        try {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                setLayerMark(comp.selectedLayers[i], mark);
            }
        } finally {
            app.endUndoGroup();
        }
        enforceActiveComp();
    }

    function stopAuto() {
        if ($.global.__CLP_taskId !== undefined && $.global.__CLP_taskId !== -1) {
            try { app.cancelTask($.global.__CLP_taskId); } catch (e) {}
        }
        $.global.__CLP_taskId = -1;
    }

    function startAuto() {
        stopAuto();
        $.global.__CLP_tick = function () {
            try { enforceActiveComp(); } catch (e) {}
        };
        $.global.__CLP_taskId = app.scheduleTask("__CLP_tick()", AUTO_INTERVAL_MS, true);
    }

    // -----------------------------
    // UI helpers
    // -----------------------------

    // Flat, colour-filled button drawn with onDraw.
    // Hover brightens; pressed darkens slightly.
    function makeFlatButton(parent, label, size, colNormal, colHover, colText) {
        var btn = parent.add("button", undefined, label);
        btn.preferredSize = size;

        btn.onDraw = function (drawState) {
            var g = this.graphics;
            var w = this.size.width;
            var h = this.size.height;

            var fill = colNormal;
            if (drawState.mouseOver) fill = colHover;
            if (drawState.leftButtonPressed) {
                fill = [colNormal[0] * 0.8, colNormal[1] * 0.8, colNormal[2] * 0.8];
            }

            g.newPath();
            g.rectPath(0, 0, w, h);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, fill));

            var font = ScriptUI.newFont("Tahoma", "BOLD", 12);
            var textSize = g.measureString(this.text, font, w);
            var tx = (w - textSize.width) / 2;
            var ty = (h - textSize.height) / 2;
            g.drawString(this.text, g.newPen(g.PenType.SOLID_COLOR, colText, 1), tx, ty, font);
        };
        return btn;
    }

    // Small circle status indicator drawn in a custom group
    function makeStatusDot(parent) {
        var dot = parent.add("customview", undefined);
        dot.preferredSize = [12, 12];
        dot.isOn = true;

        dot.onDraw = function () {
            var g = this.graphics;
            var col = this.isOn ? COL_DOT_ON : COL_DOT_OFF;
            g.newPath();
            g.ellipsePath(1, 1, 10, 10);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, col));
        };
        return dot;
    }

    // -----------------------------
    // UI
    // -----------------------------
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Anchors & Buoys", undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 0;
        win.margins = 14;

        // --- Header ---
        var header = win.add("group");
        header.orientation = "column";
        header.alignChildren = ["left", "top"];
        header.spacing = 2;
        header.margins = [0, 0, 0, 10];

        var title = header.add("statictext", undefined, "ANCHORS & BUOYS");
        title.graphics.font = ScriptUI.newFont("Tahoma", "BOLD", 13);

        var subtitle = header.add("statictext", undefined, "Layer stack positioning");
        subtitle.graphics.font = ScriptUI.newFont("Tahoma", "REGULAR", 10);
        subtitle.graphics.foregroundColor = subtitle.graphics.newPen(
            subtitle.graphics.PenType.SOLID_COLOR, COL_TEXT_MUTED, 1);

        // --- Primary actions ---
        var actions = win.add("group");
        actions.orientation = "column";
        actions.alignChildren = ["fill", "top"];
        actions.spacing = 6;
        actions.margins = [0, 0, 0, 12];

        var btnBuoyant = makeFlatButton(actions, "MAKE BUOYANT  (TO TOP)",
            [180, 34], COL_BUOYANT, COL_BUOYANT_HOV, COL_TEXT_DARK);
        var btnAnchored = makeFlatButton(actions, "MAKE ANCHORED  (TO BOTTOM)",
            [180, 34], COL_ANCHORED, COL_ANCHORED_HOV, COL_TEXT_LIGHT);

        // --- Secondary actions ---
        var secondary = win.add("group");
        secondary.orientation = "row";
        secondary.alignChildren = ["fill", "center"];
        secondary.spacing = 6;
        secondary.margins = [0, 0, 0, 12];

        var btnClearSel = makeFlatButton(secondary, "Clear Selected",
            [86, 26], COL_SECONDARY, COL_SECONDARY_HOV, COL_TEXT_LIGHT);
        var btnClearAll = makeFlatButton(secondary, "Clear All",
            [86, 26], COL_SECONDARY, COL_SECONDARY_HOV, COL_TEXT_LIGHT);

        // --- Auto enforce row ---
        var autoRow = win.add("group");
        autoRow.orientation = "row";
        autoRow.alignChildren = ["left", "center"];
        autoRow.spacing = 8;
        autoRow.margins = [0, 0, 0, 10];

        var dot = makeStatusDot(autoRow);
        var autoChk = autoRow.add("checkbox", undefined, "Auto Enforce");
        autoChk.graphics.font = ScriptUI.newFont("Tahoma", "REGULAR", 11);

        // --- Collapsible info section ---
        var HELP_TEXT =
            "Auto Enforce polls the active comp every 0.5s. In larger projects, " +
            "or when running alongside other scripts, expressions-heavy comps or " +
            "background renders, this polling can add overhead or conflict with " +
            "other processes. If AE slows down or layers behave unexpectedly, " +
            "toggle Auto Enforce off, make your changes, then re-enable it to " +
            "re-sort the stack.";

        var helpToggle = win.add("button", undefined, "");
        helpToggle.preferredSize = [180, 18];
        helpToggle.isOpen = false;
        helpToggle.onDraw = function () {
            var g = this.graphics;
            var font = ScriptUI.newFont("Tahoma", "REGULAR", 10);
            var label = (this.isOpen ? "\u25BE " : "\u25B8 ") + "Notes on Auto Enforce";
            g.drawString(label, g.newPen(g.PenType.SOLID_COLOR, COL_TEXT_MUTED, 1), 0, 2, font);
        };

        // Container for the help text. The statictext itself is created and
        // destroyed on each toggle: ScriptUI multiline statictext only wraps
        // and renders its text at creation time, so resizing a hidden one
        // leaves it permanently blank. Recreating it forces a fresh render.
        var helpGroup = win.add("group");
        helpGroup.orientation = "column";
        helpGroup.alignChildren = ["fill", "top"];
        helpGroup.spacing = 0;
        helpGroup.margins = 0;

        var helpText = null;

        function setHelpVisible(open) {
            helpToggle.isOpen = open;

            if (helpText) {
                helpGroup.remove(helpText);
                helpText = null;
            }

            if (open) {
                // Wrap width follows the current panel width where possible
                var wrapW = 180;
                try {
                    if (win.size && win.size.width > 60) {
                        wrapW = Math.max(160, win.size.width - 32);
                    }
                } catch (e) {}

                helpText = helpGroup.add("statictext", undefined, HELP_TEXT, { multiline: true });
                // Rough line estimate so narrow panels get enough height
                var charsPerLine = Math.max(20, Math.floor(wrapW / 5));
                var lines = Math.ceil(HELP_TEXT.length / charsPerLine) + 1;
                helpText.preferredSize = [wrapW, lines * 12 + 4];
                helpText.graphics.font = ScriptUI.newFont("Tahoma", "REGULAR", 9);
                helpText.graphics.foregroundColor = helpText.graphics.newPen(
                    helpText.graphics.PenType.SOLID_COLOR, COL_TEXT_MUTED, 1);
            }

            helpToggle.notify("onDraw");
            win.layout.layout(true);
            win.layout.resize();
        }

        helpToggle.onClick = function () {
            setHelpVisible(!helpToggle.isOpen);
        };

        // --- Wiring ---
        btnBuoyant.onClick  = function () { applyMarkToSelected(MARK_BUOYANT); };
        btnAnchored.onClick = function () { applyMarkToSelected(MARK_ANCHORED); };
        btnClearSel.onClick = clearFlagsSelected;
        btnClearAll.onClick = clearFlagsAll;

        autoChk.onClick = function () {
            if (autoChk.value) startAuto(); else stopAuto();
            dot.isOn = autoChk.value;
            dot.notify("onDraw");
        };

        // Default: Auto Enforce ON
        autoChk.value = true;
        dot.isOn = true;
        startAuto();

        // Default: help collapsed
        setHelpVisible(false);

        // --- Responsive breakpoint ---
        // ScriptUI has no fluid reflow, so we fake a media query: below
        // STACK_BREAKPOINT px wide, the Clear buttons stack vertically.
        var STACK_BREAKPOINT = 220;
        var isStacked = false;

        function applyBreakpoint(width) {
            var shouldStack = (width > 0 && width < STACK_BREAKPOINT);
            if (shouldStack === isStacked) return false;
            isStacked = shouldStack;
            secondary.orientation = shouldStack ? "column" : "row";
            secondary.alignChildren = shouldStack ? ["fill", "top"] : ["fill", "center"];
            // Shorter labels when narrow so the text doesn't clip
            btnBuoyant.text  = shouldStack ? "MAKE BUOYANT"  : "MAKE BUOYANT  (TO TOP)";
            btnAnchored.text = shouldStack ? "MAKE ANCHORED" : "MAKE ANCHORED  (TO BOTTOM)";
            return true;
        }

        win.onResizing = win.onResize = function () {
            try {
                var w = (this.size) ? this.size.width : 0;
                if (applyBreakpoint(w)) {
                    this.layout.layout(true);
                }
                this.layout.resize();
            } catch (e) {}
        };

        if (win instanceof Window) {
            win.onClose = function () { stopAuto(); };
        }

        win.layout.layout(true);
        return win;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    }

})(this);
