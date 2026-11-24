(function () {
  "use strict";

  const CATALOG = [
    { id: "cube", title: "Isometric Cube" },
    { id: "proportions", title: "Portrait Grid" },
    { id: "ellipses", title: "Cylinder Ellipses" },
    { id: "golden", title: "Golden Spiral" },
    { id: "star", title: "8-Point Compass" },
    { id: "octahedron", title: "Octahedron" }
  ];

  function generateCanvas(id, size = 900) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Subtle translucent card so both full-tone and outline modes read clearly
    ctx.fillStyle = "rgba(252, 253, 255, 0.92)";
    roundRect(ctx, size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.035);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const primary = "#141821";
    const guide = "rgba(20, 130, 190, 0.55)";

    switch (id) {
      case "cube":
        drawIsometricCube(ctx, size, primary, guide);
        break;
      case "proportions":
        drawPortraitGrid(ctx, size, primary, guide);
        break;
      case "ellipses":
        drawCylinderEllipses(ctx, size, primary, guide);
        break;
      case "golden":
        drawGoldenSpiral(ctx, size, primary, guide);
        break;
      case "star":
        drawCompassStar(ctx, size, primary, guide);
        break;
      case "octahedron":
        drawOctahedron(ctx, size, primary, guide);
        break;
      default:
        drawIsometricCube(ctx, size, primary, guide);
    }

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawIsometricCube(ctx, s, primary, guide) {
    const cx = s * 0.5;
    const cy = s * 0.5;
    const r = s * 0.35;

    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }

    // Back hidden axes
    ctx.save();
    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.006;
    ctx.setLineDash([s * 0.016, s * 0.014]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(pts[2].x, pts[2].y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(pts[4].x, pts[4].y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();

    // Visible outer hexagon + front Y-junction
    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.011;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.moveTo(pts[5].x, pts[5].y);
    ctx.lineTo(cx, cy);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.moveTo(cx, cy);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.stroke();
  }

  function drawPortraitGrid(ctx, s, primary, guide) {
    const cx = s * 0.5;
    const sphereY = s * 0.40;
    const r = s * 0.25;
    const hairlineY = sphereY - r * 0.58;
    const browY = sphereY;
    const noseY = sphereY + r * 0.58;
    const chinY = sphereY + r * 1.18;

    // Proportion horizontal thirds & vertical axis
    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.006;
    ctx.beginPath();
    [hairlineY, browY, noseY, chinY].forEach(function (y) {
      ctx.moveTo(cx - r * 1.15, y);
      ctx.lineTo(cx + r * 1.15, y);
    });
    ctx.moveTo(cx, sphereY - r * 1.12);
    ctx.lineTo(cx, chinY + r * 0.12);
    ctx.stroke();

    // Temporal side ellipses
    ctx.beginPath();
    ctx.ellipse(cx, sphereY, r * 0.78, r, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cranial circle + jaw contour
    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.011;
    ctx.beginPath();
    ctx.arc(cx, sphereY, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.92, browY + r * 0.12);
    ctx.quadraticCurveTo(cx - r * 0.78, chinY - r * 0.08, cx, chinY);
    ctx.quadraticCurveTo(cx + r * 0.78, chinY - r * 0.08, cx + r * 0.92, browY + r * 0.12);
    ctx.stroke();
  }

  function drawCylinderEllipses(ctx, s, primary, guide) {
    const cx = s * 0.5;
    const topY = s * 0.24;
    const midY = s * 0.50;
    const botY = s * 0.76;
    const rx = s * 0.24;

    // Symmetry axis & minor/major axes
    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.0055;
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.14);
    ctx.lineTo(cx, s * 0.86);
    [topY, midY, botY].forEach(function (y) {
      ctx.moveTo(cx - rx * 1.15, y);
      ctx.lineTo(cx + rx * 1.15, y);
    });
    ctx.ellipse(cx, midY, rx, s * 0.075, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cylinder top, walls, and wider lower perspective ellipse
    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.0105;
    ctx.beginPath();
    ctx.ellipse(cx, topY, rx, s * 0.058, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, botY, rx, s * 0.092, 0, 0, Math.PI);
    ctx.moveTo(cx - rx, topY);
    ctx.lineTo(cx - rx, botY);
    ctx.moveTo(cx + rx, topY);
    ctx.lineTo(cx + rx, botY);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = guide;
    ctx.setLineDash([s * 0.014, s * 0.012]);
    ctx.beginPath();
    ctx.ellipse(cx, botY, rx, s * 0.092, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGoldenSpiral(ctx, s, primary, guide) {
    const phi = 1.61803398875;
    const w = s * 0.74;
    const h = w / phi;
    let x = (s - w) * 0.5;
    let y = (s - h) * 0.5;
    let rw = w;
    let rh = h;

    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.006;
    ctx.strokeRect(x, y, rw, rh);

    const spiral = new Path2D();
    for (let step = 0; step < 7; step++) {
      const dir = step % 4;
      let sq, cx, cy, startA;
      if (dir === 0) {
        sq = rh;
        ctx.beginPath();
        ctx.moveTo(x + sq, y);
        ctx.lineTo(x + sq, y + rh);
        ctx.stroke();
        cx = x + sq;
        cy = y + sq;
        startA = Math.PI;
        x += sq;
        rw -= sq;
      } else if (dir === 1) {
        sq = rw;
        ctx.beginPath();
        ctx.moveTo(x, y + sq);
        ctx.lineTo(x + rw, y + sq);
        ctx.stroke();
        cx = x;
        cy = y + sq;
        startA = -Math.PI / 2;
        y += sq;
        rh -= sq;
      } else if (dir === 2) {
        sq = rh;
        ctx.beginPath();
        ctx.moveTo(x + rw - sq, y);
        ctx.lineTo(x + rw - sq, y + rh);
        ctx.stroke();
        cx = x + rw - sq;
        cy = y;
        startA = 0;
        rw -= sq;
      } else {
        sq = rw;
        ctx.beginPath();
        ctx.moveTo(x, y + rh - sq);
        ctx.lineTo(x + rw, y + rh - sq);
        ctx.stroke();
        cx = x + sq;
        cy = y + rh - sq;
        startA = Math.PI / 2;
        rh -= sq;
      }
      spiral.arc(cx, cy, sq, startA, startA + Math.PI / 2, false);
    }

    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.011;
    ctx.stroke(spiral);
  }

  function drawCompassStar(ctx, s, primary, guide) {
    const cx = s * 0.5;
    const cy = s * 0.5;
    const outerR = s * 0.36;
    const midR = s * 0.22;
    const innerR = s * 0.14;

    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.0055;
    [outerR, midR, innerR].forEach(function (r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.0105;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawOctahedron(ctx, s, primary, guide) {
    const top = { x: s * 0.50, y: s * 0.14 };
    const bot = { x: s * 0.50, y: s * 0.86 };
    const left = { x: s * 0.18, y: s * 0.50 };
    const right = { x: s * 0.82, y: s * 0.50 };
    const front = { x: s * 0.44, y: s * 0.58 };
    const back = { x: s * 0.56, y: s * 0.42 };

    // Hidden back edges
    ctx.save();
    ctx.strokeStyle = guide;
    ctx.lineWidth = s * 0.006;
    ctx.setLineDash([s * 0.015, s * 0.013]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(back.x, back.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(back.x, back.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
    ctx.restore();

    // Visible front faces
    ctx.strokeStyle = primary;
    ctx.lineWidth = s * 0.011;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();

    ctx.moveTo(top.x, top.y);
    ctx.lineTo(front.x, front.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(front.x, front.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  window.TraceARSamples = {
    catalog: CATALOG,
    generateCanvas: generateCanvas
  };
})();
