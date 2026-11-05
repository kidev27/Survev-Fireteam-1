/**
 * Zombies: Pack-a-Punch.
 *
 * Every gun listed in `ZombiePackAPunchNames` gets an upgraded twin gun type,
 * `<gun>_pap` (e.g. `ak47_pap`), generated in gunDefs.ts. The upgraded type
 * copies the original gun and adds the Pack-a-Punch damage, magazine and look.
 */

/**
 * UPGRADED GUN NAMES. Edit these to rename upgraded guns.
 * Key: original gun type. Value: name shown in the HUD, kill feed and pickups.
 * To make another gun upgradable, add it here.
 */
export const ZombiePackAPunchNames: Record<string, string> = {
    m9: "M9 Mark II",
    mp5: "MP5 Mark II",
    mac10: "MAC-10 Mark II",
    ump9: "UMP9 Mark II",
    vector: "Vector Mark II",
    famas: "FAMAS Mark II",
    hk416: "M416 Mark II",
    m4a1: "M4A1-S Mark II",
    ak47: "AK-47 Mark II",
    scar: "SCAR-H Mark II",
    an94: "AN-94 Mark II",
    m870: "M870 Mark II",
    m1100: "M1100 Mark II",
    saiga: "Saiga-12 Mark II",
    spas12: "SPAS-12 Mark II",
    m1014: "Super 90 Mark II",
    deagle: "DEagle 50 Mark II",
    m39: "M39 EMR Mark II",
    sv98: "SV-98 Mark II",
    awc: "AWM-S Mark II",
    dp28: "DP-28 Mark II",
    m249: "M249 Mark II",
    qbb97: "QBB-97 Mark II",
};

/** Upgrade stats (unchanged from the old workbench). */
export const ZombiePackAPunchStats = {
    cost: 5000,
    damageMult: 1.35,
    magazineMult: 1.5,
    /** Seconds the machine works on the gun. */
    upgradeTime: 3,
    /** Seconds the owner has to take the upgraded gun before it is lost. */
    claimTime: 15,
} as const;

/** Upgraded guns' floor/HUD glow and camo colors (client only). */
export const ZombiePackAPunchColors = {
    glow: 0x9b6bff,
    camoA: 0x8a5cff,
    camoB: 0x4fe3ff,
} as const;

/** Map object type of the machine (Last Call). */
export const ZombiePackAPunchType = "zombie_pack_a_punch";

/**
 * Machine sprite geometry. The art is 640x620 px (map-zombie-pap*.svg), packed at
 * `atlasScale` and drawn at `spriteScale`; 16 atlas px = 1 world unit.
 */
export const ZombiePackAPunchSprite = {
    atlasScale: 0.36,
    spriteScale: 0.62,
    /** Core center and intake slot, in art pixels from the image center (+y = down). */
    core: { x: 0, y: -14 },
    slot: { x: 0, y: 165 },
} as const;

const ArtPxToWorld = (ZombiePackAPunchSprite.atlasScale * ZombiePackAPunchSprite.spriteScale) / 16;

/** World offset from the machine center to a point in the art (world +y is up). */
export function packAPunchArtOffset(p: { x: number; y: number }): { x: number; y: number } {
    return { x: p.x * ArtPxToWorld, y: -p.y * ArtPxToWorld };
}

const Suffix = "_pap";

export function packAPunchType(base: string): string {
    return `${base}${Suffix}`;
}

export function isPackAPunchType(type: string): boolean {
    return type.endsWith(Suffix) && type.slice(0, -Suffix.length) in ZombiePackAPunchNames;
}

/** Original gun type for an upgraded gun; other types are returned unchanged. */
export function packAPunchBaseType(type: string): string {
    return isPackAPunchType(type) ? type.slice(0, -Suffix.length) : type;
}

/** Upgraded type for a gun, or undefined if that gun can't be Pack-a-Punched. */
export function packAPunchUpgradeFor(type: string): string | undefined {
    return type in ZombiePackAPunchNames ? packAPunchType(type) : undefined;
}
