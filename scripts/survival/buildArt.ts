/**
 * Bespoke top-down art for High Water and Dead Air. Geometry comes exclusively
 * from the shared layouts: polygon floors, exact solid prop footprints, doors,
 * native stairs and the same wall stamps used by server collision.
 * Run: bun scripts/survival/buildArt.ts (or node --import tsx ...).
 * Generated SVGs are the source assets; no concept-image bitmap is embedded.
 */
import fs from "node:fs";
import path from "node:path";
import { type SurvivalWall, survivalWalls } from "../../shared/defs/maps/survival/geometry.ts";
import { SurvivalLayouts } from "../../shared/defs/maps/survival/index.ts";
import {
    bounds,
    type SurvivalLayout,
    type SurvivalProp,
    type SurvivalZone,
} from "../../shared/defs/maps/survival/layout.ts";
import type { Vec2 } from "../../shared/utils/v2.ts";

const OUT = path.join(import.meta.dirname, "../../client/public/img/map");
const PX = 16;
const APRON = 8;
const num = (n: number) => Math.round(n * 1000) / 1000;
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") =>
    `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${fill}" ${extra}/>`;
const circle = (x: number, y: number, r: number, fill: string, extra = "") =>
    `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill}" ${extra}/>`;
const line = (x: number, y: number, xx: number, yy: number, stroke: string, width = .15, extra = "") =>
    `<path d="M${num(x)} ${num(y)}L${num(xx)} ${
        num(yy)
    }" fill="none" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const polygon = (points: Vec2[], fill: string, extra = "") =>
    `<polygon points="${points.map(p => `${num(p.x)},${num(p.y)}`).join(" ")}" fill="${fill}" ${extra}/>`;
const text = (x: number, y: number, label: string, size: number, fill: string, extra = "") =>
    `<text x="${num(x)}" y="${
        num(y)
    }" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${size}" fill="${fill}" ${extra}>${
        esc(label)
    }</text>`;
const group = (x: number, y: number, deg: number, body: string, extra = "") =>
    `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(deg)})" ${extra}>${body}</g>`;
const clipId = (z: SurvivalZone) => `z-${z.id}`;

