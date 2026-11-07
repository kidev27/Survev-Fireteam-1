import { util } from "../../utils/util.ts";
import type { MapDef } from "../mapDefs.ts";
import { DeadAir } from "./survival/deadAir.ts";
import { HighWater } from "./survival/highWater.ts";
import { point, structureType, type SurvivalLayout } from "./survival/layout.ts";
import { ZombieBranchingComplex } from "./zombieIndoorDefs.ts";

function mapDef(layout: SurvivalLayout): MapDef {
    const map = util.cloneDeep(ZombieBranchingComplex) as MapDef;
    map.desc.buttonText = layout.name;
    map.assets.atlases = ["gradient", "loadout", "shared", "main", layout.key];
    const background = parseInt(layout.background.slice(1), 16);
    map.biome.colors = { ...map.biome.colors, background, grass: background, beach: background, underground: 0x111a20 };
    map.biome.valueAdjust = 1;
    map.mapGen.map.baseWidth = layout.width + 32;
    map.mapGen.map.baseHeight = layout.height + 32;
    map.mapGen.places = [{ name: layout.name, pos: point(.5, .5), dontSpawnObjects: true }];
    map.mapGen.customSpawnRules.locationSpawns = [{
        type: structureType(layout),
        pos: point(.5, .5),
        rad: 0,
        retryOnFailure: true,
    }];
    return map;
}
export const ZombieHighWater = mapDef(HighWater);
export const ZombieDeadAir = mapDef(DeadAir);
