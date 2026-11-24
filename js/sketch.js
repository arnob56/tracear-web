(function () {
  "use strict";

  const MAX_UNDO_STEPS = 40;

  class SketchPadController {
    constructor(options) {
      this.displayCanvas = options.displayCanvas;
      this.container = options.container;
      this.emptyHint = options.emptyHint;
      this.onHistoryChange = options.onHistoryChange || function () {};

      this.inkCanvas = document.createElement("canvas");
      this.displayCtx = this.displayCanvas.getContext("2d");
      this.inkCtx = this.inkCanvas.getContext("2d", { willReadFrequently: true });

      this.tool = "pencil";
      this.brushSize = 8;
      this.color = "#14171C";
      this.underlaySource = null;
      this.showUnderlay = false;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cssWidth = 0;
      this.cssHeight = 0;

      this.undoStack = [];
      this.redoStack = [];
      this.hasAnyInk = false;

      this.activePointerId = null;
      this.points = [];

      this._bindEvents();
    }

    _bindEvents() {
      const c = this.displayCanvas;
      c.addEventListener("pointerdown", (e) => this._onPointerDown(e));
      c.addEventListener("pointermove", (e) => this._onPointerMove(e));
      c.addEventListener("pointerup", (e) => this._onPointerUp(e));
      c.addEventListener("pointercancel", (e) => this._onPointerUp(e));

      if (typeof ResizeObserver !== "undefined") {
        this._ro = new ResizeObserver(() => this.syncSize());
        this._ro.observe(this.container);
      } else {
        window.addEventListener("resize", () => this.syncSize());
      }
    }

    syncSize() {
      const rect = this.container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < 20 || h < 20) return;
      if (w === this.cssWidth && h === this.cssHeight) return;

      // Preserve existing ink across resizes
      let backup = null;
      if (this.inkCanvas.width > 0 && this.inkCanvas.height > 0 && this.hasAnyInk) {
        backup = document.createElement("canvas");
        backup.width = this.inkCanvas.width;
        backup.height = this.inkCanvas.height;
        backup.getContext("2d").drawImage(this.inkCanvas, 0, 0);
      }

      this.cssWidth = w;
      this.cssHeight = h;
      const pw = Math.round(w * this.dpr);
      const ph = Math.round(h * this.dpr);

      this.displayCanvas.width = pw;
      this.displayCanvas.height = ph;
      this.inkCanvas.width = pw;
      this.inkCanvas.height = ph;

      if (backup) {
        this.inkCtx.drawImage(backup, 0, 0, pw, ph);
      }

      this.renderComposite();
    }

    setReferenceUnderlay(sourceCanvas) {
      this.underlaySource = sourceCanvas || null;
      this.renderComposite();
    }

    setShowUnderlay(visible) {
      this.showUnderlay = Boolean(visible);
      this.renderComposite();
    }

    setTool(tool) {
      this.tool = tool === "eraser" ? "eraser" : "pencil";
    }

    setBrushSize(size) {
      this.brushSize = Number(size) || 8;
    }

    setColor(hex) {
      this.color = hex;
      this.tool = "pencil";
    }

    canUndo() {
      return this.undoStack.length > 0;
    }

    canRedo() {
      return this.redoStack.length > 0;
    }

    isEmpty() {
      return !this.hasAnyInk;
    }

    _pushUndoSnapshot() {
      if (this.inkCanvas.width === 0 || this.inkCanvas.height === 0) return;
      const snap = this.inkCtx.getImageData(0, 0, this.inkCanvas.width, this.inkCanvas.height);
      this.undoStack.push({ imageData: snap, hadInk: this.hasAnyInk });
      if (this.undoStack.length > MAX_UNDO_STEPS) {
        this.undoStack.shift();
      }
      this.redoStack.length = 0;
    }

    undo() {
      if (!this.canUndo()) return;
      const current = this.inkCtx.getImageData(0, 0, this.inkCanvas.width, this.inkCanvas.height);
      this.redoStack.push({ imageData: current, hadInk: this.hasAnyInk });

      const prev = this.undoStack.pop();
      this.inkCtx.putImageData(prev.imageData, 0, 0);
      this.hasAnyInk = prev.hadInk;
      this.renderComposite();
      this._notifyHistory();
    }

    redo() {
      if (!this.canRedo()) return;
      const current = this.inkCtx.getImageData(0, 0, this.inkCanvas.width, this.inkCanvas.height);
      this.undoStack.push({ imageData: current, hadInk: this.hasAnyInk });

      const next = this.redoStack.pop();
      this.inkCtx.putImageData(next.imageData, 0, 0);
      this.hasAnyInk = next.hadInk;
      this.renderComposite();
      this._notifyHistory();
    }

    clear() {
      if (!this.hasAnyInk) return;
      this._pushUndoSnapshot();
      this.inkCtx.clearRect(0, 0, this.inkCanvas.width, this.inkCanvas.height);
      this.hasAnyInk = false;
      this.renderComposite();
      this._notifyHistory();
    }

    _localPoint(e) {
      const rect = this.displayCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * this.dpr,
        y: (e.clientY - rect.top) * this.dpr
      };
    }

    _onPointerDown(e) {
      if (this.activePointerId !== null) return;
      if (this.cssWidth === 0) this.syncSize();

      this.activePointerId = e.pointerId;
      this.displayCanvas.setPointerCapture(e.pointerId);
      this._pushUndoSnapshot();

      const pt = this._localPoint(e);
      this.points = [pt];
      this.hasAnyInk = true;
      this._drawIncrementalSegment(true);
      this.renderComposite();
      this._notifyHistory();
    }

    _onPointerMove(e) {
      if (e.pointerId !== this.activePointerId) return;
      const pt = this._localPoint(e);
      const last = this.points[this.points.length - 1];
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < 2.2) return;

      this.points.push(pt);
      this._drawIncrementalSegment(false);
      this.renderComposite();
    }

    _onPointerUp(e) {
      if (e.pointerId !== this.activePointerId) return;
      try {
        this.displayCanvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
      this.activePointerId = null;
      this.points = [];
      this._notifyHistory();
    }

    _drawIncrementalSegment(isDot) {
      const ctx = this.inkCtx;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const width = (this.tool === "eraser" ? this.brushSize * 1.65 : this.brushSize) * this.dpr;
      ctx.lineWidth = width;

      if (this.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
      }

      const len = this.points.length;
      if (isDot || len === 1) {
        const p = this.points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, width * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (len === 2) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.stroke();
      } else {
        const p0 = this.points[len - 3];
        const p1 = this.points[len - 2];
        const p2 = this.points[len - 1];
        const mid1 = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
        const mid2 = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    renderComposite() {
      const w = this.displayCanvas.width;
      const h = this.displayCanvas.height;
      if (w === 0 || h === 0) return;

      const ctx = this.displayCtx;
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      if (this.showUnderlay && this.underlaySource) {
        const fit = computeAspectFit(
          this.underlaySource.width,
          this.underlaySource.height,
          w,
          h,
          24 * this.dpr
        );
        ctx.globalAlpha = 0.24;
        ctx.drawImage(this.underlaySource, fit.x, fit.y, fit.w, fit.h);
        ctx.globalAlpha = 1.0;
      }

      ctx.drawImage(this.inkCanvas, 0, 0);
      ctx.restore();

      if (this.emptyHint) {
        this.emptyHint.hidden = this.hasAnyInk || (this.showUnderlay && Boolean(this.underlaySource));
      }
    }

    exportPNGBlob() {
      if (this.cssWidth === 0) this.syncSize();
      this.renderComposite();
      return new Promise((resolve) => {
        this.displayCanvas.toBlob((blob) => resolve(blob), "image/png");
      });
    }

    _notifyHistory() {
      this.onHistoryChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        isEmpty: this.isEmpty()
      });
    }
  }

  function computeAspectFit(srcW, srcH, dstW, dstH, pad) {
    const availW = Math.max(10, dstW - pad * 2);
    const availH = Math.max(10, dstH - pad * 2);
    const scale = Math.min(availW / srcW, availH / srcH);
    const w = srcW * scale;
    const h = srcH * scale;
    return {
      x: (dstW - w) * 0.5,
      y: (dstH - h) * 0.5,
      w: w,
      h: h
    };
  }

  window.TraceARSketchPad = SketchPadController;
})();