/** Seeded decoration remains identical across rebuilds and never changes collision. */
function random(seed: number) {
    return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function onLayer(layout: SurvivalLayout, zone: string, layer: number) {
    return layout.zones.some(z => z.id === zone && z.layer === layer);
}
function snow(z: SurvivalZone) {
    return ["dish", "terrace", "switchyard"].includes(z.id);
}
function ship(z: SurvivalZone) {
    return ["foredeck", "aftdeck"].includes(z.id);
}
function arrow(x: number, y: number, angle: number, color: string) {
    return group(
        x,
        y,
        angle,
        `<path d="M0 4V-4M-1.6 -2L0 -4L1.6 -2" fill="none" stroke="${color}" stroke-width=".35" opacity=".58"/>`,
    );
}
function grid(z: SurvivalZone, spacing: number, color: string, width = .12) {
    const r = bounds(z.polygon);
    let s = "";
    for (let x = r.x0; x <= r.x1; x += spacing) s += line(x, r.y0, x, r.y1, color, width);
    for (let y = r.y0; y <= r.y1; y += spacing) s += line(r.x0, y, r.x1, y, color, width);
    return s;
}
function nearestEdge(z: SurvivalZone, p: Vec2) {
    let result = { x: p.x, y: p.y, dist: Infinity, angle: 0 };
    for (let i = 0; i < z.polygon.length; i++) {
        const a = z.polygon[i];
        const b = z.polygon[(i + 1) % z.polygon.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < result.dist) result = { x, y, dist, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    return result;
}

function definitions(layout: SurvivalLayout, layer: number) {
    let s =
        `<radialGradient id="lamp"><stop stop-color="#ffc16e" stop-opacity=".36"/><stop offset=".4" stop-color="#e5aa5d" stop-opacity=".13"/><stop offset="1" stop-color="#dca75f" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="waterGlow"><stop stop-color="#214e4c"/><stop offset="1" stop-color="#092b2e"/></radialGradient>`;
    s += `<pattern id="water" width="37" height="29" patternUnits="userSpaceOnUse"><path d="M-3 3Q1 1 6 3T15 3M19 8q5 -2 10 -.2t10 -.3M2 17q4 -1.5 9 -.5t8 -.2M22 26q4 -2 8 -.5t10 -1M-6 27q5 -1 10 0M31 16q3 -1 7 -.5" stroke="#43746a" stroke-width=".13" opacity=".24" fill="none"/><path d="M2 5l2 -.4m23 5l3 -.3M9 20l3 -.5m22 5l1.5 -.4" stroke="#739489" stroke-width=".1" opacity=".2"/></pattern>`;
    s += `<pattern id="grate" width="1.3" height="1.3" patternUnits="userSpaceOnUse">${
        rect(0, 0, 1.3, 1.3, "#4a5752")
    }${line(0, 0, 1.3, 1.3, "#74827a", .11)}${line(1.3, 0, 0, 1.3, "#263933", .11)}</pattern>`;
    s += `<pattern id="steel" width="3" height="4" patternUnits="userSpaceOnUse">${rect(0, 0, 3, 4, "#56635d")}${
        line(0, 0, 0, 4, "#384941", .15)
    }${line(.2, 1, .8, 1.6, "#758078", .1)}${line(1.8, 3, 2.4, 2.4, "#758078", .1)}</pattern>`;
    s += `<pattern id="wood" width="2" height="12" patternUnits="userSpaceOnUse">${rect(0, 0, 2, 12, "#796a53")}${
        line(.1, 0, .1, 12, "#5b5141", .12)
    }${line(.4, 0, .4, 12, "#918064", .08)}${line(0, 7, 2, 7, "#5f5543", .12)}</pattern>`;
    s += `<linearGradient id="floorLight" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ded4ae" stop-opacity=".4"/><stop offset="1" stop-color="#243b35" stop-opacity=".35"/></linearGradient>`;
    const noise = random(817);
    let flecks = "";
    for (let i = 0; i < 40; i++) {
        flecks += circle(
            noise() * 9,
            noise() * 9,
            .03 + noise() * .055,
            i % 3 === 0 ? "#c6c9b6" : "#253b32",
            `opacity="${num(.1 + noise() * .2)}"`,
        );
    }
    s += `<pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse">${flecks}</pattern>`;
    const zones = layout.zones.filter(z => z.layer === layer);
    for (const z of zones) s += `<clipPath id="${clipId(z)}">${polygon(z.polygon, "white")}</clipPath>`;
    s += `<mask id="outside">${rect(-APRON, -APRON, layout.width + APRON * 2, layout.height + APRON * 2, "white")}${
        zones.map(z => polygon(z.polygon, "black")).join("")
    }</mask>`;
    return s;
}

/** Shore rocks and cliff facets are outside the playable polygons, never fake cover. */
function outerScenery(layout: SurvivalLayout, layer: number) {
    if (layer !== 0) return "";
    const mountain = layout.key === "deadair";
    let s = "";
    for (const z of layout.zones.filter(z => z.layer === layer)) {
        const rng = random(z.id.charCodeAt(0) * 1237);
        for (let i = 0; i < z.polygon.length; i++) {
            const a = z.polygon[i];
            const b = z.polygon[(i + 1) % z.polygon.length];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const nx = (b.y - a.y) / len;
            const ny = (a.x - b.x) / len;
            const count = Math.ceil(len / (mountain ? 6 : 5));
            const lip: Vec2[] = [];
            const outside: Vec2[] = [];
            for (let j = 0; j <= count; j++) {
                const t = j / count;
                const px = a.x + (b.x - a.x) * t;
                const py = a.y + (b.y - a.y) * t;
                const depth = mountain ? 5 + rng() * 5 : 1.2 + rng() * 2;
                lip.push({
                    x: px + nx * (mountain ? .8 + rng() * 1.5 : .4),
                    y: py + ny * (mountain ? .8 + rng() * 1.5 : .4),
                });
                outside.push({ x: px + nx * depth, y: py + ny * depth });
            }
            if (ship(z) || z.id.includes("gangway")) {
                s += line(a.x + nx, a.y + ny, b.x + nx, b.y + ny, "#5b7a6f", .23, `opacity=".65"`);
                continue;
            }
            s += polygon([a, b, ...outside.toReversed()], mountain ? "#243c4b" : "#3e5549");
            for (let j = 0; j < count; j++) {
                const aa = { x: a.x + (b.x - a.x) * j / count, y: a.y + (b.y - a.y) * j / count };
                const bb = { x: a.x + (b.x - a.x) * (j + 1) / count, y: a.y + (b.y - a.y) * (j + 1) / count };
                const mid = { x: (aa.x + outside[j].x) * .5, y: (aa.y + outside[j].y) * .5 };
                s += polygon(
                    [aa, bb, outside[j + 1], mid, outside[j]],
                    mountain
                        ? ["#3e5462", "#2c4553", "#526671"][Math.floor(rng() * 3)]
                        : ["#536657", "#697660", "#40594c"][Math.floor(rng() * 3)],
                    `stroke="${mountain ? "#233d4c" : "#203f31"}" stroke-width=".12"`,
                );
                s += line(
                    lip[j].x,
                    lip[j].y,
                    outside[j].x,
                    outside[j].y,
                    mountain ? "#6b808c" : "#92a187",
                    .12,
                    `opacity=".5"`,
                );
            }
            if (mountain) s += polygon([a, b, ...lip.toReversed()], "#b5c4cb");
        }
    }
    return `<g mask="url(#outside)">${s}</g>`;
}

function floorZone(layout: SurvivalLayout, z: SurvivalZone) {
    const r = bounds(z.polygon);
    const mountain = layout.key === "deadair";
    let fill = z.color;
    if (!mountain) {
        fill = ({
            ticket: "#8c8872",
            departures: "#89917f",
            customs: "#778370",
            maintenance: "#65715e",
            freight: "#8a846b",
            quay: "#81836e",
        } as Record<string, string>)[z.id] ?? fill;
    }
    if (mountain && snow(z)) fill = z.id === "switchyard" ? "#a6b4b6" : "#cad5db";
    if (!mountain && ship(z)) fill = "#9a6242";
    if (["controls", "cable"].includes(z.id)) fill = "url(#wood)";
    if (z.id.includes("gangway") || z.id === "ridge_bridge") fill = "url(#grate)";
    if (z.layer === 1) fill = layout.key === "highwater" ? "#465b53" : "#455761";
    let s = polygon(z.polygon, fill);
    s += polygon(z.polygon, "url(#grain)", `opacity="${mountain && snow(z) ? .23 : .35}"`);
    s += polygon(z.polygon, "url(#floorLight)", `opacity=".2"`);
    if (mountain && snow(z)) {
        // Windblown snow ridges and footprints are flat floor detail.
        const rng = random(z.id.charCodeAt(0) * 117);
        for (let i = 0; i < 35; i++) {
            const x = r.x0 + rng() * (r.x1 - r.x0);
            const y = r.y0 + rng() * (r.y1 - r.y0);
            s += `<path d="M${num(x)} ${
                num(y)
            }q2 -1 5 -.8" fill="none" stroke="#a6b9c8" stroke-width=".2" opacity=".48"/>`;
        }
        for (let y = r.y0 + 6; y < r.y1 - 4; y += 3) {
            const x = r.x0 + (r.x1 - r.x0) * .4 + Math.sin(y * .11) * 4;
            s += `<ellipse cx="${num(x)}" cy="${
                num(y)
            }" rx=".3" ry=".6" fill="#738b99" opacity=".45" transform="rotate(25 ${num(x)} ${num(y)})"/>`;
            s += `<ellipse cx="${num(x + 1.2)}" cy="${
                num(y + 1.3)
            }" rx=".3" ry=".6" fill="#738b99" opacity=".4" transform="rotate(25 ${num(x + 1.2)} ${num(y + 1.3)})"/>`;
        }
        s += polygon(z.polygon, "none", `stroke="#e1e7e8" stroke-width="2" opacity=".6"`);
        if (z.id === "switchyard") s += grid(z, 8, "#8fa29f", .15);
    } else if (ship(z)) {
        // Riveted deck plates, not an arbitrary rectangle: clipped to the actual tapered bow.
        s += grid(z, 8, "#805336", .13);
        for (let y = r.y0 + 2; y < r.y1; y += 8) {
            for (let x = r.x0 + 2; x < r.x1; x += 8) s += circle(x, y, .1, "#bc8e65", `opacity=".7"`);
        }
        for (const x of [r.x0 + 14, r.x1 - 14]) {
            s += line(x, r.y0 + 3, x, r.y1 - 3, "#d0b58a", .2, `stroke-dasharray="4 2" opacity=".7"`);
        }
        s += polygon(z.polygon, "none", `stroke="#bb8e59" stroke-width="1.8" opacity=".5"`);
        s += arrow((r.x0 + r.x1) / 2, r.y1 - 8, 0, "#e1c69a");
        if (z.id === "aftdeck") {
            s += text(r.x0 + 4, r.y1 - 4, "FERRY 03", 1.5, "#d2b68a", `letter-spacing=".15" opacity=".7"`);
        }
    } else if (z.id.includes("gangway") || z.id === "ridge_bridge") {
        s += line(r.x0 + .4, r.y0 + .9, r.x1 - .4, r.y0 + .9, z.id === "ridge_bridge" ? "#ab6956" : "#c5a35c", .4);
        s += line(r.x0 + .4, r.y1 - .9, r.x1 - .4, r.y1 - .9, z.id === "ridge_bridge" ? "#ab6956" : "#c5a35c", .4);
        if (z.id === "ridge_bridge") {
            for (let x = r.x0 + 1; x < r.x1 - 1; x += 4) {
                s += line(x, r.y0 + .8, x + 3, r.y0 + 2, "#914e40", .25)
                    + line(x, r.y1 - .8, x + 3, r.y1 - 2, "#914e40", .25);
            }
        }
        s += arrow((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 90, "#d5c79f");
    } else if (z.id === "quay" || z.id === "freight") {
        s += grid(z, 9, "#686f61", .14);
        const lane = r.x0 + 17;
        s += line(lane, r.y0 + 3, lane, r.y1 - 3, "#b2a16d", .28, `stroke-dasharray="6 3" opacity=".65"`);
        s += arrow(lane + 6, r.y0 + 18, 0, "#c8ba8a");
        if (z.id === "quay") {
            s += text(r.x0 + 3, r.y1 - 6, "BOARDING", 1.8, "#c3bc9c", `letter-spacing=".2" opacity=".5"`);
            for (const y of [r.y0 + 19, r.y1 - 18]) {
                for (let x = r.x0 + 2; x < r.x0 + 12; x += 1.5) s += rect(x, y, .7, 5, "#d1cab1", `opacity=".5"`);
            }
        }
    } else if (z.layer === 1) {
        s += grid(z, 3, "#3a4b48", .15);
        s += line(r.x0 + 1.8, r.y0 + 1, r.x0 + 1.8, r.y1 - 1, "#b3975f", .28);
        s += line(r.x1 - 1.8, r.y0 + 1, r.x1 - 1.8, r.y1 - 1, "#b3975f", .28);
    } else if (z.surface === "tile") {
        s += grid(z, 4, mountain ? "#4e5c61" : "#646e63", .14);
        s += polygon(
            z.polygon,
            "none",
            `stroke="${mountain ? "#768080" : "#959986"}" stroke-width="2.8" opacity=".28"`,
        );
    } else if (!["controls", "cable"].includes(z.id)) {
        s += grid(z, 8, mountain ? "#5a6462" : "#56655a", .14);
    }
    // Scratches and faded stains stay low contrast and deterministic.
    const rng = random(z.id.split("").reduce((a, b) => a + b.charCodeAt(0), 97));
    if (!(mountain && snow(z))) {
        for (let i = 0; i < 28; i++) {
            const x = r.x0 + rng() * (r.x1 - r.x0);
            const y = r.y0 + rng() * (r.y1 - r.y0);
            s += line(x, y, x + rng() * 2 + .5, y + rng() * .6, "#26352f", .09, `opacity=".35"`);
        }
    }
    if (z.id === "departures") {
        s += text(r.x0 + 8, r.y1 - 5, "DEPARTURES", 2.1, "#c2c5ad", `letter-spacing=".2" opacity=".58"`);
        s += text(r.x0 + 8, r.y1 - 2.7, "FERRY TERMINAL / 03", .85, "#bec3a9", `letter-spacing=".1" opacity=".55"`);
    }
    if (z.id === "broadcast") {
        s += rect(r.x0 + 9, r.y0 + 24, 27, 9, "#46575a", `stroke="#788078" stroke-width=".2"`);
        s += text(r.x0 + 5, r.y1 - 6, "RIDGE RELAY", 1.9, "#b7bca9", `letter-spacing=".18" opacity=".58"`);
    }
    if (z.id === "cable") {
        s += rect(r.x0 + 29, r.y0 + 16, 17, 17, "#605c50", `stroke="#9a8d6d" stroke-width=".25"`);
        s += text(r.x0 + 30, r.y0 + 9, "SUMMIT STATION", 1.3, "#d0b78f", `letter-spacing=".12" opacity=".8"`);
    }
    if (z.roof) s += polygon(z.polygon, "none", `stroke="#2a3a30" stroke-width="2.3" opacity=".22"`);
    return `<g clip-path="url(#${clipId(z)})">${s}</g>`;
}

function wallShape(w: SurvivalWall, fill: string, extra = "") {
    return w.kind === "circle"
        ? circle(w.pos.x, w.pos.y, w.rad, fill, extra)
        : rect(w.pos.x - w.w / 2, w.pos.y - w.h / 2, w.w, w.h, fill, extra);
}
function wallArt(layout: SurvivalLayout, layer: number) {
    const walls = survivalWalls(layout, layer);
    const zones = layout.zones.filter(z => z.layer === layer);
    let shadow = "";
    let faces = "";
    for (const w of walls) {
        const indoor = zones.some(z => z.roof && nearestEdge(z, w.pos).dist < .8);
        const color = indoor
            ? (layout.key === "deadair" ? "#aaa894" : "#bcb69a")
            : (layout.key === "deadair" ? "#8b9ba1" : "#807c60");
        shadow += wallShape(w, "#172720", `opacity=".4"`);
        faces += wallShape(w, color);
        if (w.kind === "box") {
            // A fine cap line follows the collision, including diagonal stamp joins.
            if (w.w > w.h) {
                faces += line(
                    w.pos.x - w.w / 2,
                    w.pos.y - .4,
                    w.pos.x + w.w / 2,
                    w.pos.y - .4,
                    indoor ? "#d5ccb0" : "#b3b29a",
                    .12,
                );
                faces += line(w.pos.x - w.w / 2, w.pos.y + .4, w.pos.x + w.w / 2, w.pos.y + .4, "#465247", .13);
            } else {
                faces += line(
                    w.pos.x - .4,
                    w.pos.y - w.h / 2,
                    w.pos.x - .4,
                    w.pos.y + w.h / 2,
                    indoor ? "#d5ccb0" : "#b3b29a",
                    .12,
                );
                faces += line(w.pos.x + .4, w.pos.y - w.h / 2, w.pos.x + .4, w.pos.y + w.h / 2, "#465247", .13);
            }
        }
    }
    return `<g transform="translate(.45 .65)">${shadow}</g>${faces}`;
}
function doorwayArt(layout: SurvivalLayout, layer: number) {
    let s = "";
    for (const d of layout.doors.filter(d => onLayer(layout, d.zones[0], layer))) {
        const o = d.opening;
        const len = o.a1 - o.a0;
        const mid = (o.a0 + o.a1) / 2;
        let body = rect(-len / 2, -.6, len, 1.2, "#a19b7c");
        if (d.kind !== "open") {
            for (let x = -len / 2 + .2; x < len / 2; x += 1) {
                body += line(x, -1.3, x + .45, -2, d.kind === "power" ? "#bb7661" : "#c5a363", .32);
            }
            body += text(0, -2.5, d.cost ? `$${d.cost}` : "POWER", .8, "#cfba83", `text-anchor="middle"`);
        }
        s += group(
            o.axis === "h" ? mid : o.at,
            o.axis === "h" ? o.at : mid,
            o.axis === "h" ? 0 : -90,
            body,
            `data-door="${d.id}"`,
        );
        // Pools of sodium light stay below moving players and all interactables.
        const x = o.axis === "h" ? mid : o.at;
        const y = o.axis === "h" ? o.at : mid;
        s += circle(x, y, d.kind === "open" ? 5 : 9, "url(#lamp)");
    }
    return s;
}
function facadeArt(layout: SurvivalLayout, layer: number) {
    if (layout.key !== "highwater" || layer !== 0) return "";
    const z = layout.zones.find(z => z.id === "departures")!;
    let s = "";
    for (
        const i of z.polygon.map((_, i) => i).filter(i => {
            const a = z.polygon[i], b = z.polygon[(i + 1) % z.polygon.length];
            return Math.max(a.x, b.x) < 26;
        })
    ) {
        const a = z.polygon[i], b = z.polygon[(i + 1) % z.polygon.length];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        let panes = rect(0, -.4, length, .8, "#2f5852", `stroke="#a9b6a1" stroke-width=".1"`);
        for (let x = .2; x < length; x += 3) panes += line(x, -.43, x, .43, "#c4c8ad", .18);
        s += group(a.x, a.y, angle, panes);
    }
    return s;
}
function entryArt(layout: SurvivalLayout, layer: number) {
    let s = "";
    for (const entry of layout.entries.filter(e => onLayer(layout, e.zone, layer))) {
        const z = layout.zones.find(z => z.id === entry.zone)!;
        const near = nearestEdge(z, entry.pos);
        if (near.dist <= 6 && z.roof) {
            let body = rect(-2, -.33, 4, .66, "#314b46", `stroke="#c1b899" stroke-width=".1"`);
            for (let x = -1.6; x < 2; x += 1.2) body += line(x - .2, -.62, x + .2, .62, "#8b7152", .45);
            s += group(near.x, near.y, near.angle, body, `data-entry="${entry.zone}"`);
        } else {
            const hatch = rect(-1.2, -1.2, 2.4, 2.4, "#48554e", `stroke="#99957c" stroke-width=".17"`)
                + line(-.9, -.65, .9, -.65, "#263b32", .2) + line(-.9, 0, .9, 0, "#263b32", .2)
                + line(-.9, .65, .9, .65, "#263b32", .2);
            s += group(entry.pos.x, entry.pos.y, 0, hatch, `data-entry="${entry.zone}"`);
        }
    }
    return s;
}
function stairArt(layout: SurvivalLayout, layer: number) {
    let s = "";
    for (const stair of layout.stairs) {
        const angle = Math.atan2(stair.down.y, stair.down.x) * 180 / Math.PI - 90;
        let body = rect(-3, -4, 6, 8, "#263a35", `stroke="#a79a76" stroke-width=".22"`);
        for (let i = 0; i < 7; i++) {
            const c = 102 - i * 6;
            body += rect(-2.65, -3.65 + i, 5.3, .72, `rgb(${c},${c + 9},${c + 4})`);
            body += line(-2.65, -3.65 + i, 2.65, -3.65 + i, "#a1a389", .1);
        }
        body += rect(-3, -4, 6, .4, "#ccb073");
        s += group(stair.pos.x, stair.pos.y, angle, body, `data-stair="${stair.id}"`);
        s += circle(stair.pos.x, stair.pos.y, 6, "url(#lamp)", `opacity=".6"`);
        const tx = stair.pos.x - stair.down.x * 7;
        const ty = stair.pos.y - stair.down.y * 7;
        s += text(tx, ty, layer === 0 ? "BELOW" : "SURFACE", .75, "#c4b78d", `text-anchor="middle"`);
    }
    return s;
}

/** Each solid has a visible base matching the authored collision footprint. */
function propArt(p: SurvivalProp, theme: "highwater" | "deadair"): string {
    const { w, h } = p;
    const x = -w / 2;
    const y = -h / 2;
    const paint = p.color ?? "#7f8c77";
    const edge = "#263b34";
    const dark = "#314740";
    const light = "#bac0a6";
    const metal = "#8c9b8f";
    const bolt = (xx: number, yy: number) => circle(xx, yy, .13, light, `stroke="${edge}" stroke-width=".05"`);
    const base = (fill = paint) =>
        rect(x, y, w, h, fill, `stroke="${edge}" stroke-width=".2"`)
        + line(x + .17, y + .17, -x - .17, y + .17, light, .13);
    let s = base();
    if (["ambulance", "evacuation_car", "cable_car"].includes(p.kind)) {
        const rescue = p.kind === "ambulance";
        const cable = p.kind === "cable_car";
        const body = cable ? "#ad5345" : paint;
        s = base("#34463d")
            + rect(
                x + .13,
                y + .16,
                w - .26,
                h - .32,
                body,
                `rx="${Math.min(w * .15, .85)}" stroke="${edge}" stroke-width=".2"`,
            );
        s += rect(x + w * .12, y + h * .07, w * .76, h * .13, cable ? "#b7b7a1" : paint, `rx=".3"`);
        s += rect(
            x + w * .14,
            y + h * .23,
            w * .72,
            h * .15,
            "#253f3c",
            `rx=".25" stroke="#8a9f90" stroke-width=".12"`,
        );
        s += rect(x + w * .14, y + h * .77, w * .72, h * .1, "#253f3c", `rx=".2"`);
        s += rect(
            x + w * .17,
            y + h * .42,
            w * .66,
            h * .3,
            rescue ? "#e1d9bd" : cable ? "#c3c3af" : paint,
            `rx=".2" stroke="#6a7f6d" stroke-width=".1"`,
        );
        for (const side of [-1, 1]) {
            s += rect(side < 0 ? x : -x - .35, y + h * .18, .35, h * .13, edge);
            s += rect(side < 0 ? x : -x - .35, y + h * .73, .35, h * .13, edge);
            s += rect(side < 0 ? x + .18 : -x - .48, y + h * .48, .3, h * .15, rescue ? "#a95b4e" : "#293f37");
        }
        s += rect(x + w * .11, y + .13, w * .17, .22, "#eed5a4") + rect(-x - w * .28, y + .13, w * .17, .22, "#e8cf9a");
        s += rect(x + w * .11, -y - .38, w * .17, .22, "#ac5245")
            + rect(-x - w * .28, -y - .38, w * .17, .22, "#ac5245");
        if (rescue) {
            s += rect(-w * .09, -h * .05, w * .18, h * .28, "#b85447")
                + rect(-w * .29, h * .035, w * .58, h * .1, "#b85447");
            s += rect(x + .28, y + h * .39, w - .56, .27, "#ad5447");
            s += rect(-w * .3, y + h * .16, w * .6, .32, "#b15043", `stroke="#e2c1a1" stroke-width=".05"`);
        } else if (cable) {
            for (const side of [-1, 1]) {
                for (let i = 0; i < 4; i++) {
                    s += rect(
                        side < 0 ? x + .42 : -x - 1.35,
                        y + h * .4 + i * h * .09,
                        .9,
                        h * .065,
                        "#2b4240",
                        `stroke="#d1b396" stroke-width=".08"`,
                    );
                }
            }
            s += line(-w * .25, y + h * .24, -w * .25, y + h * .36, "#b3c1b6", .1);
            s += line(0, y + h * .24, 0, y + h * .36, "#b3c1b6", .1);
            s += line(w * .25, y + h * .24, w * .25, y + h * .36, "#b3c1b6", .1);
            s += rect(-.4, y + h * .05, .8, h * .13, "#394e44", `stroke="#b5ad92" stroke-width=".1"`);
            s += text(0, h * .15, "07", Math.min(w / 4, 2.8), "#6e5a49", `text-anchor="middle"`);
        } else {
            s += `<path d="M${num(x + w * .2)} ${num(y + h * .25)}l${num(w * .27)} ${num(h * .08)}l${num(w * .12)} ${
                num(-h * .06)
            }m${num(-w * .12)} ${num(h * .06)}l${num(w * .22)} ${
                num(h * .035)
            }" fill="none" stroke="#a1b0a1" stroke-width=".09"/>`;
            s += line(x + .35, -y - 1.2, x + 1, -y - .8, "#ad976d", .14);
        }
    } else if (p.kind === "dish") {
        s = base("#8d9b9c");
        s += rect(x + .5, y + .5, w - 1, h - 1, "#a5b4b5", `stroke="#cbd5d3" stroke-width=".25"`);
        const rx = w * .44;
        const ry = h * .44;
        s += `<defs><radialGradient id="dish-${p.id}" cx=".37" cy=".3"><stop stop-color="#d8ded9"/><stop offset=".7" stop-color="#a8b5b4"/><stop offset="1" stop-color="#718b8c"/></radialGradient></defs>`;
        const start = -Math.PI / 12;
        const end = Math.PI * 29 / 18;
        const bowlPath = (scale: number) =>
            `M${num(rx * scale * Math.cos(start))} ${num(ry * scale * Math.sin(start))}A${num(rx * scale)} ${
                num(ry * scale)
            } 0 1 1 ${num(rx * scale * Math.cos(end))} ${num(ry * scale * Math.sin(end))}`;
        s += `<path d="M0 0L${num(rx * Math.cos(start))} ${num(ry * Math.sin(start))}${
            bowlPath(1).replace(/^M[^A]+/, "")
        }Z" fill="url(#dish-${p.id})" stroke="#735849" stroke-width=".5"/>`;
        for (const r of [.32, .63, .86]) {
            s += `<path d="${bowlPath(r)}" fill="none" stroke="#7b6658" stroke-width=".17"/>`;
        }
        for (let i = 0; i < 20; i++) {
            const a = i * Math.PI / 10;
            if (a > Math.PI * 29 / 18 && a < Math.PI * 23 / 12) continue;
            s += line(
                0,
                0,
                Math.cos(a) * rx,
                Math.sin(a) * ry,
                i % 5 === 0 ? "#9a5c48" : "#7b7564",
                i % 5 === 0 ? .32 : .13,
            );
        }
        s += polygon(
            [{ x: rx * .3, y: -ry * .72 }, { x: rx * .77, y: -ry * .84 }, { x: rx * .65, y: -ry * .4 }],
            "#d0d8d0",
            `stroke="#936f55" stroke-width=".22"`,
        );
        s += `<path d="M${num(-rx * .65)} ${num(-ry * .74)}Q0 ${num(-ry * 1.15)} ${num(rx * .8)} ${
            num(-ry * .5)
        }" fill="none" stroke="#e6e6d8" stroke-width=".28"/>`;
        s += line(-rx * .6, ry * .7, 0, 0, "#985e47", .65) + line(rx * .6, ry * .7, 0, 0, "#985e47", .65);
        s += circle(0, 0, 1.5, "#5c716b", `stroke="#b8bfa6" stroke-width=".25"`) + circle(0, 0, .55, "#243f39");
        for (const xx of [x + 1.2, -x - 1.2]) {
            for (const yy of [y + 1.2, -y - 1.2]) {
                s += rect(xx - .5, yy - .5, 1, 1, "#c2cbc4", `stroke="#627c76" stroke-width=".12"`);
            }
        }
    } else if (p.kind === "terminal_bench" || p.kind === "bunk") {
        if (p.kind === "bunk") {
            s = base("#4f5f4a")
                + rect(x + .35, y + .45, w - .7, h - .9, "#7a8868", `stroke="#a4a68c" stroke-width=".2"`);
            s += rect(x + .55, y + .65, w - 1.1, h * .2, "#b4b599", `rx=".2"`)
                + rect(x + .55, y + h * .37, w - 1.1, h * .5, "#677959");
            s += line(x + .55, y + h * .42, -x - .55, y + h * .42, "#8f9c7b", .2);
            for (const yy of [y + 1, -y - 1]) s += rect(x + .1, yy, .2, 1, "#b3b59a");
        } else {
            s = base("#405f58");
            const count = Math.max(2, Math.floor(w / 2.4));
            for (let i = 0; i < count; i++) {
                const xx = x + .25 + i * (w - .5) / count;
                const ww = (w - .5) / count - .18;
                s += rect(xx, y + .25, ww, h * .6, paint, `rx=".12" stroke="#9bafa0" stroke-width=".08"`);
                s += line(xx + .1, y + .4, xx + ww - .1, y + .4, "#9db2a2", .08);
            }
            s += line(x + .2, y + h * .87, -x - .2, y + h * .87, "#9eaaa0", .14);
        }
    } else if (p.kind === "baggage_conveyor") {
        s = base("#89978b") + rect(x + .35, y + .35, w - .7, h - .7, "#303e36", `stroke="#afae8c" stroke-width=".12"`);
        if (w < h) {
            for (let yy = y + .7; yy < -y - .4; yy += .7) s += line(x + .5, yy, -x - .5, yy, "#69766b", .13);
            s += rect(-w * .3, -h * .22, w * .6, h * .2, "#987454", `rx=".15" stroke="#263a31" stroke-width=".15"`);
            s += rect(-w * .3, h * .17, w * .6, h * .18, "#6d8371", `rx=".15" stroke="#263a31" stroke-width=".15"`);
        } else {
            for (let xx = x + .7; xx < -x - .4; xx += .7) s += line(xx, y + .5, xx, -y - .5, "#69766b", .13);
            s += rect(-w * .27, -h * .3, w * .19, h * .6, "#a08057", `rx=".15" stroke="#263a31" stroke-width=".15"`);
        }
    } else if (p.kind === "cargo_crate" || p.kind === "provisions" || p.kind === "luggage") {
        s = base(paint) + rect(x + .25, y + .25, w - .5, h - .5, "none", `stroke="#b3a381" stroke-width=".15"`);
        if (p.kind === "luggage") {
            for (const xx of [-w * .24, w * .24]) s += line(xx, y + .2, xx, -y - .2, "#bfa780", .22);
            s += rect(-w * .2, y + .15, w * .4, .25, "#3e4b38");
        } else if (p.kind === "provisions") {
            for (let xx = x + .4; xx < -x - 1; xx += 2.7) {
                s += rect(
                    xx,
                    y + .4,
                    Math.min(2.3, -x - xx - .35),
                    h - .8,
                    "#9e9470",
                    `stroke="#424f38" stroke-width=".13"`,
                );
                s += line(xx + .3, y + h * .48, Math.min(xx + 2, -x - .4), y + h * .48, "#b9ab82", .2);
            }
        } else {
            s += line(x + .45, y + .45, -x - .45, -y - .45, "#594b34", .4)
                + line(-x - .45, y + .45, x + .45, -y - .45, "#594b34", .4);
            s += rect(-w * .15, -h * .18, w * .3, h * .36, "#cab889", `stroke="#6b6346" stroke-width=".12"`);
            s += text(0, .35, "Q", Math.min(w, h) * .23, "#645b3f", `text-anchor="middle"`);
        }
    } else if (p.kind === "generator" || p.kind === "engine_block") {
        s = base("#4b6052") + rect(x + .35, y + .35, w - .7, h - .7, paint, `stroke="#96a18c" stroke-width=".22"`);
        const vertical = h > w;
        for (let i = 0; i < 6; i++) {
            if (vertical) {
                s += rect(
                    x + w * .2,
                    y + h * .17 + i * h * .105,
                    w * .6,
                    h * .065,
                    "#344a3e",
                    `stroke="#9caa92" stroke-width=".12"`,
                );
            } else {s += rect(
                    x + w * .15 + i * w * .11,
                    y + h * .22,
                    w * .075,
                    h * .54,
                    "#344a3e",
                    `stroke="#9caa92" stroke-width=".12"`,
                );}
        }
        s += rect(
            x + .5,
            y + .5,
            Math.min(2.8, w * .22),
            Math.min(2.1, h * .22),
            "#a27653",
            `stroke="#384a36" stroke-width=".15"`,
        );
        s += circle(-x - .8, -y - .8, .35, "#b4aa7f", `stroke="#334c3c" stroke-width=".12"`);
        s += bolt(x + .45, -y - .45) + bolt(-x - .45, y + .45);
    } else if (["audio_console", "helm_console", "ticket_counter", "ticket_booth", "toolbench"].includes(p.kind)) {
        s = base(paint) + rect(x + .3, y + .3, w - .6, h - .6, "#667669", `stroke="#b7b59b" stroke-width=".12"`);
        if (p.kind === "ticket_counter" || p.kind === "ticket_booth" || p.kind === "toolbench") {
            s += rect(x + .4, y + .4, w * .37, h * .35, "#c3bea0");
            s += rect(w * .1, y + .4, w * .27, h * .35, "#344e45", `stroke="#a2b199" stroke-width=".1"`);
            s += line(x + .55, -y - .45, -x - .55, -y - .45, "#3e513f", .14);
            if (p.kind === "toolbench") s += line(-w * .16, -h * .12, w * .16, h * .14, "#c6c6a7", .3);
        } else {
            const count = Math.max(2, Math.floor(w / 3));
            for (let i = 0; i < count; i++) {
                const xx = x + .55 + i * (w - 1) / count;
                s += rect(xx, y + .4, (w - 1) / count - .4, h * .38, "#253e38", `stroke="#a7b6a1" stroke-width=".1"`);
                s += line(xx + .15, y + h * .53, xx + (w - 1) / count - .5, y + h * .53, "#bba777", .1);
                for (let j = 0; j < 3; j++) {
                    s += circle(xx + .2 + j * .38, -y - .65, .09, j === 0 ? "#b89c61" : "#93a585");
                }
            }
        }
    } else if (["transmitter_rack", "switch_cabinet", "battery_bank"].includes(p.kind)) {
        s = base("#3e5550") + rect(x + .25, y + .25, w - .5, h - .5, paint, `stroke="#b3b8a2" stroke-width=".1"`);
        const vertical = h > w;
        const count = Math.max(2, Math.floor((vertical ? h : w) / 2.5));
        for (let i = 0; i < count; i++) {
            const xx = vertical ? x + .45 : x + .45 + i * (w - .9) / count;
            const yy = vertical ? y + .45 + i * (h - .9) / count : y + .45;
            const ww = vertical ? w - .9 : (w - .9) / count - .18;
            const hh = vertical ? (h - .9) / count - .18 : h - .9;
            s += rect(xx, yy, ww, hh, "#31453d", `stroke="#8d9c85" stroke-width=".1"`);
            s += circle(
                xx + ww * .35,
                yy + hh * .4,
                Math.min(ww, hh) * .2,
                "#22392e",
                `stroke="#7c8f77" stroke-width=".1"`,
            );
            s += line(xx + ww * .12, yy + hh * .8, xx + ww * .7, yy + hh * .8, "#819178", .08);
            s += circle(xx + ww * .83, yy + hh * .22, .1, i % 3 === 0 ? "#c49955" : "#98b47e");
        }
    } else if (p.kind === "cable_reel") {
        s = base("#657265");
        const r = Math.min(w, h) * .43;
        s += circle(0, 0, r, "#8e7959", `stroke="#3d4e3b" stroke-width=".25"`);
        for (let i = 0; i < 7; i++) {
            s += circle(
                0,
                0,
                r * (.25 + i * .095),
                "none",
                `stroke="${i % 2 ? "#b3a079" : "#5b5b43"}" stroke-width=".13"`,
            );
        }
        s += circle(0, 0, r * .16, "#273e31") + line(-r * .7, -r * .7, r * .7, r * .7, "#a9956e", .3);
    } else if (p.kind === "antenna_panel") {
        s = base("#5e7475");
        for (let xx = x + .35; xx < -x - .2; xx += 1.2) s += line(xx, y + .3, xx, -y - .3, "#aebbb1", .12);
        s += line(x + .3, y + .3, -x - .3, -y - .3, "#876a54", .25);
    } else if (p.kind === "snow_bank") {
        s = base("#b5c5cc") + rect(x + .12, y + .12, w - .24, h - .24, "#d1dce0", `rx=".5"`);
        s += `<path d="M${num(x + .4)} ${num(h * .13)}Q0 ${num(-h * .35)} ${num(-x - .4)} ${
            num(-h * .12)
        }" fill="none" stroke="#eef0e8" stroke-width=".5"/>`;
        s += `<path d="M${num(x + .4)} ${num(h * .3)}Q0 ${num(h * .05)} ${num(-x - .4)} ${
            num(h * .2)
        }" fill="none" stroke="#99b1be" stroke-width=".22"/>`;
    } else if (p.kind === "lifeboat") {
        s = base("#655e40")
            + rect(x + .2, y + .2, w - .4, h - .4, "#aa7048", `rx="${w * .3}" stroke="#d2ac72" stroke-width=".2"`);
        s += rect(x + w * .16, y + h * .18, w * .68, h * .64, "#c59960", `rx=".7" stroke="#574e37" stroke-width=".18"`);
        for (const yy of [-h * .2, 0, h * .2]) s += rect(x + w * .15, yy - .25, w * .7, .5, "#695e42");
        s += line(-w * .15, -h * .35, w * .15, h * .35, "#c9bd92", .14);
    } else if (p.kind === "crane_base") {
        s = base("#7f7551") + circle(0, 0, Math.min(w, h) * .4, "#596858", `stroke="#b7a26c" stroke-width=".2"`);
        s += rect(-w * .15, -h * .35, w * .3, h * .7, "#b78e4d", `stroke="#4a5339" stroke-width=".2"`);
        s += line(-w * .13, -h * .31, w * .13, h * .31, "#5d6344", .2)
            + line(w * .13, -h * .31, -w * .13, h * .31, "#5d6344", .2);
    } else if (p.kind === "bollard") {
        s = base("#737b61") + circle(0, 0, Math.min(w, h) * .37, "#9a9567", `stroke="#384c35" stroke-width=".15"`);
        s += rect(-w * .37, -h * .1, w * .74, h * .2, "#c0ad75", `rx=".1"`);
    }
    return s;
}

function floorSvg(layout: SurvivalLayout, layer: number) {
    const width = layout.width + APRON * 2;
    const height = layout.height + APRON * 2;
    const sea = layout.key === "highwater" && layer === 0;
    let s = layer === 1 ? "" : rect(-APRON, -APRON, width, height, sea ? "url(#waterGlow)" : "#152738");
    if (sea) s += rect(-APRON, -APRON, width, height, "url(#water)");
    s += outerScenery(layout, layer);
    for (const z of layout.zones.filter(z => z.layer === layer)) s += floorZone(layout, z);
    for (const p of layout.props.filter(p => onLayer(layout, p.zone, layer))) {
        // A soft shadow below each exact footprint never introduces extra collision.
        s += group(
            p.pos.x + .35,
            p.pos.y + .5,
            -90 * (p.ori ?? 0),
            rect(-p.w / 2, -p.h / 2, p.w, p.h, "#15251f", `opacity=".28"`),
        );
        s += group(p.pos.x, p.pos.y, -90 * (p.ori ?? 0), propArt(p, layout.key), `data-prop="${p.id}"`);
    }
    for (const p of layout.props.filter(p => onLayer(layout, p.zone, layer))) {
        if (["ambulance", "evacuation_car"].includes(p.kind)) {
            let marks = "";
            for (const side of [-1, 1]) {
                marks += line(
                    side * p.w * .32,
                    p.h * .45,
                    side * p.w * .32,
                    p.h * .85,
                    "#4d4b35",
                    .25,
                    `opacity=".35"`,
                );
            }
            s += group(p.pos.x, p.pos.y, -90 * (p.ori ?? 0), marks);
        }
        if (["ticket_counter", "audio_console", "ticket_booth"].includes(p.kind)) {
            s += rect(
                p.pos.x + p.w * .4,
                p.pos.y + p.h * .7,
                .7,
                .95,
                "#c6c4a9",
                `opacity=".65" transform="rotate(18 ${num(p.pos.x + p.w * .4)} ${num(p.pos.y + p.h * .7)})"`,
            );
            s += rect(p.pos.x + p.w * .4 + .9, p.pos.y + p.h * .7 + .6, .55, .65, "#bab89d", `opacity=".6"`);
        }
    }
    // Mystery-box locations are flat floor paint, distinct from physical cover.
    for (const box of layout.boxes.filter(b => onLayer(layout, b.zone, layer))) {
        s += rect(
            box.pos.x - 4.7,
            box.pos.y - 2.2,
            9.4,
            4.4,
            "none",
            `stroke="#b69c62" stroke-width=".18" stroke-dasharray=".9 .6" opacity=".58"`,
        );
    }
    s += doorwayArt(layout, layer);
    s += wallArt(layout, layer);
    s += facadeArt(layout, layer);
    s += entryArt(layout, layer);
    s += stairArt(layout, layer);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * PX}" height="${
        height * PX
    }" viewBox="${-APRON} ${-APRON} ${width} ${height}"><defs>${definitions(layout, layer)}</defs>${s}</svg>\n`;
}
function roofSvg(layout: SurvivalLayout, z: SurvivalZone) {
    const r = bounds(z.polygon);
    const mountain = layout.key === "deadair";
    const metal = mountain ? "#485d69" : "#536b60";
    let body = polygon(z.polygon, metal);
    for (let x = r.x0 + .8; x < r.x1; x += 1.6) {
        body += line(x, r.y0, x, r.y1, mountain ? "#637885" : "#728271", .2);
        body += line(x + .3, r.y0, x + .3, r.y1, "#314d49", .12);
    }
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    body += rect(cx - 4, cy - 2.5, 8, 5, "#7f8a7c", `stroke="#263e36" stroke-width=".3"`);
    body += circle(cx - 1.6, cy, 1.4, "#3a5149", `stroke="#9ba38d" stroke-width=".2"`);
    body += line(cx - 2.6, cy - 1, cx - .6, cy + 1, "#82917c", .15);
    body += line(cx - 2.6, cy + 1, cx - .6, cy - 1, "#82917c", .15);
    body += rect(cx + .5, cy - 1.8, 2.5, 3.6, "#5d7061");
    if (mountain) {
        for (let i = 0; i < z.polygon.length; i++) {
            const a = z.polygon[i];
            const b = z.polygon[(i + 1) % z.polygon.length];
            body += line(a.x, a.y, b.x, b.y, "#d1dcdf", 3.4, `stroke-linecap="round"`);
        }
    }
    body += polygon(z.polygon, "none", `stroke="${mountain ? "#b5c5c9" : "#a1a991"}" stroke-width="1.4"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${(r.x1 - r.x0) * PX}" height="${
        (r.y1 - r.y0) * PX
    }" viewBox="${r.x0} ${r.y0} ${r.x1 - r.x0} ${r.y1 - r.y0}"><defs><clipPath id="roof">${
        polygon(z.polygon, "white")
    }</clipPath></defs><g clip-path="url(#roof)">${body}</g></svg>\n`;
}
for (const layout of SurvivalLayouts) {
    for (const layer of [0, 1]) {
        const name = `map-survival-${layout.key}-floor-${layer}.svg`;
        const svg = floorSvg(layout, layer);
        fs.writeFileSync(path.join(OUT, name), svg);
        console.log(`wrote ${name} (${(svg.length / 1024).toFixed(1)} KB)`);
    }
    for (const zone of layout.zones.filter(z => z.roof && z.layer === 0)) {
        const name = `map-survival-${layout.key}-roof-${zone.id}.svg`;
        fs.writeFileSync(path.join(OUT, name), roofSvg(layout, zone));
        console.log(`wrote ${name}`);
    }
}
