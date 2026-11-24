(function () {
  "use strict";

  const STORAGE_KEYS = {
    onboarded: "tracear_onboarded_v1",
    wakeLock: "tracear_wakelock_v1"
  };

  const ONBOARDING_STEPS = [
    {
      title: "1. Rest Phone on a Stand",
      body: "Prop your iPhone 20–30 cm above your sketch paper using a clear glass, tall mug, stack of books, or phone stand.",
      tip: "Turn on a desk lamp so your paper and pencil tip stay sharp.",
      svgPath: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/>'
    },
    {
      title: "2. Position & Lock Your Guide",
      body: "Import a photo, paste from clipboard, or pick a geometric guide. Drag, pinch, or twist to fit your paper, then tap Lock Position.",
      tip: "Once locked, accidental wrist or finger touches won't shift your image.",
      svgPath: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
    },
    {
      title: "3. Trace Offline with Zero Ads",
      body: "Adjust opacity or switch to Outline mode so only clean ink contours float over your paper. Tap Share → Add to Home Screen in Safari for full-screen offline use.",
      tip: "You can switch to Sketch Pad anytime to practice directly on screen.",
      svgPath: '<path d="M4 20c4-1 8-7 11-11a2.8 2.8 0 1 0-4-4C7 8 4 16 4 20z"/>'
    }
  ];

  // App State
  const state = {
    mode: "trace", // "trace" | "sketch"
    stream: null,
    cameraActive: false,
    sourceCanvas: null,
    isLocked: false,
    showGrid: false,
    mirrorX: false,
    wakeLockEnabled: localStorage.getItem(STORAGE_KEYS.wakeLock) !== "false",
    wakeLockSentinel: null,
    isLowLight: false,
    lowLightDismissed: false,
    onboardingIndex: 0,
    filters: {
      opacity: 0.55,
      outline: false,
      grayscale: false,
      invert: false
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1.0,
      rotationDeg: 0
    }
  };

  // DOM Elements
  const els = {
    traceView: document.getElementById("traceView"),
    sketchView: document.getElementById("sketchView"),
    modeTraceBtn: document.getElementById("modeTraceBtn"),
    modeSketchBtn: document.getElementById("modeSketchBtn"),

    cameraStage: document.getElementById("cameraStage"),
    cameraVideo: document.getElementById("cameraVideo"),
    gridOverlay: document.getElementById("gridOverlay"),
    referenceStage: document.getElementById("referenceStage"),
    referenceCanvas: document.getElementById("referenceCanvas"),

    cameraFallback: document.getElementById("cameraFallback"),
    cameraFallbackTitle: document.getElementById("cameraFallbackTitle"),
    cameraFallbackDesc: document.getElementById("cameraFallbackDesc"),
    retryCameraBtn: document.getElementById("retryCameraBtn"),
    fallbackToSketchBtn: document.getElementById("fallbackToSketchBtn"),

    emptyReferenceCard: document.getElementById("emptyReferenceCard"),
    quickFileInput: document.getElementById("quickFileInput"),
    openSamplesEmptyBtn: document.getElementById("openSamplesEmptyBtn"),
    pasteEmptyBtn: document.getElementById("pasteEmptyBtn"),

    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    openPickerBtn: document.getElementById("openPickerBtn"),
    toggleGridBtn: document.getElementById("toggleGridBtn"),
    snapshotBtn: document.getElementById("snapshotBtn"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),

    alertBanner: document.getElementById("alertBanner"),
    alertTitle: document.getElementById("alertTitle"),
    alertMessage: document.getElementById("alertMessage"),
    alertActionBtn: document.getElementById("alertActionBtn"),
    alertDismissBtn: document.getElementById("alertDismissBtn"),
    toastPill: document.getElementById("toastPill"),

    traceControlDeck: document.getElementById("traceControlDeck"),
    lockToggleBtn: document.getElementById("lockToggleBtn"),
    lockIconUnlocked: document.getElementById("lockIconUnlocked"),
    lockIconLocked: document.getElementById("lockIconLocked"),
    lockBtnLabel: document.getElementById("lockBtnLabel"),
    scaleDownBtn: document.getElementById("scaleDownBtn"),
    scaleUpBtn: document.getElementById("scaleUpBtn"),
    scaleReadout: document.getElementById("scaleReadout"),
    rotateRightBtn: document.getElementById("rotateRightBtn"),
    resetTransformBtn: document.getElementById("resetTransformBtn"),

    opacitySlider: document.getElementById("opacitySlider"),
    opacityValue: document.getElementById("opacityValue"),
    filterOutlineBtn: document.getElementById("filterOutlineBtn"),
    filterGrayBtn: document.getElementById("filterGrayBtn"),
    filterInvertBtn: document.getElementById("filterInvertBtn"),

    // Sketch Pad DOM
    sketchPaperWrap: document.getElementById("sketchPaperWrap"),
    sketchDisplayCanvas: document.getElementById("sketchDisplayCanvas"),
    sketchEmptyHint: document.getElementById("sketchEmptyHint"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    clearSketchBtn: document.getElementById("clearSketchBtn"),
    underlayToggleBtn: document.getElementById("underlayToggleBtn"),
    saveSketchBtn: document.getElementById("saveSketchBtn"),
    shareSketchBtn: document.getElementById("shareSketchBtn"),
    openSettingsFromSketchBtn: document.getElementById("openSettingsFromSketchBtn"),
    toolPencilBtn: document.getElementById("toolPencilBtn"),
    toolEraserBtn: document.getElementById("toolEraserBtn"),
    sizeSelector: document.getElementById("sizeSelector"),
    colorSwatches: document.getElementById("colorSwatches"),

    // Dialogs & Onboarding
    pickerDialog: document.getElementById("pickerDialog"),
    closePickerBtn: document.getElementById("closePickerBtn"),
    sheetFileInput: document.getElementById("sheetFileInput"),
    sheetPasteBtn: document.getElementById("sheetPasteBtn"),
    sampleGrid: document.getElementById("sampleGrid"),

    settingsDialog: document.getElementById("settingsDialog"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    wakeLockToggle: document.getElementById("wakeLockToggle"),
    mirrorCameraToggle: document.getElementById("mirrorCameraToggle"),
    replayOnboardingBtn: document.getElementById("replayOnboardingBtn"),
    resetAllBtn: document.getElementById("resetAllBtn"),

    onboardingModal: document.getElementById("onboardingModal"),
    onboardingDots: document.getElementById("onboardingDots"),
    onboardingSvg: document.getElementById("onboardingSvg"),
    onboardingStepTitle: document.getElementById("onboardingStepTitle"),
    onboardingStepBody: document.getElementById("onboardingStepBody"),
    onboardingStepTip: document.getElementById("onboardingStepTip"),
    skipOnboardingBtn: document.getElementById("skipOnboardingBtn"),
    nextOnboardingBtn: document.getElementById("nextOnboardingBtn")
  };

  let alertActionCallback = null;
  let toastTimer = null;
  let lightProbeTimer = null;
  const lightProbeCanvas = document.createElement("canvas");
  lightProbeCanvas.width = 32;
  lightProbeCanvas.height = 24;
  const lightProbeCtx = lightProbeCanvas.getContext("2d", { willReadFrequently: true });

  // Initialize Sketch Pad
  const sketchPad = new window.TraceARSketchPad({
    displayCanvas: els.sketchDisplayCanvas,
    container: els.sketchPaperWrap,
    emptyHint: els.sketchEmptyHint,
    onHistoryChange: function (info) {
      els.undoBtn.disabled = !info.canUndo;
      els.redoBtn.disabled = !info.canRedo;
      els.clearSketchBtn.disabled = info.isEmpty;
    }
  });

  // ==================== CAMERA LIFECYCLE ====================

  async function startCamera() {
    if (state.mode !== "trace") return;
    if (state.stream && state.cameraActive) return;

    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraFallback(
        "HTTPS Required for Camera",
        "iOS Safari only enables the live camera over HTTPS (such as your GitHub Pages link) or localhost. You can still draw in Sketch Pad."
      );
      setStatus("Camera Unavailable", "err");
      return;
    }

    setStatus("Starting Camera", "warn");
    els.cameraFallback.hidden = true;

    const constraintAttempts = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 }
        }
      },
      {
        audio: false,
        video: { facingMode: "environment" }
      },
      {
        audio: false,
        video: true
      }
    ];

    let acquired = null;
    let lastErr = null;
    for (let i = 0; i < constraintAttempts.length; i++) {
      try {
        acquired = await navigator.mediaDevices.getUserMedia(constraintAttempts[i]);
        break;
      } catch (err) {
        lastErr = err;
        if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
          break;
        }
      }
    }

    if (!acquired) {
      const denied = lastErr && (lastErr.name === "NotAllowedError" || lastErr.name === "PermissionDeniedError");
      showCameraFallback(
        denied ? "Camera Permission Denied" : "Camera Not Available",
        denied
          ? "Tap the 'aA' or site settings icon in Safari's address bar (or Settings → Safari → Camera) to allow camera access, then tap Enable Camera."
          : "Couldn't open a camera on this device. Switch to Sketch Pad to draw offline."
      );
      setStatus(denied ? "Permission Denied" : "No Camera", "err");
      return;
    }

    state.stream = acquired;
    state.cameraActive = true;
    els.cameraVideo.srcObject = acquired;
    try {
      await els.cameraVideo.play();
    } catch (_) {}

    refreshStatusPill();
    startAmbientLightMonitor();
    syncWakeLock();
  }

  function stopCamera() {
    stopAmbientLightMonitor();
    if (state.stream) {
      state.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      state.stream = null;
    }
    state.cameraActive = false;
    els.cameraVideo.srcObject = null;
  }

  function showCameraFallback(title, desc) {
    els.cameraFallbackTitle.textContent = title;
    els.cameraFallbackDesc.textContent = desc;
    els.cameraFallback.hidden = false;
  }

  function setStatus(label, level) {
    els.statusText.textContent = label;
    els.statusDot.className = "status-dot status-dot--" + level;
  }

  function refreshStatusPill() {
    if (!state.cameraActive) {
      setStatus("Camera Paused", "warn");
      return;
    }
    if (state.isLocked && state.sourceCanvas) {
      setStatus(state.isLowLight ? "Locked · Low Light" : "Position Locked", state.isLowLight ? "warn" : "ok");
    } else if (state.isLowLight) {
      setStatus("Low Light", "warn");
    } else {
      setStatus("Camera Ready", "ok");
    }
  }

  // ==================== AMBIENT LIGHT HYSTERESIS ====================

  function startAmbientLightMonitor() {
    stopAmbientLightMonitor();
    lightProbeTimer = window.setInterval(function () {
      if (!state.cameraActive || els.cameraVideo.readyState < 2) return;
      try {
        lightProbeCtx.drawImage(els.cameraVideo, 0, 0, 32, 24);
        const data = lightProbeCtx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        const pixels = 32 * 24;
        for (let i = 0; i < data.length; i += 4) {
          sum += (77 * data[i] + 150 * data[i + 1] + 29 * data[i + 2]) >> 8;
        }
        const avg = sum / pixels;

        if (!state.isLowLight && avg < 46) {
          state.isLowLight = true;
          refreshStatusPill();
          if (!state.lowLightDismissed) {
            showAlert(
              "Low Light Detected",
              "Turn on a desk lamp over your sketch paper so your pencil lines stay clearly visible through the overlay.",
              null,
              null
            );
          }
        } else if (state.isLowLight && avg > 64) {
          state.isLowLight = false;
          state.lowLightDismissed = false;
          refreshStatusPill();
          if (els.alertTitle.textContent === "Low Light Detected") {
            hideAlert();
          }
        }
      } catch (_) {}
    }, 1600);
  }

  function stopAmbientLightMonitor() {
    if (lightProbeTimer) {
      clearInterval(lightProbeTimer);
      lightProbeTimer = null;
    }
  }

  // ==================== SCREEN WAKE LOCK ====================

  async function syncWakeLock() {
    const shouldHold = state.wakeLockEnabled && state.mode === "trace" && !document.hidden;
    if (!shouldHold) {
      if (state.wakeLockSentinel) {
        try {
          await state.wakeLockSentinel.release();
        } catch (_) {}
        state.wakeLockSentinel = null;
      }
      return;
    }

    if ("wakeLock" in navigator && !state.wakeLockSentinel) {
      try {
        state.wakeLockSentinel = await navigator.wakeLock.request("screen");
        state.wakeLockSentinel.addEventListener("release", function () {
          state.wakeLockSentinel = null;
        });
      } catch (_) {}
    }
  }

  // ==================== REFERENCE IMPORT & FILTERS ====================

  function loadReferenceFromImageSource(imgOrCanvas, label) {
    try {
      const normalized = window.TraceARFilters.normalizeSource(imgOrCanvas);
      state.sourceCanvas = normalized;
      state.isLocked = false;
      resetTransformState();
      applyFiltersAndRender();

      els.emptyReferenceCard.hidden = true;
      els.referenceStage.hidden = false;
      els.traceControlDeck.hidden = false;
      els.underlayToggleBtn.hidden = false;

      sketchPad.setReferenceUnderlay(normalized);
      syncLockUI();
      refreshStatusPill();
      pulseHaptic(12);
      if (label) showToast(label);
    } catch (err) {
      showAlert(
        "Couldn't Load Image",
        "That image format couldn't be decoded. Try another photo or select a built-in geometric guide.",
        "Open Samples",
        function () {
          openDialog(els.pickerDialog);
        }
      );
    }
  }

  function handleFileSelected(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      loadReferenceFromImageSource(img, "Photo loaded");
      closeDialog(els.pickerDialog);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      showAlert(
        "Photo Import Failed",
        "Safari couldn't read that file. Pick a JPEG/PNG/HEIC photo or use a built-in guide.",
        "Open Samples",
        function () {
          openDialog(els.pickerDialog);
        }
      );
    };
    img.src = url;
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      showAlert(
        "Clipboard Paste Unavailable",
        "Your browser restricts direct clipboard reading here. Choose from Photos or select a built-in sample guide instead.",
        "Choose Photo",
        function () {
          els.quickFileInput.click();
        }
      );
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const imgType = item.types.find(function (t) {
          return t.startsWith("image/");
        });
        if (imgType) {
          const blob = await item.getType(imgType);
          handleFileSelected(blob);
          showToast("Pasted from clipboard");
          return;
        }
      }
      showAlert(
        "No Image on Clipboard",
        "Copy an image from Photos or Safari first, then tap Paste again.",
        "Use Sample",
        function () {
          openDialog(els.pickerDialog);
        }
      );
    } catch (_) {
      showAlert(
        "Clipboard Access Declined",
        "Allow Paste when Safari asks, or import your image directly from Photos.",
        "Open Samples",
        function () {
          openDialog(els.pickerDialog);
        }
      );
    }
  }

  function applyFiltersAndRender() {
    if (!state.sourceCanvas) return;
    window.TraceARFilters.renderFiltered(state.sourceCanvas, els.referenceCanvas, state.filters);
    els.referenceCanvas.style.opacity = String(state.filters.opacity);

    els.filterOutlineBtn.setAttribute("aria-pressed", String(state.filters.outline));
    els.filterGrayBtn.setAttribute("aria-pressed", String(state.filters.grayscale));
    els.filterGrayBtn.disabled = state.filters.outline;
    els.filterInvertBtn.setAttribute("aria-pressed", String(state.filters.invert));
  }

  // ==================== MULTI-TOUCH GESTURES & LOCK ====================

  const pointers = new Map();
  let gestureBaseline = null;

  function setupStageGestures() {
    const stage = els.cameraStage;

    stage.addEventListener("pointerdown", function (e) {
      if (state.isLocked || !state.sourceCanvas) return;
      if (e.target !== stage && e.target !== els.cameraVideo) return;

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (_) {}
      captureGestureBaseline();
    });

    stage.addEventListener("pointermove", function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.isLocked || !state.sourceCanvas || !gestureBaseline) return;

      const pts = Array.from(pointers.values());
      if (pts.length === 1) {
        const dx = pts[0].x - gestureBaseline.cx;
        const dy = pts[0].y - gestureBaseline.cy;
        state.transform.x = gestureBaseline.tx + dx;
        state.transform.y = gestureBaseline.ty + dy;
        applyTransformCSS();
      } else if (pts.length >= 2) {
        const p1 = pts[0];
        const p2 = pts[1];
        const cx = (p1.x + p2.x) * 0.5;
        const cy = (p1.y + p2.y) * 0.5;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        const ratio = dist / gestureBaseline.dist;
        state.transform.scale = clamp(gestureBaseline.scale * ratio, 0.15, 4.5);

        const deltaDeg = ((angleRad - gestureBaseline.angleRad) * 180) / Math.PI;
        state.transform.rotationDeg = gestureBaseline.rotationDeg + deltaDeg;

        state.transform.x = gestureBaseline.tx + (cx - gestureBaseline.cx);
        state.transform.y = gestureBaseline.ty + (cy - gestureBaseline.cy);
        applyTransformCSS();
      }
    });

    function removePointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch (_) {}
      captureGestureBaseline();
    }

    stage.addEventListener("pointerup", removePointer);
    stage.addEventListener("pointercancel", removePointer);
  }

  function captureGestureBaseline() {
    const pts = Array.from(pointers.values());
    if (pts.length === 0) {
      gestureBaseline = null;
      return;
    }
    if (pts.length === 1) {
      gestureBaseline = {
        cx: pts[0].x,
        cy: pts[0].y,
        tx: state.transform.x,
        ty: state.transform.y
      };
    } else {
      const p1 = pts[0];
      const p2 = pts[1];
      gestureBaseline = {
        cx: (p1.x + p2.x) * 0.5,
        cy: (p1.y + p2.y) * 0.5,
        dist: Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
        angleRad: Math.atan2(p2.y - p1.y, p2.x - p1.x),
        tx: state.transform.x,
        ty: state.transform.y,
        scale: state.transform.scale,
        rotationDeg: state.transform.rotationDeg
      };
    }
  }

  function resetTransformState() {
    state.transform.x = 0;
    state.transform.y = 0;
    state.transform.scale = 1.0;
    state.transform.rotationDeg = 0;
    applyTransformCSS();
  }

  function applyTransformCSS() {
    const t = state.transform;
    const sx = (state.mirrorX ? -1 : 1) * t.scale;
    const sy = t.scale;
    els.referenceCanvas.style.transform =
      "translate3d(" + t.x.toFixed(1) + "px, " + t.y.toFixed(1) + "px, 0) " +
      "rotate(" + t.rotationDeg.toFixed(2) + "deg) " +
      "scale(" + sx.toFixed(3) + ", " + sy.toFixed(3) + ")";
    els.scaleReadout.textContent = Math.round(t.scale * 100) + "%";
  }

  function syncLockUI() {
    const locked = state.isLocked;
    els.lockToggleBtn.setAttribute("aria-pressed", String(locked));
    els.lockIconUnlocked.hidden = locked;
    els.lockIconLocked.hidden = !locked;
    els.lockBtnLabel.textContent = locked ? "Locked" : "Lock Position";

    els.scaleDownBtn.disabled = locked;
    els.scaleUpBtn.disabled = locked;
    els.rotateRightBtn.disabled = locked;
    els.resetTransformBtn.disabled = locked;
  }

  // ==================== SNAPSHOT & EXPORT ====================

  async function captureCameraSnapshot() {
    const stageRect = els.cameraStage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const outW = Math.round(stageRect.width * dpr);
    const outH = Math.round(stageRect.height * dpr);

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");

    ctx.fillStyle = "#0B0E13";
    ctx.fillRect(0, 0, outW, outH);

    // Draw object-fit: cover video frame
    const vid = els.cameraVideo;
    if (state.cameraActive && vid.videoWidth > 0 && vid.videoHeight > 0) {
      const vidRatio = vid.videoWidth / vid.videoHeight;
      const boxRatio = outW / outH;
      let drawW, drawH, drawX, drawY;
      if (vidRatio > boxRatio) {
        drawH = outH;
        drawW = outH * vidRatio;
        drawX = (outW - drawW) * 0.5;
        drawY = 0;
      } else {
        drawW = outW;
        drawH = outW / vidRatio;
        drawX = 0;
        drawY = (outH - drawH) * 0.5;
      }
      ctx.drawImage(vid, drawX, drawY, drawW, drawH);
    }

    // Draw transformed reference overlay at exact visual size & position
    if (state.sourceCanvas && !els.referenceStage.hidden) {
      const refCanvas = els.referenceCanvas;
      const maxW = stageRect.width * 0.82;
      const maxH = stageRect.height * 0.68;
      const fitScale = Math.min(1, maxW / refCanvas.width, maxH / refCanvas.height);
      const baseW = refCanvas.width * fitScale * dpr;
      const baseH = refCanvas.height * fitScale * dpr;

      ctx.save();
      ctx.globalAlpha = state.filters.opacity;
      ctx.translate(
        outW * 0.5 + state.transform.x * dpr,
        outH * 0.5 + state.transform.y * dpr
      );
      ctx.rotate((state.transform.rotationDeg * Math.PI) / 180);
      ctx.scale(
        (state.mirrorX ? -1 : 1) * state.transform.scale,
        state.transform.scale
      );
      ctx.drawImage(refCanvas, -baseW * 0.5, -baseH * 0.5, baseW, baseH);
      ctx.restore();
    }

    return new Promise(function (resolve) {
      out.toBlob(function (blob) {
        resolve(blob);
      }, "image/png");
    });
  }

  async function shareOrDownloadBlob(blob, filename, preferShare) {
    if (!blob) {
      showAlert("Export Failed", "Couldn't render the image. Please try again.", null, null);
      return;
    }

    const file = new File([blob], filename, { type: "image/png" });
    if (preferShare && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "TraceAR"
        });
        showToast("Shared image");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 3000);
    showToast("Saved " + filename);
  }

  // ==================== UI HELPERS & NAVIGATION ====================

  function switchMode(targetMode) {
    if (state.mode === targetMode) return;
    state.mode = targetMode;

    const isTrace = targetMode === "trace";
    els.traceView.hidden = !isTrace;
    els.sketchView.hidden = isTrace;

    els.modeTraceBtn.classList.toggle("mode-tab--active", isTrace);
    els.modeSketchBtn.classList.toggle("mode-tab--active", !isTrace);
    if (isTrace) {
      els.modeTraceBtn.setAttribute("aria-current", "page");
      els.modeSketchBtn.removeAttribute("aria-current");
      startCamera();
    } else {
      els.modeSketchBtn.setAttribute("aria-current", "page");
      els.modeTraceBtn.removeAttribute("aria-current");
      stopCamera();
      syncWakeLock();
      requestAnimationFrame(function () {
        sketchPad.syncSize();
      });
    }
  }

  function showAlert(title, message, actionLabel, actionFn) {
    els.alertTitle.textContent = title;
    els.alertMessage.textContent = message;
    alertActionCallback = actionFn || null;
    if (actionLabel && actionFn) {
      els.alertActionBtn.textContent = actionLabel;
      els.alertActionBtn.hidden = false;
    } else {
      els.alertActionBtn.hidden = true;
    }
    els.alertBanner.hidden = false;
  }

  function hideAlert() {
    if (els.alertTitle.textContent === "Low Light Detected") {
      state.lowLightDismissed = true;
    }
    els.alertBanner.hidden = true;
    alertActionCallback = null;
  }

  function showToast(text) {
    els.toastPill.textContent = text;
    els.toastPill.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toastPill.hidden = true;
    }, 2100);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function pulseHaptic(ms) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  // ==================== ONBOARDING & SAMPLES INIT ====================

  function populateSampleGrid() {
    els.sampleGrid.innerHTML = "";
    window.TraceARSamples.catalog.forEach(function (item) {
      const thumbCanvas = window.TraceARSamples.generateCanvas(item.id, 320);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sample-card";

      const img = document.createElement("img");
      img.className = "sample-card__thumb";
      img.src = thumbCanvas.toDataURL("image/png");
      img.alt = item.title;

      const label = document.createElement("span");
      label.className = "sample-card__title";
      label.textContent = item.title;

      card.appendChild(img);
      card.appendChild(label);

      card.addEventListener("click", function () {
        const hiRes = window.TraceARSamples.generateCanvas(item.id, 1000);
        loadReferenceFromImageSource(hiRes, "Loaded " + item.title);
        closeDialog(els.pickerDialog);
      });

      els.sampleGrid.appendChild(card);
    });
  }

  function openOnboarding() {
    state.onboardingIndex = 0;
    renderOnboardingStep();
    els.onboardingModal.hidden = false;
  }

  function closeOnboarding() {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    els.onboardingModal.hidden = true;
    if (state.mode === "trace") {
      startCamera();
    }
  }

  function renderOnboardingStep() {
    const step = ONBOARDING_STEPS[state.onboardingIndex];
    els.onboardingSvg.innerHTML = step.svgPath;
    els.onboardingStepTitle.textContent = step.title;
    els.onboardingStepBody.textContent = step.body;
    els.onboardingStepTip.textContent = step.tip;
    els.nextOnboardingBtn.textContent =
      state.onboardingIndex < ONBOARDING_STEPS.length - 1 ? "Next" : "Start Tracing";

    const dots = els.onboardingDots.querySelectorAll(".step-dot");
    dots.forEach(function (dot, idx) {
      dot.classList.toggle("step-dot--active", idx === state.onboardingIndex);
    });
  }

  // ==================== EVENT BINDINGS ====================

  function bindUIEvents() {
    // Mode tabs
    els.modeTraceBtn.addEventListener("click", function () { switchMode("trace"); });
    els.modeSketchBtn.addEventListener("click", function () { switchMode("sketch"); });

    // Camera fallback
    els.retryCameraBtn.addEventListener("click", function () { startCamera(); });
    els.fallbackToSketchBtn.addEventListener("click", function () { switchMode("sketch"); });

    // File & Paste inputs
    els.quickFileInput.addEventListener("change", function (e) {
      handleFileSelected(e.target.files && e.target.files[0]);
      e.target.value = "";
    });
    els.sheetFileInput.addEventListener("change", function (e) {
      handleFileSelected(e.target.files && e.target.files[0]);
      e.target.value = "";
    });
    els.openSamplesEmptyBtn.addEventListener("click", function () { openDialog(els.pickerDialog); });
    els.openPickerBtn.addEventListener("click", function () { openDialog(els.pickerDialog); });
    els.closePickerBtn.addEventListener("click", function () { closeDialog(els.pickerDialog); });
    els.pasteEmptyBtn.addEventListener("click", pasteFromClipboard);
    els.sheetPasteBtn.addEventListener("click", function () {
      closeDialog(els.pickerDialog);
      pasteFromClipboard();
    });

    // Top HUD actions
    els.toggleGridBtn.addEventListener("click", function () {
      state.showGrid = !state.showGrid;
      els.gridOverlay.hidden = !state.showGrid;
      els.toggleGridBtn.setAttribute("aria-pressed", String(state.showGrid));
    });

    els.snapshotBtn.addEventListener("click", async function () {
      const blob = await captureCameraSnapshot();
      await shareOrDownloadBlob(blob, "TraceAR-Snapshot.png", true);
    });

    els.openSettingsBtn.addEventListener("click", function () { openDialog(els.settingsDialog); });
    els.openSettingsFromSketchBtn.addEventListener("click", function () { openDialog(els.settingsDialog); });
    els.closeSettingsBtn.addEventListener("click", function () { closeDialog(els.settingsDialog); });

    // Alert banner
    els.alertDismissBtn.addEventListener("click", hideAlert);
    els.alertActionBtn.addEventListener("click", function () {
      const cb = alertActionCallback;
      hideAlert();
      if (cb) cb();
    });

    // Trace deck controls
    els.lockToggleBtn.addEventListener("click", function () {
      state.isLocked = !state.isLocked;
      syncLockUI();
      refreshStatusPill();
      pulseHaptic(18);
      showToast(state.isLocked ? "Position locked — safe to trace" : "Unlocked — drag or pinch to adjust");
    });

    els.scaleDownBtn.addEventListener("click", function () {
      if (state.isLocked) return;
      state.transform.scale = clamp(state.transform.scale * 0.9, 0.15, 4.5);
      applyTransformCSS();
    });

    els.scaleUpBtn.addEventListener("click", function () {
      if (state.isLocked) return;
      state.transform.scale = clamp(state.transform.scale * 1.1, 0.15, 4.5);
      applyTransformCSS();
    });

    els.rotateRightBtn.addEventListener("click", function () {
      if (state.isLocked) return;
      state.transform.rotationDeg = (state.transform.rotationDeg + 15) % 360;
      applyTransformCSS();
    });

    els.resetTransformBtn.addEventListener("click", function () {
      if (state.isLocked) return;
      resetTransformState();
      showToast("Centered reference");
    });

    els.opacitySlider.addEventListener("input", function (e) {
      const pct = Number(e.target.value);
      state.filters.opacity = clamp(pct / 100, 0.05, 1.0);
      els.opacityValue.textContent = pct + "%";
      els.referenceCanvas.style.opacity = String(state.filters.opacity);
    });

    els.filterOutlineBtn.addEventListener("click", function () {
      state.filters.outline = !state.filters.outline;
      applyFiltersAndRender();
    });

    els.filterGrayBtn.addEventListener("click", function () {
      if (state.filters.outline) return;
      state.filters.grayscale = !state.filters.grayscale;
      applyFiltersAndRender();
    });

    els.filterInvertBtn.addEventListener("click", function () {
      state.filters.invert = !state.filters.invert;
      applyFiltersAndRender();
    });

    // Sketch Pad Controls
    els.undoBtn.addEventListener("click", function () { sketchPad.undo(); });
    els.redoBtn.addEventListener("click", function () { sketchPad.redo(); });
    els.clearSketchBtn.addEventListener("click", function () {
      sketchPad.clear();
      showToast("Cleared canvas — tap Undo to restore");
    });

    els.underlayToggleBtn.addEventListener("click", function () {
      const next = !sketchPad.showUnderlay;
      sketchPad.setShowUnderlay(next);
      els.underlayToggleBtn.setAttribute("aria-pressed", String(next));
      showToast(next ? "Showing reference guide" : "Hid reference guide");
    });

    els.saveSketchBtn.addEventListener("click", async function () {
      const blob = await sketchPad.exportPNGBlob();
      await shareOrDownloadBlob(blob, "TraceAR-Sketch.png", false);
    });

    els.shareSketchBtn.addEventListener("click", async function () {
      const blob = await sketchPad.exportPNGBlob();
      await shareOrDownloadBlob(blob, "TraceAR-Sketch.png", true);
    });

    els.toolPencilBtn.addEventListener("click", function () {
      sketchPad.setTool("pencil");
      syncSketchToolButtons("pencil");
    });

    els.toolEraserBtn.addEventListener("click", function () {
      sketchPad.setTool("eraser");
      syncSketchToolButtons("eraser");
    });

    els.sizeSelector.addEventListener("click", function (e) {
      const btn = e.target.closest(".size-btn");
      if (!btn) return;
      sketchPad.setBrushSize(btn.dataset.size);
      els.sizeSelector.querySelectorAll(".size-btn").forEach(function (b) {
        const active = b === btn;
        b.classList.toggle("size-btn--active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    });

    els.colorSwatches.addEventListener("click", function (e) {
      const btn = e.target.closest(".swatch-btn");
      if (!btn) return;
      sketchPad.setColor(btn.dataset.color);
      syncSketchToolButtons("pencil");
      els.colorSwatches.querySelectorAll(".swatch-btn").forEach(function (b) {
        const active = b === btn;
        b.classList.toggle("swatch-btn--active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    });

    // Settings Controls
    els.wakeLockToggle.checked = state.wakeLockEnabled;
    els.wakeLockToggle.addEventListener("change", function (e) {
      state.wakeLockEnabled = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.wakeLock, String(state.wakeLockEnabled));
      syncWakeLock();
    });

    els.mirrorCameraToggle.addEventListener("change", function (e) {
      state.mirrorX = e.target.checked;
      applyTransformCSS();
    });

    els.replayOnboardingBtn.addEventListener("click", function () {
      closeDialog(els.settingsDialog);
      openOnboarding();
    });

    els.resetAllBtn.addEventListener("click", function () {
      state.isLocked = false;
      state.mirrorX = false;
      els.mirrorCameraToggle.checked = false;
      state.filters = { opacity: 0.55, outline: false, grayscale: false, invert: false };
      els.opacitySlider.value = "55";
      els.opacityValue.textContent = "55%";
      resetTransformState();
      syncLockUI();
      applyFiltersAndRender();
      closeDialog(els.settingsDialog);
      showToast("Reset position & filters");
    });

    // Dialog backdrop close
    [els.pickerDialog, els.settingsDialog].forEach(function (dlg) {
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg) closeDialog(dlg);
      });
    });

    // Onboarding buttons
    els.skipOnboardingBtn.addEventListener("click", closeOnboarding);
    els.nextOnboardingBtn.addEventListener("click", function () {
      if (state.onboardingIndex < ONBOARDING_STEPS.length - 1) {
        state.onboardingIndex += 1;
        renderOnboardingStep();
      } else {
        closeOnboarding();
      }
    });

    // Foreground / Background lifecycle
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopCamera();
        syncWakeLock();
      } else if (state.mode === "trace" && els.onboardingModal.hidden) {
        startCamera();
      }
    });
  }

  function syncSketchToolButtons(activeTool) {
    const isPencil = activeTool === "pencil";
    els.toolPencilBtn.classList.toggle("tool-btn--active", isPencil);
    els.toolPencilBtn.setAttribute("aria-pressed", String(isPencil));
    els.toolEraserBtn.classList.toggle("tool-btn--active", !isPencil);
    els.toolEraserBtn.setAttribute("aria-pressed", String(!isPencil));
  }

  // ==================== SERVICE WORKER & BOOT ====================

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function () {});
      });
    }
  }

  function init() {
    populateSampleGrid();
    setupStageGestures();
    bindUIEvents();
    registerServiceWorker();

    if (localStorage.getItem(STORAGE_KEYS.onboarded) === "true") {
      startCamera();
    } else {
      openOnboarding();
    }
  }

  init();
})();
