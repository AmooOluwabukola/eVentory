/* eVentory — tiny dependency-free SVG charts used across dashboard pages.
 *
 *   EvCharts.bar(el, { data: [{ label, value }], max, step })
 *   EvCharts.line(el, { labels, series: [{ name, values, color }], max, step })
 *
 * Charts redraw on container resize and on theme change so labels and grid
 * lines always match the active palette.
 */

(function () {
  "use strict";

  const FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';
  const registry = new Set();

  function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  function palette() {
    return {
      brand: cssVar("--brand", "#6415ea"),
      green: cssVar("--green", "#12a150"),
      grid: cssVar("--row-line", "#f1f1f5"),
      axis: cssVar("--line", "#ededf2"),
      label: cssVar("--faint", "#9c9ca8"),
    };
  }

  function niceTicks(max, step) {
    const ticks = [];
    for (let v = 0; v <= max + 0.0001; v += step) ticks.push(v);
    return ticks;
  }

  function formatTick(value) {
    return String(Math.round(value));
  }

  function svgOpen(width, height) {
    return `<svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`;
  }

  function textEl(x, y, text, opts) {
    const o = opts || {};
    return `<text x="${x}" y="${y}" fill="${o.fill}" font-family='${FONT}' font-size="${
      o.size || 12
    }" font-weight="${o.weight || 500}" text-anchor="${o.anchor || "start"}">${text}</text>`;
  }

  function roundedTopBar(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h));
    return `M${x} ${y + h} L${x} ${y + rr} Q${x} ${y} ${x + rr} ${y} L${x + w - rr} ${y} Q${
      x + w
    } ${y} ${x + w} ${y + rr} L${x + w} ${y + h} Z`;
  }

  function drawBar(el, config) {
    const width = Math.max(240, el.clientWidth || 320);
    const height = config.height || 250;
    const colors = palette();
    const padL = 52;
    const padR = 10;
    const padT = 12;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const max = config.max;
    const ticks = niceTicks(max, config.step);
    const baseY = padT + plotH;
    const scale = (value) => baseY - (value / max) * plotH;
    const band = plotW / config.data.length;
    const barW = Math.min(42, band * 0.46);

    let out = svgOpen(width, height);

    ticks.forEach((tick) => {
      const y = scale(tick);
      if (tick > 0) {
        out += `<line x1="${padL}" y1="${y}" x2="${
          width - padR
        }" y2="${y}" stroke="${colors.grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
      }
      out += textEl(padL - 10, y + 4, formatTick(tick), {
        fill: colors.label,
        anchor: "end",
      });
    });

    for (let i = 1; i < config.data.length; i += 1) {
      const x = padL + band * i;
      out += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${baseY}" stroke="${colors.grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
    }

    out += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" stroke="${colors.axis}" stroke-width="1"/>`;
    out += `<line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" stroke="${colors.axis}" stroke-width="1"/>`;

    config.data.forEach((point, index) => {
      const center = padL + band * index + band / 2;
      const x = center - barW / 2;
      const y = scale(point.value);
      out += `<path d="${roundedTopBar(x, y, barW, baseY - y, 4)}" fill="${colors.brand}"/>`;
      out += textEl(center, height - 8, point.label, {
        fill: colors.label,
        anchor: "middle",
      });
    });

    out += "</svg>";
    el.innerHTML = out;
  }

  function smoothPath(points) {
    if (points.length < 2) return "";
    if (points.length === 2) {
      return `M${points[0][0]} ${points[0][1]} L${points[1][0]} ${points[1][1]}`;
    }

    let d = `M${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function drawLine(el, config) {
    const width = Math.max(240, el.clientWidth || 320);
    const height = config.height || 250;
    const colors = palette();
    const padL = 52;
    const padR = 14;
    const padT = 12;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const max = config.max;
    const ticks = niceTicks(max, config.step);
    const baseY = padT + plotH;
    const scale = (value) => baseY - (value / max) * plotH;
    const count = config.labels.length;
    const stepX = count > 1 ? plotW / (count - 1) : 0;
    const xAt = (index) => padL + stepX * index;

    let out = svgOpen(width, height);

    ticks.forEach((tick) => {
      const y = scale(tick);
      if (tick > 0) {
        out += `<line x1="${padL}" y1="${y}" x2="${
          width - padR
        }" y2="${y}" stroke="${colors.grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
      }
      out += textEl(padL - 10, y + 4, formatTick(tick), {
        fill: colors.label,
        anchor: "end",
      });
    });

    for (let i = 0; i < count; i += 1) {
      const x = xAt(i);
      if (i > 0) {
        out += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${baseY}" stroke="${colors.grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
      }
      out += textEl(x, height - 8, config.labels[i], {
        fill: colors.label,
        anchor: i === 0 ? "start" : i === count - 1 ? "end" : "middle",
      });
    }

    out += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" stroke="${colors.axis}" stroke-width="1"/>`;
    out += `<line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" stroke="${colors.axis}" stroke-width="1"/>`;

    config.series.forEach((series) => {
      const color = series.color === "green" ? colors.green : colors.brand;
      const points = series.values.map((value, index) => [xAt(index), scale(value)]);
      out += `<path d="${smoothPath(points)}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      points.forEach((point) => {
        out += `<circle cx="${point[0]}" cy="${point[1]}" r="3.4" fill="${color}"/>`;
      });
    });

    out += "</svg>";
    el.innerHTML = out;
  }

  function register(el, draw, config) {
    el.__evChartDraw = () => draw(el, config);
    el.__evChartDraw();
    registry.add(el);

    if (typeof ResizeObserver === "function") {
      let lastWidth = el.clientWidth;
      const observer = new ResizeObserver(() => {
        if (Math.abs(el.clientWidth - lastWidth) < 2) return;
        lastWidth = el.clientWidth;
        el.__evChartDraw();
      });
      observer.observe(el);
    }
  }

  function refreshAll() {
    registry.forEach((el) => {
      if (el.isConnected && typeof el.__evChartDraw === "function") el.__evChartDraw();
    });
  }

  if (typeof MutationObserver === "function") {
    new MutationObserver(refreshAll).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  window.addEventListener("resize", () => {
    window.clearTimeout(window.__evChartTimer);
    window.__evChartTimer = window.setTimeout(refreshAll, 120);
  });

  window.EvCharts = {
    bar: (el, config) => register(el, drawBar, config),
    line: (el, config) => register(el, drawLine, config),
    refreshAll,
  };
})();
