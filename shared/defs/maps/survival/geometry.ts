import type { Vec2 } from "../../../utils/v2.ts";
import { bounds, point, type SurvivalLayout } from "./layout.ts";

export type SurvivalWall = { kind: "box"; pos: Vec2; w: number; h: number } | {
    kind: "circle";
    pos: Vec2;
    rad: number;
};
export const SurvivalWallThickness = 1.2;
/** Union shared wall lines, subtract authored door openings, stamp curved/angled edges. */
export function survivalWalls(layout: SurvivalLayout, layer: number): SurvivalWall[] {
    const lines = new Map<string, Array<[number, number]>>();
    const diagonal = new Map<string, [Vec2, Vec2]>();
    const put = (key: string, a: number, b: number) => {
        const list = lines.get(key) ?? [];
        list.push([Math.min(a, b), Math.max(a, b)]);
        lines.set(key, list);
    };
    for (const z of layout.zones.filter(z => z.layer === layer)) {
        for (let i = 0; i < z.polygon.length; i++) {
            const a = z.polygon[i], b = z.polygon[(i + 1) % z.polygon.length];
            if (a.x === b.x) put(`v:${a.x}`, a.y, b.y);
            else if (a.y === b.y) put(`h:${a.y}`, a.x, b.x);
            else {
                const points = [a, b].sort((a, b) => a.x - b.x || a.y - b.y);
                diagonal.set(points.map(p => `${p.x},${p.y}`).join(":"), [points[0], points[1]]);
            }
        }
    }
    const out: SurvivalWall[] = [];
    for (const [key, intervals] of lines) {
        intervals.sort((a, b) => a[0] - b[0]);
        const merged: Array<[number, number]> = [];
        for (const part of intervals) {
            const last = merged.at(-1);
            if (last && part[0] <= last[1] + .001) last[1] = Math.max(last[1], part[1]);
            else merged.push([...part]);
        }
        const [axis, atText] = key.split(":");
        const at = Number(atText);
        let cut = merged;
        for (const door of layout.doors) {
            if (layout.zones.find(z => z.id === door.zones[0])?.layer !== layer) continue;
            const o = door.opening;
            if (o.axis !== axis || o.at !== at) continue;
            cut = cut.flatMap(([lo, hi]): Array<[number, number]> =>
                o.a1 <= lo || o.a0 >= hi
                    ? [[lo, hi]]
                    : [
                        ...(o.a0 > lo ? [[lo, o.a0] as [number, number]] : []),
                        ...(o.a1 < hi ? [[o.a1, hi] as [number, number]] : []),
                    ]
            );
        }
        for (const [a, b] of cut) {
            if (b - a < .01) continue;
            out.push({
                kind: "box",
                pos: axis === "h" ? point((a + b) / 2, at) : point(at, (a + b) / 2),
                w: axis === "h" ? b - a : SurvivalWallThickness,
                h: axis === "h" ? SurvivalWallThickness : b - a,
            });
        }
    }
    for (const [a, b] of diagonal.values()) {
        const count = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .75);
        for (let i = 0; i <= count; i++) {
            out.push({
                kind: "circle",
                pos: point(a.x + (b.x - a.x) * i / count, a.y + (b.y - a.y) * i / count),
                rad: SurvivalWallThickness / 2,
            });
        }
    }
    return out;
}
export function wallType(layout: SurvivalLayout, wall: SurvivalWall): string {
    return wall.kind === "circle"
        ? `survival_${layout.key}_wall_round`
        : `survival_${layout.key}_wall_${Math.round(wall.w * 100)}_${Math.round(wall.h * 100)}`;
}
export const propType = (layout: SurvivalLayout, id: string) =>
    `survival_${layout.key}_fixture_${layout.props.findIndex(prop => prop.id === id)}`;
export const roofType = (layout: SurvivalLayout, id: string) => `survival_${layout.key}_roof_${id}`;
export const floorSprite = (layout: SurvivalLayout, layer: number) => `map-survival-${layout.key}-floor-${layer}.img`;
export const roofSprite = (layout: SurvivalLayout, id: string) => `map-survival-${layout.key}-roof-${id}.img`;
export const floorBounds = (layout: SurvivalLayout, layer: number) =>
    bounds(layout.zones.filter(z => z.layer === layer).flatMap(z => z.polygon));
