import { DeadAir } from "./deadAir.ts";
import { HighWater } from "./highWater.ts";
export const SurvivalLayouts = [HighWater, DeadAir];
export const survivalLayout = (mapName: string) => SurvivalLayouts.find(layout => layout.mapName === mapName);
