import { collider } from "../utils/collider.ts";
import { v2 } from "../utils/v2.ts";
import { lastCallSolidBlock } from "./lastCallObjectDefs.ts";
import type { BuildingDef, MapObjectDef } from "./mapObjectsTyping.ts";
import { floorSprite, propType, roofSprite, roofType, survivalWalls, wallType } from "./maps/survival/geometry.ts";
import { SurvivalLayouts } from "./maps/survival/index.ts";
import {
    bounds,
    buildingType,
    point,
    structureType,
    type SurvivalLayout,
    type SurvivalZone,
    toLocal,
} from "./maps/survival/layout.ts";
import { ZombiePackAPunchType } from "./maps/zombiePackAPunch.ts";

function aabb(layout: SurvivalLayout, zone: SurvivalZone) {
    const r = bounds(zone.polygon);
    return collider.createAabb(toLocal(layout, point(r.x0, r.y1)), toLocal(layout, point(r.x1, r.y0)));
}
function createDefs(): Record<string, MapObjectDef> {
    const defs: Record<string, MapObjectDef> = {};
    for (const layout of SurvivalLayouts) {
        const floor = (layer: number): BuildingDef => {
            const zones = layout.zones.filter(z => z.layer === layer);
            const objects: BuildingDef["mapObjects"] = [];
            const add = (type: string, pos: { x: number; y: number }, ori = 0) =>
                objects.push({ type, pos: toLocal(layout, pos), scale: 1, ori });
            for (const wall of survivalWalls(layout, layer)) {
                const type = wallType(layout, wall);
                defs[type] = wall.kind === "box"
                    ? lastCallSolidBlock({ extents: point(wall.w / 2, wall.h / 2), isWall: true })
                    : {
                        ...lastCallSolidBlock({ extents: point(wall.rad, wall.rad), isWall: true }),
                        collision: collider.createCircle(point(0, 0), wall.rad),
                    };
                add(type, wall.pos);
            }
            for (const prop of layout.props.filter(p => zones.some(z => z.id === p.zone))) {
                const type = propType(layout, prop.id);
                defs[type] = lastCallSolidBlock({ extents: point(prop.w / 2, prop.h / 2), height: prop.height ?? 1 });
                add(type, prop.pos, prop.ori ?? 0);
            }
            for (const door of layout.doors.filter(d => zones.some(z => z.id === d.zones[0]))) {
                if (door.kind === "open") continue;
                const o = door.opening, mid = (o.a0 + o.a1) / 2;
                add(
                    door.kind === "power" ? "zombie_power_gate" : `zombie_buy_gate_${door.cost}`,
                    o.axis === "h" ? point(mid, o.at) : point(o.at, mid),
                    o.axis === "h" ? 0 : 1,
                );
            }
            for (const entry of layout.entries.filter(p => zones.some(z => z.id === p.zone))) {
                add("zombie_spawn_point", entry.pos);
            }
            for (const machine of layout.perks.filter(p => zones.some(z => z.id === p.zone))) {
                add(machine.type, machine.pos);
            }
            for (const spot of layout.boxes.filter(p => zones.some(z => z.id === p.zone))) {
                add("zombie_mystery_box_spot", spot.pos);
            }
            if (zones.some(z => z.id === layout.boxes[0].zone)) add("zombie_mystery_box", layout.boxes[0].pos);
            if (zones.some(z => z.id === layout.power.zone)) add("zombie_power_switch", layout.power.pos);
            if (zones.some(z => z.id === layout.bench.zone)) add(ZombiePackAPunchType, layout.bench.pos);
            // Independently fading roofs keep rooms concealed until approached/entered.
            for (const zone of zones.filter(z => z.roof && layer === 0)) {
                const r = bounds(zone.polygon);
                defs[roofType(layout, zone.id)] = {
                    type: "building",
                    terrain: { grass: true, beach: false },
                    map: { display: false },
                    floor: { surfaces: [], imgs: [] },
                    ceiling: {
                        collision: [aabb(layout, zone)],
                        zoomRegions: [{ zoomIn: aabb(layout, zone), zoom: 36 }],
                        vision: { dist: 6, width: 3, linger: .15, fadeRate: 10 },
                        imgs: [{
                            sprite: roofSprite(layout, zone.id),
                            pos: toLocal(layout, point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)),
                            scale: 1,
                            alpha: 1,
                            tint: 0xffffff,
                        }],
                    },
                    mapObjects: [],
                };
                // Roof children share the same local origin as the parent floor.
                add(roofType(layout, zone.id), point(layout.width / 2, layout.height / 2));
            }
            return {
                type: "building",
                ori: 0,
                terrain: { grass: true, beach: false },
                zIdx: 1,
                map: {
                    display: true,
                    shapes: zones.map(z => ({ collider: aabb(layout, z), color: parseInt(z.color.slice(1), 16) })),
                },
                mapObstacleBounds: zones.map(z => aabb(layout, z)),
                floor: {
                    surfaces: zones.map(z => ({
                        type: z.surface,
                        collision: [aabb(layout, z)],
                        data: { isBright: false },
                    })),
                    imgs: [{
                        sprite: floorSprite(layout, layer),
                        pos: point(0, 0),
                        scale: 1,
                        alpha: 1,
                        tint: 0xffffff,
                    }],
                },
                ceiling: {
                    zoomRegions: zones.map(z => ({ zoomIn: aabb(layout, z), zoom: 36 })),
                    imgs: [],
                    vision: { dist: 6, width: 3, linger: .2, fadeRate: 10 },
                },
                mapObjects: objects,
            };
        };
        defs[buildingType(layout)] = floor(0);
        const undergroundType = `survival_${layout.key}_underground`;
        defs[undergroundType] = floor(1);
        defs[structureType(layout)] = {
            type: "structure",
            ori: 0,
            terrain: { grass: true, beach: false },
            layers: [{ type: buildingType(layout), pos: point(0, 0), ori: 0 }, {
                type: undergroundType,
                pos: point(0, 0),
                ori: 0,
                underground: true,
            }],
            stairs: layout.stairs.map(stair => ({
                collision: collider.createAabbExtents(toLocal(layout, stair.pos), point(3, 4)),
                downDir: point(stair.down.x, -stair.down.y),
            })),
            mask: layout.zones.filter(z => z.layer === 1).map(z => aabb(layout, z)),
            mapObstacleBounds: [
                collider.createAabbExtents(v2.create(0, 0), point(layout.width / 2, layout.height / 2)),
            ],
        };
    }
    return defs;
}
export const SurvivalMapObjectDefs = createDefs();
