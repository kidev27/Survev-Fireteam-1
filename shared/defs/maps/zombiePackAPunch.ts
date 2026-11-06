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
    m9: "Nine Lives",
    mp5: "MP115 Kollider",
    mac10: "Mac Attack",
    ump9: "UMPocalypse",
    vector: "Velocity Vector",
    famas: "Faux Mas",
    hk416: "HK416 Mark II",
    m4a1: "M4A1-S Mark II",
    ak47: "AK-47 Mark II",
    scar: "Legendary Scar",
    an94: "Actuated Neutralizer 94000",
    m870: "One Pump",
    m1100: "Turkey Trotter",
    saiga: "Saga 12",
    spas12: "Heart SPAS-m",
    m1014: "Supernova 9000",
    deagle: "Deserted Eagle",
    m39: "M39 M.A.L.I.C.E",
    sv98: "Sovereign Verdict 98",
    awc: "Intervention",
    dp28: "Death Per Minute",
    m249: "M249 Chainsaw",
    qbb97: "Quantum Bullet Barrage",
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

/** Upgraded guns' floor/HUD glow, camo and tracer colors (client only). */
export const ZombiePackAPunchColors = {
    glow: 0x9b6bff,
    camoA: 0x8a5cff,
    camoB: 0x4fe3ff,
    /** Cyan-white "plasma core" inside a Mark II tracer (the trail is GameConfig.tracerColors.pap). */
    tracerCore: 0xd9faff,
} as const;

/**
 * Mark II tracers (client only; damage, speed and range match the original bullet).
 * Shotgun pellets get the color and thickness but no plasma core or spark trail.
 */
export const ZombiePackAPunchTracer = {
    widthMult: 1.2,
    /** Plasma core width as a fraction of the (already 1.2x) trail width. */
    coreWidthMult: 0.38,
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

/** Mark II copy of a bullet type, e.g. `bullet_ak47` -> `bullet_ak47_pap`. */
export function packAPunchBulletType(bulletType: string): string {
    return `${bulletType}${Suffix}`;
}

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
