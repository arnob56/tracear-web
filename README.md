# TraceAR Web — Camera Tracing & Sketch Pad (iPhone PWA)

Free, offline-capable, zero-ad camera tracing overlay and 2D Sketch Pad built for **iPhone 12 Safari** (no Mac, cables, or sideloading needed).

**Live App (GitHub Pages):** `https://arnob56.github.io/tracear-web/`

## Features

- **Live Rear Camera Overlay (60 fps)**: Rest your iPhone on a clear glass, mug, or stand 20–30 cm above your sketch paper and trace directly onto physical paper.
- **Import Reference**: Pick from iPhone **Photos**, **Paste from Clipboard**, or choose from **6 Built-In Geometric Guides** (Isometric Cube, Portrait Grid, Cylinder Ellipses, Golden Spiral, 8-Point Compass, Octahedron).
- **Multi-Touch & One-Handed Controls**: 1-finger drag, 2-finger pinch-zoom, 2-finger twist rotation, fine `- / +` scale & `15°` rotate buttons, and **Lock Position** so accidental touches never move your guide.
- **Tracing Filters**: GPU-smooth **Opacity** slider (5%–100%), Sobel **Outline** mode (transparent non-edge background so paper & pencil stay bright), **Grayscale**, and **Invert**.
- **Stability Helpers**: Ambient **Low-Light** warning, optional **Proportion Grid**, and **Keep Screen Awake** (`navigator.wakeLock`).
- **2D Sketch Pad**: On-screen canvas with **Pencil** & isolated **Eraser**, **3 sizes**, **6 colors**, **Undo/Redo**, faint reference underlay, and native iOS **Share / Save Image** export.
- **100% Offline PWA**: Zero network analytics, zero ads, Service Worker offline caching.

## Install on iPhone 12 (No Mac Required)

1. Open `https://arnob56.github.io/tracear-web/` in **Safari** on your iPhone 12.
2. Tap the **Share** icon at the bottom of Safari -> tap **Add to Home Screen** -> tap **Add**.
3. Launch **TraceAR** from your Home Screen (runs full-screen without Safari address bars and works offline).
4. Allow **Camera** access when prompted, prop your phone on a stand/glass over well-lit paper, choose a photo, and tap **Lock Position**.

## Local Development

Serve over a local HTTP server:

```bash
python -m http.server 8080
```

*(Note: iOS Safari requires HTTPS—provided automatically by GitHub Pages—to enable rear camera `getUserMedia` on a phone.)*
