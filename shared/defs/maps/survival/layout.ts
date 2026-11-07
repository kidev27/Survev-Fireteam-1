import { v2, type Vec2 } from "../../../utils/v2.ts";
import type { ZombiePerkMachineType } from "../zombiePerks.ts";

/** Plan coordinates: game units, x right, y down. All authored geometry lives here. */
export interface SurvivalZone {
    id: string;
    name: string;
    layer: 0 | 1;
    polygon: Vec2[];
    color: string;
    surface: string;
    /** Indoor areas have independent roof fade/visibility rather than a map-wide roof. */
    roof?: boolean;
}
export interface SurvivalOpening {
    axis: "h" | "v";
    at: number;
    a0: number;
    a1: number;
}
export interface SurvivalDoor {
    id: string;
    zones: [string, string];
    kind: "open" | "shutter" | "power";
    cost: number;
    opening: SurvivalOpening;
}
export interface SurvivalProp {
    id: string;
    kind: string;
    zone: string;
    pos: Vec2;
    w: number;
    h: number;
    /** 0-3 quarter turns, footprint and art both rotate. */
    ori?: number;
    height?: number;
    color?: string;
}
export interface SurvivalSpot {
    pos: Vec2;
    zone: string;
}
export interface SurvivalStair {
    id: string;
    pos: Vec2;
    /** Direction towards underground in plan space (typically 0,-1). */
    down: Vec2;
    zones: [string, string];
}
export interface SurvivalLayout {
    key: "highwater" | "deadair";
    mapName: "zombie_high_water" | "zombie_dead_air";
    name: string;
    width: number;
    height: number;
    background: string;
    zones: SurvivalZone[];
    doors: SurvivalDoor[];
    props: SurvivalProp[];
    /** Surface window/hatch entries; zombies pursue downstairs using native stairs. */
    entries: SurvivalSpot[];
    spawns: Vec2[];
    startZone: string;
    power: SurvivalSpot;
    bench: SurvivalSpot;
    boxes: SurvivalSpot[];
    perks: Array<SurvivalSpot & { type: ZombiePerkMachineType }>;
    stairs: SurvivalStair[];
}
export const point = (x: number, y: number) => v2.create(x, y);
export const rect = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
) => [point(x0, y0), point(x1, y0), point(x1, y1), point(x0, y1)];
export function bounds(points: Vec2[]) {
    return {
        x0: Math.min(...points.map(p => p.x)),
        y0: Math.min(...points.map(p => p.y)),
        x1: Math.max(...points.map(p => p.x)),
        y1: Math.max(...points.map(p => p.y)),
    };
}
export function contains(points: Vec2[], p: Vec2): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
export const toLocal = (layout: SurvivalLayout, p: Vec2) => point(p.x - layout.width / 2, layout.height / 2 - p.y);
export const fromLocal = (layout: SurvivalLayout, p: Vec2) => point(p.x + layout.width / 2, layout.height / 2 - p.y);
export const zoneAt = (layout: SurvivalLayout, p: Vec2, layer = 0) =>
    layout.zones.find(z => z.layer === layer && contains(z.polygon, p));
export const buildingType = (layout: SurvivalLayout) => `survival_${layout.key}_surface`;
export const structureType = (layout: SurvivalLayout) => `survival_${layout.key}_structure`;
