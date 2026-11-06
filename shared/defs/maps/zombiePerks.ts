export const ZombiePerkMachineTypes = [
    "zombie_perk_machine_juggernog",
    "zombie_perk_machine_speed_cola",
    "zombie_perk_machine_quick_revive",
    "zombie_perk_machine_stamin_up",
    "zombie_perk_machine_double_tap",
] as const;

export type ZombiePerkMachineType = (typeof ZombiePerkMachineTypes)[number];

/**
 * Perk machines. `maxBuys` (optional) limits how many times each player can
 * buy that perk per game, like BO2's Quick Revive. In a solo game the machine
 * powers down once the player has used them all; in co-op it stays on but
 * tells that player there are no uses left.
 */
export const ZombiePerkMachines: Record<
    ZombiePerkMachineType,
    { perk: string; cost: number; maxBuys?: number }
> = {
    zombie_perk_machine_juggernog: { perk: "zombie_juggernog", cost: 2500 },
    zombie_perk_machine_speed_cola: { perk: "zombie_speed_cola", cost: 1500 },
    zombie_perk_machine_quick_revive: { perk: "self_revive", cost: 500, maxBuys: 3 },
    zombie_perk_machine_stamin_up: { perk: "zombie_stamin_up", cost: 1200 },
    zombie_perk_machine_double_tap: { perk: "zombie_double_tap", cost: 2000 },
};

export function zombiePerkMachine(type: string) {
    return ZombiePerkMachines[type as ZombiePerkMachineType];
}
