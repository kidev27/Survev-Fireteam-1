import { expect, test } from "vitest";

import { ZombieWaveIntermissionTime } from "../../server/src/game/specOpsManager.ts";
import {
    composeZombieWave,
    zombieEnemyHealth,
    ZombieMysteryBoxClaimDuration,
    ZombieMysteryBoxCooldown,
    ZombieMysteryBoxCost,
    ZombieMysteryBoxRelocateUses,
    ZombieMysteryBoxRollDuration,
    ZombieMysteryBoxWeapons,
    ZombieRayGun,
    ZombieEconomy,
    ZombieUpgradeCost,
    zombieWaveCount,
} from "../../server/src/game/zombieMode.ts";
import type { GunDef } from "../../shared/defs/gameObjects/gunDefs.ts";
import { MapDefs } from "../../shared/defs/mapDefs.ts";
import { SpecOpsShopCatalog } from "../../shared/defs/maps/specOpsShop.ts";
import {
    packAPunchBulletType,
    packAPunchType,
    packAPunchUpgradeFor,
    ZombiePackAPunchNames,
    ZombiePackAPunchStats,
    ZombiePackAPunchTracer,
    ZombiePackAPunchType,
} from "../../shared/defs/maps/zombiePackAPunch.ts";
import { FireteamMapPool, ZombieMapPool } from "../../shared/defs/maps/specOpsDefs.ts";
import { ZombiePerkMachines, ZombiePerkMachineTypes } from "../../shared/defs/maps/zombiePerks.ts";
import {
    isZombiePowerUpType,
    ZombieNukeCash,
    ZombiePowerUpDrops,
    zombiePowerUpFlashVisible,
    zombiePowerUpHudFlashPeriod,
    ZombiePowerUpLifetime,
    ZombieTimedPowerUpDuration,
    ZombiePowerUpTypes,
} from "../../shared/defs/maps/zombiePowerUps.ts";
import { GameObjectDefs, MapObjectDefs } from "../../shared/defs/register.ts";
import { GameConfig, TeamMode } from "../../shared/gameConfig.ts";
import { collider } from "../../shared/utils/collider.ts";
import { util } from "../../shared/utils/util.ts";
import { v2 } from "../../shared/utils/v2.ts";
import { createGame } from "./gameTestHelpers.ts";

test("Zombie Survival uses a dedicated, scaling zombie wave profile", () => {
    expect(zombieWaveCount(1, 1)).toBe(6);
    expect(zombieWaveCount(10, 1)).toBeGreaterThan(zombieWaveCount(1, 1));
    expect(zombieWaveCount(10, 4)).toBeGreaterThan(zombieWaveCount(10, 1));
    expect(zombieWaveCount(100, 8)).toBe(48);
    expect(composeZombieWave(3, 1).every((kind) => kind === "zombie_walker")).toBe(true);
    expect(zombieEnemyHealth(10)).toBeGreaterThan(zombieEnemyHealth(1));
    expect(
        ZombieMysteryBoxWeapons.every(
            (weapon) => GameObjectDefs.typeToDefSafe(weapon)?.type === "gun",
        ),
    ).toBe(true);
    expect(zombiePowerUpHudFlashPeriod(1)).toBeLessThan(zombiePowerUpHudFlashPeriod(5));

    const flashes = (start: number, end: number) => {
        let transitions = 0;
        let previous = zombiePowerUpFlashVisible(start);
        for (let age = start + 0.01; age <= end; age += 0.01) {
            const visible = zombiePowerUpFlashVisible(age);
            if (visible !== previous) transitions++;
            previous = visible;
        }
        return transitions;
    };
    expect(flashes(29, 30)).toBeGreaterThan(flashes(25, 26));
});

test("Max Ammo refills every living operator without changing loaded magazines", () => {
    const game = createGame(TeamMode.Duo, "specops_complex");
    const first = game.playerBarn.addTestPlayer({ name: "First" });
    const second = game.playerBarn.addTestPlayer({ name: "Second" });
    game.update(0.1);

    first.weapons[GameConfig.WeaponSlot.Primary].ammo = 3;
    second.weapons[GameConfig.WeaponSlot.Primary].ammo = 5;
    first.invManager.set("9mm", 0);
    second.invManager.set("9mm", 1);
    first.invManager.set("frag", 0);
    second.invManager.set("frag", 1);

    game.specOps!.activateZombiePowerUp("zombie_powerup_max_ammo");

    expect(first.weapons[GameConfig.WeaponSlot.Primary].ammo).toBe(3);
    expect(second.weapons[GameConfig.WeaponSlot.Primary].ammo).toBe(5);
    for (const player of [first, second]) {
        expect(player.invManager.get("9mm")).toBe(player.invManager.getMaxCapacity("9mm"));
        expect(player.invManager.get("frag")).toBe(player.invManager.getMaxCapacity("frag"));
    }
});

test("Zombies: players start without throwables; Max Ammo refills only frags and MIRVs", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const player = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);

    const throwables = Object.keys(player.invManager.items).filter(
        (item) => GameObjectDefs.typeToDefSafe(item)?.type === "throwable",
    ) as Array<keyof typeof player.invManager.items>;
    expect(throwables.length).toBeGreaterThan(2);
    for (const item of throwables) expect(player.invManager.get(item)).toBe(0);

    game.specOps!.activateZombiePowerUp("zombie_powerup_max_ammo");
    for (const item of throwables) {
        const expected = item === "frag" || item === "mirv" ? player.invManager.getMaxCapacity(item) : 0;
        expect(player.invManager.get(item), item).toBe(expected);
    }

    // Throwables a player already owns (e.g. bought strobes) are left alone, not topped up.
    player.invManager.set("strobe", 1);
    game.specOps!.activateZombiePowerUp("zombie_powerup_max_ammo");
    expect(player.invManager.get("strobe")).toBe(1);
});

test("Insta-Kill one-shots walkers, doubles elite damage, and expires for the team", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    const walker = game.specOps!.livingEnemies()[0];
    const elite = game.specOps!.spawnEnemyPublic("juggernaut", true)!;

    game.specOps!.activateZombiePowerUp("zombie_powerup_insta_kill");
    game.specOps!.setNpcIgnoreOperators(true);
    expect(game.specOps!.modifyZombieDamage(elite, operator, 11)).toBe(22);
    walker.damage({
        amount: 1,
        damageType: GameConfig.DamageType.Player,
        dir: v2.create(1, 0),
        source: operator,
    });
    expect(walker.dead).toBe(true);
    expect(operator.zombiePowerUps.instaKill).toBe(ZombieTimedPowerUpDuration);

    game.step(ZombieTimedPowerUpDuration + 0.1);
    expect(game.specOps!.isZombiePowerUpActive("instaKill")).toBe(false);
    expect(operator.zombiePowerUps.instaKill).toBe(0);
});

test("Double Points affects zombie kills and Nuke team cash only", () => {
    const game = createGame(TeamMode.Duo, "specops_complex");
    const first = game.playerBarn.addTestPlayer({ name: "First" });
    const second = game.playerBarn.addTestPlayer({ name: "Second" });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    const [target] = game.specOps!.livingEnemies();

    game.specOps!.activateZombiePowerUp("zombie_powerup_double_points");
    const firstCash = first.specOpsCash;
    target.damage({
        amount: 9999,
        damageType: GameConfig.DamageType.Player,
        dir: v2.create(1, 0),
        source: first,
    });
    expect(first.specOpsCash - firstCash).toBe(ZombieEconomy.killCash * 2);

    const beforeNuke = [first.specOpsCash, second.specOpsCash];
    game.specOps!.activateZombiePowerUp("zombie_powerup_nuke");
    expect(first.specOpsCash - beforeNuke[0]).toBe(ZombieNukeCash * 2);
    expect(second.specOpsCash - beforeNuke[1]).toBe(ZombieNukeCash * 2);
    expect(game.specOps!.livingEnemies()).toHaveLength(0);
});

test("Nuke removes ordinary zombies and takes 35% of an elite's current health", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    const walkers = [...game.specOps!.livingEnemies()];
    const elite = game.specOps!.spawnEnemyPublic("juggernaut", true)!;
    const eliteHealth = elite.health;

    game.specOps!.activateZombiePowerUp("zombie_powerup_nuke");

    expect(walkers.every((walker) => walker.dead)).toBe(true);
    expect(elite.dead).toBe(false);
    expect(elite.health).toBeCloseTo(eliteHealth * 0.65, 5);
    expect(game.lootBarn.loots.some((loot) => isZombiePowerUpType(loot.type))).toBe(false);
});

test("Zombie power-up loot activates on touch and expires when ignored", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const pickup = game.specOps!.spawnZombiePowerUp(
        "zombie_powerup_double_points",
        v2.copy(operator.pos),
        operator.layer,
    )!;

    game.update(0.2);
    expect(pickup.destroyed).toBe(true);
    expect(game.specOps!.isZombiePowerUpActive("doublePoints")).toBe(true);

    const ignored = game.specOps!.spawnZombiePowerUp(
        "zombie_powerup_max_ammo",
        v2.add(operator.pos, v2.create(10, 0)),
        operator.layer,
    )!;
    game.step(ZombiePowerUpLifetime + 0.1);
    expect(ignored.destroyed).toBe(true);
});

test("AI zombies pass through power-ups without collecting or removing them", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    const zombie = game.specOps!.livingEnemies()[0];
    const pickup = game.specOps!.spawnZombiePowerUp(
        "zombie_powerup_insta_kill",
        v2.copy(zombie.pos),
        zombie.layer,
    )!;

    zombie.pickupLoot(pickup);
    game.update(0.2);

    expect(zombie.getClosestLoot()).toBeUndefined();
    expect(pickup.destroyed).toBe(false);
    expect(game.specOps!.isZombiePowerUpActive("instaKill")).toBe(false);
});

function powerUpDrops(game: ReturnType<typeof createGame>) {
    return game.lootBarn.loots.filter((loot) => !loot.destroyed && isZombiePowerUpType(loot.type));
}

function startZombieRound(players = 1) {
    const game = createGame(TeamMode.Solo, "specops_complex");
    for (let i = 0; i < players; i++) game.playerBarn.addTestPlayer({ name: `Operator ${i}` });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    return game;
}

test("Power-up hat hands out every power-up once before repeating", () => {
    const game = startZombieRound();
    const first = Array.from({ length: 4 }, () => game.specOps!.drawZombiePowerUp());
    const second = Array.from({ length: 4 }, () => game.specOps!.drawZombiePowerUp());
    expect([...first].sort()).toEqual([...ZombiePowerUpTypes].sort());
    expect([...second].sort()).toEqual([...ZombiePowerUpTypes].sort());
});

test("Zombie cash earns a drop at the point target, which then grows", () => {
    const game = startZombieRound();
    const ops = game.specOps!;
    const zombie = ops.livingEnemies()[0];
    const start = ZombiePowerUpDrops.pointStart;

    ops.onZombieKilledForDrops(zombie, start - 1, 1);
    expect(powerUpDrops(game)).toHaveLength(0);

    ops.onZombieKilledForDrops(zombie, 101, 1);
    const drops = powerUpDrops(game);
    expect(drops).toHaveLength(1);
    expect(v2.distance(drops[0].pos, zombie.pos)).toBeLessThan(3);
    expect(ops.zombiePointAccumulator).toBeCloseTo(100);
    expect(ops.zombiePointTarget).toBeCloseTo(start * ZombiePowerUpDrops.pointGrowth);
});

test("Each zombie kill has a 2% drop chance", () => {
    const game = startZombieRound();
    const ops = game.specOps!;
    const zombie = ops.livingEnemies()[0];
    ops.onZombieKilledForDrops(zombie, 0, 0.03);
    expect(powerUpDrops(game)).toHaveLength(0);
    ops.onZombieKilledForDrops(zombie, 0, 0.01);
    expect(powerUpDrops(game)).toHaveLength(1);
});

test("At most four power-ups drop per round; the cap resets next round", () => {
    const game = startZombieRound();
    const ops = game.specOps!;
    const zombie = ops.livingEnemies()[0];
    for (let i = 0; i < 10; i++) ops.onZombieKilledForDrops(zombie, 0, 0);
    expect(ops.zombieRoundDrops).toBe(ZombiePowerUpDrops.roundCap);
    expect(powerUpDrops(game)).toHaveLength(4);

    const operator = game.playerBarn.livingPlayers.find((p) => !p.specOpsAi)!;
    for (const enemy of [...ops.livingEnemies()]) {
        enemy.damage({
            amount: 9999,
            damageType: GameConfig.DamageType.Player,
            dir: v2.create(1, 0),
            source: operator,
        });
    }
    game.step(1);
    expect(ops.phase).not.toBe("combat");
    ops.startNextWave();
    expect(ops.wave).toBe(2);
    expect(ops.zombieRoundDrops).toBe(0);
});

test("Bigger teams need more points and luckier kills per drop", () => {
    const game = startZombieRound(3);
    const ops = game.specOps!;
    const scale = ops.zombieDropTeamScale();
    expect(scale).toBeGreaterThan(1.5);
    const zombie = ops.livingEnemies()[0];

    ops.onZombieKilledForDrops(zombie, ZombiePowerUpDrops.pointStart, 1);
    ops.onZombieKilledForDrops(zombie, 0, ZombiePowerUpDrops.killChance * 0.9);
    expect(powerUpDrops(game)).toHaveLength(0);

    ops.onZombieKilledForDrops(zombie, ZombiePowerUpDrops.pointStart * scale, 1);
    expect(powerUpDrops(game)).toHaveLength(1);
});

test("Real zombie kills feed their cash into the drop counter", () => {
    const game = startZombieRound();
    const operator = game.playerBarn.livingPlayers.find((p) => !p.specOpsAi)!;
    const zombie = game.specOps!.livingEnemies()[0];
    zombie.damage({
        amount: 9999,
        damageType: GameConfig.DamageType.Player,
        dir: v2.create(1, 0),
        source: operator,
    });
    expect(game.specOps!.zombiePointAccumulator).toBeGreaterThan(0);
});

test("Fireteam maps run classic Spec Ops and Zombies maps run zombie rules", () => {
    for (const key of FireteamMapPool) {
        expect(MapDefs[key].gameMode.specOpsMode).toBe(true);
        expect(MapDefs[key].gameMode.zombieMode).not.toBe(true);
        expect(MapDefs[key].gameMode.indoorMode).not.toBe(true);
    }
    expect(MapDefs.specops.gameMode.zombieMode).not.toBe(true);
    for (const key of ZombieMapPool) {
        expect(MapDefs[key].desc.name).toBe("Zombie Survival");
        expect(MapDefs[key].gameMode.specOpsMode).toBe(true);
        expect(MapDefs[key].gameMode.zombieMode).toBe(true);
        expect(MapDefs[key].gameMode.indoorMode).toBe(true);
    }
    expect(MapDefs.practice_specops.gameMode.zombieMode).toBe(false);
    expect(MapObjectDefs).not.toHaveProperty("zombie_indoor_arena_01");
});

test("Fireteam matches spawn soldiers, not zombies", () => {
    const game = createGame(TeamMode.Solo, "specops_woods");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    expect(game.specOps?.zombieMode).toBe(false);
});

test("Last Call generates its furnished motel, club, courtyard and garage routes", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);

    const complex = game.map.buildings.find(
        (building) => building.type === "zombie_branching_complex_01",
    );
    expect(complex).toBeDefined();
    expect(complex?.surfaces).toHaveLength(9);
    expect(game.map.width).toBe(256);
    expect(game.map.height).toBe(208);

    const props = new Set(game.map.obstacles.map((obstacle) => obstacle.type));
    expect(props.has("bed_sm_01")).toBe(true);
    expect(props.has("lastcall_bar_club")).toBe(true);
    expect(props.has("lastcall_pool")).toBe(true);
    expect(props.has("zombie_power_switch")).toBe(true);
    expect(props.has("zombie_pack_a_punch")).toBe(true);
    expect(props.has("zombie_garage_car")).toBe(true);
    expect(props.has("zombie_mystery_box")).toBe(true);
    expect(game.map.obstacles.filter((obstacle) => obstacle.type.startsWith("specops_station_")))
        .toHaveLength(0);
    for (const machineType of ZombiePerkMachineTypes) {
        expect(game.map.obstacles.filter((obstacle) => obstacle.type === machineType))
            .toHaveLength(1);
    }
    expect(game.map.obstacles.filter((obstacle) => obstacle.type === "zombie_spawn_point"))
        .toHaveLength(19);

    const gates = game.map.obstacles.filter((obstacle) => obstacle.type.startsWith("zombie_buy_gate_"));
    expect(gates).toHaveLength(9);
    expect(gates.every((gate) => gate.isButton && gate.collidable)).toBe(true);
    expect(
        game.map.obstacles
            .filter((object) => object.parentBuilding === complex && object.isWall)
            .every((wall) => !wall.destructible),
    ).toBe(true);
    // One painted floor for the whole block, generated from the same layout as the walls.
    const definition = MapObjectDefs.typeToDef("zombie_branching_complex_01", "building");
    expect(definition.floor.imgs.map((image) => image.sprite)).toEqual(["map-lastcall-floor.img"]);
    expect(MapDefs.specops_complex.assets.atlases).toContain("lastcall");
    expect(Math.abs(operator.pos.x - (game.map.center.x - 10))).toBeLessThan(8);
    expect(operator.pos.y).toBeLessThan(game.map.center.y - 35);
    expect(
        game.specOps!.ensureNavGraph().hasPath(
            operator,
            v2.add(game.map.center, v2.create(-80, 0)),
        ),
    ).toBe(false);
});

test("Last Call perk machines sell their fixed perks for cash", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    game.specOps!.grantCash(operator, 10_000);
    const startingCash = operator.specOpsCash;

    for (const machineType of ZombiePerkMachineTypes) {
        const machine = game.map.obstacles.find((obstacle) => obstacle.type === machineType)!;
        v2.set(operator.pos, machine.pos);
        game.grid.updateObject(operator);
        machine.interact(operator);
        game.update(0.5);
    }

    const totalCost = ZombiePerkMachineTypes.reduce(
        (sum, machineType) => sum + ZombiePerkMachines[machineType].cost,
        0,
    );
    expect(operator.specOpsCash).toBe(startingCash - totalCost);
    expect(operator.hasPerk("zombie_juggernog")).toBe(true);
    expect(operator.hasPerk("zombie_speed_cola")).toBe(true);
    expect(operator.hasPerk("self_revive")).toBe(true);
    expect(operator.hasPerk("zombie_stamin_up")).toBe(true);
    expect(operator.hasPerk("zombie_double_tap")).toBe(true);
    expect(operator.maxHealth).toBe(250);
    expect(operator.health).toBe(250);
});

test("Zombie Survival automatically starts the next wave after an eight-second breather", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();

    const zombies = game.playerBarn.livingPlayers.filter((player) => player.specOpsAi);
    for (const zombie of zombies) {
        zombie.damage({
            amount: 9999,
            damageType: GameConfig.DamageType.Player,
            dir: v2.create(1, 0),
            source: operator,
        });
    }
    game.update(0.05);

    expect(game.specOps!.phase).toBe("intermission");
    expect(game.specOps!.phaseDuration).toBe(ZombieWaveIntermissionTime);
    expect(game.specOps!.wave).toBe(1);
    game.step(ZombieWaveIntermissionTime - 0.25);
    expect(game.specOps!.wave).toBe(1);
    game.step(0.3);
    expect(game.specOps!.wave).toBe(2);
    expect(game.specOps!.phase).toBe("combat");
});

test("Last Call lobby gates charge cash and permanently open the selected route", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const gate = game.map.obstacles.find(
        (obstacle) =>
            obstacle.type === "zombie_buy_gate_750"
            && obstacle.pos.y < game.map.center.y
            && obstacle.pos.x < game.map.center.x,
    )!;
    const courtyard = v2.add(game.map.center, v2.create(-20, -15));

    expect(game.specOps!.ensureNavGraph().hasPath(operator, courtyard)).toBe(false);

    operator.specOpsCash = 1000;
    v2.set(operator.pos, gate.pos);
    game.grid.updateObject(operator);
    gate.interact(operator);

    expect(operator.specOpsCash).toBe(250);
    expect(gate.destroyed).toBe(true);
    expect(game.specOps!.ensureNavGraph().hasPath(operator, courtyard)).toBe(true);
});

test("Last Call spawns zombies at fixed entries in currently reachable zones", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);

    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    game.update(0.05);

    const zombies = game.playerBarn.livingPlayers.filter((player) => player.specOpsAi);
    const entries = game.map.obstacles.filter((obstacle) => obstacle.type === "zombie_spawn_point");
    expect(zombies.length).toBeGreaterThan(0);
    expect(
        zombies.every((zombie) => game.specOps!.ensureNavGraph().hasPath(zombie, operator.pos)),
    ).toBe(true);
    expect(
        zombies.every((zombie) => entries.some((entry) => v2.distance(zombie.pos, entry.pos) <= 6)),
    ).toBe(true);
});

test("Last Call power opens the garage and enables Pack-a-Punch", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const powerSwitch = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_power_switch")!;
    const powerGate = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_power_gate")!;
    const machine = game.map.obstacles.find((obstacle) => obstacle.type === ZombiePackAPunchType)!;

    expect(game.specOps!.zombiePowerOn).toBe(false);
    expect(machine.button?.canUse).toBe(false);
    v2.set(operator.pos, powerSwitch.pos);
    game.grid.updateObject(operator);
    powerSwitch.interact(operator);

    expect(game.specOps!.zombiePowerOn).toBe(true);
    expect(powerGate.destroyed).toBe(true);
    expect(machine.button?.canUse).toBe(true);
});

function packAPunchGame(teamMode = TeamMode.Solo) {
    const game = createGame(teamMode, "specops_complex");
    const a = game.playerBarn.addTestPlayer({ name: "A" });
    const b = game.playerBarn.addTestPlayer({ name: "B" });
    game.update(0.1);
    const ops = game.specOps!;
    const powerSwitch = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_power_switch")!;
    v2.set(a.pos, powerSwitch.pos);
    game.grid.updateObject(a);
    powerSwitch.interact(a);
    const machine = game.map.obstacles.find((obstacle) => obstacle.type === ZombiePackAPunchType)!;
    const front = v2.add(machine.pos, v2.create(0, -(machine.interactionRad - 0.2)));
    for (const p of [a, b]) {
        v2.set(p.pos, front);
        game.grid.updateObject(p);
        p.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "ak47", 30);
        p.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Primary);
    }
    return { game, ops, a, b, machine };
}

const machineLoot = (game: ReturnType<typeof createGame>, machine: { __id: number }) =>
    game.lootBarn.loots.find((loot) => loot.mysteryBoxId === machine.__id && !loot.destroyed);

test("Pack-a-Punch: Mark II twins exist for upgradable guns and aren't sold", () => {
    expect(Object.keys(ZombiePackAPunchNames)).toContain("m9");
    for (const gun of ZombieMysteryBoxWeapons) {
        expect(gun in ZombiePackAPunchNames, gun).toBe(true);
    }
    for (const [base, name] of Object.entries(ZombiePackAPunchNames)) {
        const def = GameObjectDefs.typeToDef(packAPunchType(base), "gun") as GunDef;
        expect(def.zombieUpgraded).toBe(true);
        expect(def.name).toBe(name);
        // Names are free-form (edited in zombiePackAPunch.ts); they just can't be empty.
        expect(name.trim().length, base).toBeGreaterThan(0);
        expect(def.dualWieldType).toBeUndefined();
        expect(def.ammo).toBe((GameObjectDefs.typeToDef(base, "gun") as GunDef).ammo);
        expect(SpecOpsShopCatalog.some((item) => item.sku === packAPunchType(base))).toBe(false);
    }
    expect(packAPunchUpgradeFor("raygun")).toBeUndefined();
});

test("Pack-a-Punch: gun goes in, works, pops out for the payer, who takes it", () => {
    const { game, ops, a, b, machine } = packAPunchGame(TeamMode.Duo);
    const reserveBefore = a.invManager.get("762mm");
    ops.grantCash(a, ZombieUpgradeCost);
    const paid = a.specOpsCash;
    machine.interact(a);

    // Paid, gun is gone into the machine (its magazine went back to the reserve).
    expect(a.specOpsCash).toBe(paid - ZombieUpgradeCost);
    expect(a.weapons[GameConfig.WeaponSlot.Primary].type).toBe("");
    expect(a.invManager.get("762mm")).toBe(reserveBefore + 30);
    expect(machine.button!.onOff).toBe(true);
    expect(machineLoot(game, machine)).toBeUndefined();

    // Busy: nobody else can start a second upgrade.
    ops.grantCash(b, ZombieUpgradeCost);
    const bCash = b.specOpsCash;
    machine.interact(b);
    expect(b.specOpsCash).toBe(bCash);

    game.step(ZombiePackAPunchStats.upgradeTime + 0.2);
    const loot = machineLoot(game, machine)!;
    expect(loot.type).toBe("ak47_pap");
    expect(loot.mysteryBoxOwnerId).toBe(a.__id);
    expect(machine.button!.onOff).toBe(true);

    // Teammate can't take it.
    b.pickupTicker = 0;
    b.pickupLoot(loot);
    expect(loot.destroyed).toBe(false);

    a.pickupTicker = 0;
    machine.interact(a);
    expect(loot.destroyed).toBe(true);
    const slot = a.weapons.findIndex((w) => w.type === "ak47_pap");
    expect(slot).toBeGreaterThanOrEqual(0);
    const def = GameObjectDefs.typeToDef("ak47_pap", "gun");
    const stats = a.weaponManager.getAmmoStats(def, "ak47_pap");
    const baseStats = a.weaponManager.getAmmoStats(GameObjectDefs.typeToDef("ak47", "gun"), "ak47");
    expect(stats.maxClip).toBe(Math.ceil(baseStats.maxClip * ZombiePackAPunchStats.magazineMult));
    expect(a.weapons[slot].ammo).toBe(stats.maxClip);

    game.step(0.1);
    expect(machine.button!.onOff).toBe(false);
});

test("Pack-a-Punch: an unclaimed gun is lost after the claim window", () => {
    const { game, ops, a, machine } = packAPunchGame();
    ops.grantCash(a, ZombieUpgradeCost);
    machine.interact(a);
    game.step(ZombiePackAPunchStats.upgradeTime + 0.2);
    const loot = machineLoot(game, machine)!;
    expect(loot).toBeDefined();
    game.step(ZombiePackAPunchStats.claimTime - 1);
    expect(loot.destroyed).toBe(false);
    game.step(1.5);
    expect(loot.destroyed).toBe(true);
    expect(a.weapons.some((w) => w.type.startsWith("ak47"))).toBe(false);
    expect(machine.button!.onOff).toBe(false);

    // Machine is free again.
    a.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "mp5", 30);
    a.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Primary);
    ops.grantCash(a, ZombieUpgradeCost);
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(true);
});

test("Pack-a-Punch: refuses Mark II guns, non-upgradable guns, no power, or no cash", () => {
    const { ops, a, machine } = packAPunchGame();
    a.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "ak47_pap", 45);
    ops.grantCash(a, ZombieUpgradeCost);
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(false);
    a.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "raygun", 20);
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(false);
    a.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "ak47", 30);
    a.specOpsCash = ZombieUpgradeCost - 1;
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(false);
    a.specOpsCash = ZombieUpgradeCost;
    ops.zombiePowerOn = false;
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(false);
    ops.zombiePowerOn = true;
    expect(ops.tryUpgradeZombieWeapon(a, machine)).toBe(true);
});

test("Pack-a-Punch: the machine sits clear of walls with room to stand in front", () => {
    const { game, a, machine } = packAPunchGame();
    // No other solid object overlaps the machine.
    for (const other of game.map.obstacles) {
        if (other === machine || other.dead || !other.collidable) continue;
        expect(collider.intersect(machine.collider, other.collider), other.type).toBeFalsy();
    }
    // The pop-out spot and the front of the machine are reachable.
    // A player can stand in front of the machine (where the gun pops out) without hitting anything.
    const front = v2.add(machine.pos, v2.create(0, -(1.8 + a.rad + 0.3)));
    for (const other of game.map.obstacles) {
        if (other.dead || !other.collidable || !util.sameLayer(other.layer, machine.layer)) continue;
        expect(!!collider.intersectCircle(other.collider, front, a.rad), other.type).toBe(false);
    }
});

test("Last Call relocates the Mystery Box after repeated uses", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    const startingPos = v2.copy(box.pos);

    for (let use = 0; use < ZombieMysteryBoxRelocateUses; use++) {
        v2.set(operator.pos, v2.add(box.pos, v2.create(0, -3)));
        game.grid.updateObject(operator);
        game.specOps!.grantCash(operator, ZombieMysteryBoxCost);
        box.interact(operator);
        game.step(
            ZombieMysteryBoxRollDuration
                + ZombieMysteryBoxClaimDuration
                + ZombieMysteryBoxCooldown
                + 0.5,
        );
    }

    expect(v2.distance(box.pos, startingPos)).toBeGreaterThan(4);
    expect(box.button?.canUse).toBe(true);
});

test("Zombie wave one spawns unarmed melee walkers with cash bounties", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);

    expect(game.specOps?.zombieMode).toBe(true);
    game.specOps!.startNextWave();
    game.specOps!.drainWaveSpawnQueuePublic();
    game.update(0.05);

    const zombies = game.playerBarn.livingPlayers.filter((player) => player.specOpsAi);
    expect(zombies).toHaveLength(6);
    expect(zombies.every((zombie) => zombie.name === "Zombie")).toBe(true);
    expect(
        zombies.every((zombie) => !zombie.weapons[GameConfig.WeaponSlot.Primary].type),
    ).toBe(true);
    expect(
        zombies.every((zombie) => zombie.weapons[GameConfig.WeaponSlot.Melee].type === "fists"),
    ).toBe(true);
    expect(zombies.every((zombie) => zombie.specOpsBounty === ZombieEconomy.killCash)).toBe(true);
    expect(zombies.every((zombie) => zombie.health === 42)).toBe(true);
    expect(zombies.every((zombie) => zombie.indoors)).toBe(true);

    const start = v2.copy(zombies[0].pos);
    game.step(0.5);
    expect(v2.distance(zombies[0].pos, start)).toBeGreaterThan(0.05);
});

test("Mystery Box charges once, synchronizes its roll, and replaces the held gun", () => {
    const game = createGame(TeamMode.Duo, "specops_complex");
    const buyer = game.playerBarn.addTestPlayer({ name: "Buyer" });
    const teammate = game.playerBarn.addTestPlayer({ name: "Teammate" });
    game.update(0.1);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    const interactionPos = v2.add(box.pos, v2.create(0, -4.5));
    v2.set(buyer.pos, interactionPos);
    v2.set(teammate.pos, interactionPos);
    game.grid.updateObject(buyer);
    game.grid.updateObject(teammate);

    const startingCash = buyer.specOpsCash;
    expect(startingCash).toBeLessThan(ZombieMysteryBoxCost);
    box.interact(buyer);
    expect(buyer.specOpsCash).toBe(startingCash);
    expect(box.button?.canUse).toBe(true);

    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);
    const paidCash = buyer.specOpsCash;
    box.interact(buyer);
    expect(buyer.specOpsCash).toBe(paidCash - ZombieMysteryBoxCost);
    expect(box.button?.onOff).toBe(true);
    expect(box.button?.canUse).toBe(false);
    let preview = game.lootBarn.loots.find((loot) => loot.mysteryBoxId === box.__id)!;
    expect(preview.mysteryBoxLocked).toBe(true);
    // The cycling preview is any box gun, or the Ray Gun flashing by as a tease.
    expect([...ZombieMysteryBoxWeapons, ZombieRayGun.type]).toContain(preview.type);

    const teammateCash = teammate.specOpsCash;
    box.interact(teammate);
    expect(teammate.specOpsCash).toBe(teammateCash);
    expect(game.lootBarn.loots.filter((loot) => loot.mysteryBoxId === box.__id)).toHaveLength(1);

    game.step(ZombieMysteryBoxRollDuration + 0.2);
    preview = game.lootBarn.loots.find(
        (loot) => loot.mysteryBoxId === box.__id && !loot.destroyed,
    )!;
    expect(preview.mysteryBoxLocked).toBe(false);
    expect(box.button?.canUse).toBe(true);

    buyer.weaponManager.setWeapon(GameConfig.WeaponSlot.Secondary, "glock", 17);
    buyer.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Melee);
    box.interact(buyer);
    expect(preview.destroyed).toBe(false);
    expect(box.button?.canUse).toBe(true);

    const replacedSlot = GameConfig.WeaponSlot.Secondary;
    buyer.weaponManager.setCurWeapIndex(replacedSlot);
    box.interact(buyer);
    expect(preview.destroyed).toBe(true);
    expect(buyer.weapons[replacedSlot].type).toBe(preview.type);
    expect(buyer.weapons[replacedSlot].ammo).toBeGreaterThan(0);
    expect(buyer.weapons[GameConfig.WeaponSlot.Primary].type).toBe("m9");

    game.update(0.1);
    expect(box.button?.onOff).toBe(false);
    expect(box.button?.canUse).toBe(false);
    game.step(ZombieMysteryBoxCooldown + 0.1);
    expect(box.button?.canUse).toBe(true);
});

test("Mystery Box fills an empty gun slot when the player takes it while holding fists", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const buyer = game.playerBarn.addTestPlayer({ name: "Buyer" });
    game.update(0.1);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    v2.set(buyer.pos, v2.add(box.pos, v2.create(0, -4.5)));
    game.grid.updateObject(buyer);
    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);
    box.interact(buyer);
    game.step(ZombieMysteryBoxRollDuration + 0.2);
    const prize = game.lootBarn.loots.find(
        (loot) => loot.mysteryBoxId === box.__id && !loot.destroyed,
    )!;

    expect(buyer.weapons[GameConfig.WeaponSlot.Secondary].type).toBe("");
    buyer.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Melee);
    box.interact(buyer);

    expect(prize.destroyed).toBe(true);
    expect(buyer.weapons[GameConfig.WeaponSlot.Secondary].type).toBe(prize.type);
    expect(buyer.curWeapIdx).toBe(GameConfig.WeaponSlot.Secondary);
});

test("Zombies: E starts round 1 early, but not later rounds", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const ops = game.specOps!;
    game.step(3);
    expect(ops.phase).toBe("prep");
    expect(ops.tryStartWaveEarly(operator)).toBe(true);
    expect(ops.phase).toBe("combat");

    ops.drainWaveSpawnQueuePublic();
    for (const enemy of [...ops.livingEnemies()]) {
        enemy.damage({ amount: 9999, damageType: GameConfig.DamageType.Player, dir: v2.create(1, 0), source: operator });
    }
    game.step(1);
    expect(ops.phase).toBe("intermission");
    game.step(ZombieWaveIntermissionTime - 2);
    expect(ops.tryStartWaveEarly(operator)).toBe(false);
    expect(ops.phase).toBe("intermission");
});

test("Zombies economy: 500 to start, 10 per hit (capped), 60 per kill, +50 for melee, no round bonus", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const ops = game.specOps!;
    expect(operator.specOpsCash).toBe(ZombieEconomy.startingCash);
    ops.startNextWave();
    ops.drainWaveSpawnQueuePublic();
    const [a, b] = ops.livingEnemies();

    const hit = (z: typeof a, amount: number, gameSourceType?: string) =>
        z.damage({ amount, damageType: GameConfig.DamageType.Player, dir: v2.create(1, 0), source: operator, gameSourceType });

    let cash = operator.specOpsCash;
    hit(a, 1);
    expect(operator.specOpsCash - cash).toBe(ZombieEconomy.hitCash);
    a.health = 9999;
    for (let i = 0; i < 30; i++) hit(a, 1);
    expect(a.zombieHitCashPaid).toBe(ZombieEconomy.maxHitCashPerZombie);

    cash = operator.specOpsCash;
    hit(a, 99999);
    expect(operator.specOpsCash - cash).toBe(ZombieEconomy.killCash);

    cash = operator.specOpsCash;
    hit(b, 99999, "fists");
    expect(operator.specOpsCash - cash).toBe(ZombieEconomy.killCash + ZombieEconomy.meleeKillBonus);

    for (const z of [...ops.livingEnemies()]) hit(z, 99999);
    cash = operator.specOpsCash;
    game.step(1);
    expect(ops.phase).toBe("intermission");
    expect(operator.specOpsCash).toBe(cash);
});

function rayGunGame(teamMode = TeamMode.Duo) {
    const game = createGame(teamMode, "specops_complex");
    const a = game.playerBarn.addTestPlayer({ name: "A" });
    const b = game.playerBarn.addTestPlayer({ name: "B" });
    game.update(0.1);
    return { game, ops: game.specOps!, a, b };
}

function giveRayGun(player: { weaponManager: { setWeapon(slot: number, type: string, ammo: number): void } }) {
    player.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, ZombieRayGun.type, 20);
}

test("Ray Gun: wonder weapon def, 50AE, box-only (never in the shop)", () => {
    const def = GameObjectDefs.typeToDef(ZombieRayGun.type, "gun") as GunDef;
    expect(def.wonderWeapon).toBe(true);
    expect(def.ammo).toBe("50AE");
    expect(def.maxClip).toBe(20);
    expect(def.bulletType).toBe("bullet_raygun");
    expect(GameObjectDefs.typeToDef(def.bulletType, "bullet").damage).toBe(180);
    const splash = GameObjectDefs.typeToDef("explosion_raygun", "explosion");
    expect(splash.damage).toBe(90);
    expect(splash.rad.max).toBe(3);
    expect(SpecOpsShopCatalog.some((item) => item.sku === ZombieRayGun.type)).toBe(false);
    expect(ZombieMysteryBoxWeapons).not.toContain(ZombieRayGun.type);
});

test("Ray Gun: box odds follow ZombieRayGun.boxChance, other 22 guns share the rest", () => {
    const { ops, a } = rayGunGame(TeamMode.Solo);
    const chance = ZombieRayGun.boxChance;
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(1);
    expect(ZombieMysteryBoxWeapons).toHaveLength(22);
    expect(ops.rollMysteryBoxResult(a, 0)).toBe(ZombieRayGun.type);
    expect(ops.rollMysteryBoxResult(a, chance * 0.99)).toBe(ZombieRayGun.type);
    for (let i = 0; i < 50; i++) {
        const result = ops.rollMysteryBoxResult(a, chance + (i / 50) * (1 - chance));
        expect(ZombieMysteryBoxWeapons).toContain(result);
    }
    let hits = 0;
    const rolls = 20000;
    for (let i = 0; i < rolls; i++) {
        if (ops.rollMysteryBoxResult(a) === ZombieRayGun.type) hits++;
    }
    // Within ~5 standard deviations of the configured chance.
    const sd = Math.sqrt((chance * (1 - chance)) / rolls);
    expect(Math.abs(hits / rolls - chance)).toBeLessThan(5 * sd);
});

test("Ray Gun: holding one or leaving a dropped one on the floor blocks rolling it; teammates roll their own", () => {
    const { game, ops, a, b } = rayGunGame();
    giveRayGun(a);
    expect(ops.canGetWonderWeapon(a, ZombieRayGun.type)).toBe(false);
    expect(ops.rollMysteryBoxResult(a, 0)).not.toBe(ZombieRayGun.type);
    expect(ops.canGetWonderWeapon(b, ZombieRayGun.type)).toBe(true);

    a.weaponManager.dropGun(GameConfig.WeaponSlot.Primary);
    const dropped = game.lootBarn.loots.find((loot) => loot.type === ZombieRayGun.type && !loot.destroyed)!;
    expect(dropped.droppedById).toBe(a.__id);
    expect(a.hasWonderWeapon(ZombieRayGun.type)).toBe(false);
    expect(ops.canGetWonderWeapon(a, ZombieRayGun.type)).toBe(false);
    expect(ops.canGetWonderWeapon(b, ZombieRayGun.type)).toBe(true);

    dropped.destroy();
    expect(ops.canGetWonderWeapon(a, ZombieRayGun.type)).toBe(true);
});

test("Ray Gun: anyone without one can pick up a dropped one; nobody holds two", () => {
    const { game, a, b } = rayGunGame();
    v2.set(b.pos, v2.copy(a.pos));
    giveRayGun(a);
    giveRayGun(b);
    a.weaponManager.dropGun(GameConfig.WeaponSlot.Primary);
    const dropped = game.lootBarn.loots.find((loot) => loot.type === ZombieRayGun.type && !loot.destroyed)!;

    // b already has one: blocked, loot stays, still one Ray Gun.
    b.weaponManager.setWeapon(GameConfig.WeaponSlot.Secondary, "", 0);
    b.pickupTicker = 0;
    b.pickupLoot(dropped);
    expect(dropped.destroyed).toBe(false);
    expect(b.weapons.filter((w) => w.type === ZombieRayGun.type)).toHaveLength(1);

    // a (no Ray Gun now) can take it back.
    a.pickupTicker = 0;
    a.pickupLoot(dropped);
    expect(dropped.destroyed).toBe(true);
    expect(a.hasWonderWeapon(ZombieRayGun.type)).toBe(true);
});

test("Mystery Box: only the player who paid can take the reveal", () => {
    const { game, a: buyer, b: teammate } = rayGunGame();
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    const near = v2.add(box.pos, v2.create(0, -4.5));
    v2.set(buyer.pos, near);
    v2.set(teammate.pos, v2.copy(near));
    game.grid.updateObject(buyer);
    game.grid.updateObject(teammate);
    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);
    box.interact(buyer);
    game.step(ZombieMysteryBoxRollDuration + 0.2);
    const prize = game.lootBarn.loots.find((loot) => loot.mysteryBoxId === box.__id && !loot.destroyed)!;
    expect(prize.mysteryBoxOwnerId).toBe(buyer.__id);

    teammate.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Melee);
    box.interact(teammate);
    teammate.pickupTicker = 0;
    teammate.pickupLoot(prize);
    expect(prize.destroyed).toBe(false);

    buyer.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Melee);
    buyer.pickupTicker = 0;
    box.interact(buyer);
    expect(prize.destroyed).toBe(true);
});

test("Mystery Box: a Ray Gun roll falls back to a normal gun if the payer got one mid-roll", () => {
    const { game, a: buyer } = rayGunGame(TeamMode.Solo);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    v2.set(buyer.pos, v2.add(box.pos, v2.create(0, -4.5)));
    game.grid.updateObject(buyer);
    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);

    const random = Math.random;
    Math.random = () => 0;
    try {
        box.interact(buyer);
    } finally {
        Math.random = random;
    }
    giveRayGun(buyer);
    game.step(ZombieMysteryBoxRollDuration + 0.2);
    const prize = game.lootBarn.loots.find((loot) => loot.mysteryBoxId === box.__id && !loot.destroyed)!;
    expect(prize.type).not.toBe(ZombieRayGun.type);
    expect(ZombieMysteryBoxWeapons).toContain(prize.type);
});

test("Mystery Box: an eligible payer who rolls the Ray Gun gets it", () => {
    const { game, a: buyer } = rayGunGame(TeamMode.Solo);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    v2.set(buyer.pos, v2.add(box.pos, v2.create(0, -4.5)));
    game.grid.updateObject(buyer);
    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);
    const random = Math.random;
    Math.random = () => 0;
    try {
        box.interact(buyer);
    } finally {
        Math.random = random;
    }
    game.step(ZombieMysteryBoxRollDuration + 0.2);
    const prize = game.lootBarn.loots.find((loot) => loot.mysteryBoxId === box.__id && !loot.destroyed)!;
    expect(prize.type).toBe(ZombieRayGun.type);
    buyer.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Melee);
    box.interact(buyer);
    expect(buyer.hasWonderWeapon(ZombieRayGun.type)).toBe(true);
    const slot = buyer.weapons.findIndex((w) => w.type === ZombieRayGun.type);
    expect(buyer.weapons[slot].ammo).toBe(20);
});

test("Ray Gun splash: 90 near, 45 at the edge, zombies only, 10 to the shooter, none to teammates", () => {
    const { game, ops, a: shooter, b: teammate } = rayGunGame();
    ops.startNextWave();
    ops.drainWaveSpawnQueuePublic();
    const [near, edge, outside, ...others] = ops.livingEnemies();
    const center = v2.copy(shooter.pos);
    for (const z of others) {
        v2.set(z.pos, v2.add(center, v2.create(-40, 40)));
        game.grid.updateObject(z);
    }
    const place = (obj: typeof near, offset: number) => {
        v2.set(obj.pos, v2.add(center, v2.create(0, offset)));
        obj.layer = shooter.layer;
        game.grid.updateObject(obj);
    };
    place(near, near.rad + 1);
    place(edge, edge.rad + 3);
    place(outside, outside.rad + 3.5);
    place(teammate, -(teammate.rad + 1));
    for (const z of [near, edge, outside]) z.health = 9999;
    v2.set(shooter.pos, v2.add(center, v2.create(2, 0)));
    game.grid.updateObject(shooter);
    shooter.specOpsArmor = 0;
    shooter.chest = "";
    shooter.helmet = "";
    const before = {
        near: near.health,
        edge: edge.health,
        outside: outside.health,
        mate: teammate.health,
        shooter: shooter.health,
    };

    ops.rayGunSplash(center, shooter.layer, shooter, 1);
    expect(before.near - near.health).toBeCloseTo(90, 1);
    expect(before.edge - edge.health).toBeCloseTo(45, 1);
    expect(outside.health).toBe(before.outside);
    expect(teammate.health).toBe(before.mate);
    expect(before.shooter - shooter.health).toBeCloseTo(ZombieRayGun.selfDamage, 1);

    // Double Tap style damageMult scales zombie splash; the direct-hit target is skipped.
    const nearHp = near.health;
    const edgeHp = edge.health;
    ops.rayGunSplash(center, shooter.layer, undefined, 2, new Set([edge.__id]));
    expect(nearHp - near.health).toBeCloseTo(180, 1);
    expect(edge.health).toBe(edgeHp);
});

test("Ray Gun bolt: 180 direct hit, splash on neighbours, no full explosion pass", () => {
    const { game, ops, a: shooter } = rayGunGame(TeamMode.Solo);
    ops.startNextWave();
    ops.drainWaveSpawnQueuePublic();
    const [target, neighbour] = ops.livingEnemies();
    const start = v2.copy(shooter.pos);
    // Clear the firing lane of every other player/bot.
    for (const p of game.playerBarn.players) {
        if (p === shooter || p === target || p === neighbour) continue;
        v2.set(p.pos, v2.add(start, v2.create(-40, 40)));
        game.grid.updateObject(p);
    }
    const dir = v2.create(1, 0);
    for (const [z, pos] of [
        [target, v2.add(start, v2.create(6, 0))],
        [neighbour, v2.add(start, v2.create(6 + target.rad + neighbour.rad + 0.6, 0.5))],
    ] as const) {
        v2.set(z.pos, pos);
        z.layer = shooter.layer;
        z.health = 9999;
        game.grid.updateObject(z);
    }
    const t0 = target.health;
    const n0 = neighbour.health;
    const bullet = game.bulletBarn.fireBullet({
        bulletType: "bullet_raygun",
        gameSourceType: ZombieRayGun.type,
        pos: v2.add(start, v2.mul(dir, shooter.rad + 0.1)),
        dir,
        layer: shooter.layer,
        damageMult: 1,
        damageType: GameConfig.DamageType.Player,
        playerId: shooter.__id,
    });
    for (let i = 0; i < 20 && bullet.active; i++) {
        game.bulletBarn.update(0.02);
        game.explosionBarn.update();
    }
    expect(bullet.active).toBe(false);
    expect(t0 - target.health).toBeCloseTo(180, 0);
    expect(n0 - neighbour.health).toBeGreaterThan(40);
    expect(n0 - neighbour.health).toBeLessThanOrEqual(90.5);
    expect(game.explosionBarn.explosions).toHaveLength(0);
    expect(game.explosionBarn.newExplosions.some((e) => e.type === "explosion_raygun")).toBe(true);
});

test("Zombies has no contracts (no Most Wanted)", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const ops = game.specOps!;
    expect(ops.zombieMode).toBe(true);
    expect(ops.contractsEnabled).toBe(false);
});

test("Zombies only ever spawns zombies: no soldiers, bosses, or Ironclads", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const operator = game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const ops = game.specOps!;

    // Non-zombie classes are refused; zombies still spawn.
    expect(() => ops.spawnEnemyPublic("warlord")).toThrow();
    expect(() => ops.spawnEnemyPublic("rifle")).toThrow();
    expect(ops.spawnEnemyPublic("zombie_walker").name).toBe("Zombie");

    // Late-round IR strobes call airstrikes but never summon Ironclads.
    ops.wave = 30;
    const before = ops.livingEnemies().length;
    ops.onHumanStrobeThrown(operator, v2.copy(operator.pos));
    expect(ops.livingEnemies().length).toBe(before);

    // Boss (10/30), mini-boss (7), vest (5/10) and Ironclad-era rounds are plain zombie rounds.
    for (const wave of [7, 10, 30]) {
        ops.wave = wave - 1;
        ops.startNextWave();
        ops.drainWaveSpawnQueuePublic();
    }
    const enemies = ops.livingEnemies();
    expect(enemies.length).toBeGreaterThan(0);
    for (const enemy of enemies) {
        expect(enemy.name).toBe("Zombie");
        expect(enemy.weapons[GameConfig.WeaponSlot.Primary].type).toBe("");
        expect(enemy.weapons[GameConfig.WeaponSlot.Secondary].type).toBe("");
        expect(enemy.specOpsStrobeTank).toBe(false);
        expect(enemy.specOpsSuicideVest).toBe(false);
    }
});

test("Normal zombies wear one of the three zombie bodies, which players can't equip", async () => {
    const { UnlockDefs } = await import("../../shared/defs/gameObjects/unlockDefs.ts");
    const game = createGame(TeamMode.Solo, "specops_complex");
    game.playerBarn.addTestPlayer({ name: "Operator" });
    game.update(0.1);
    const ops = game.specOps!;
    const zombieBodies = ["outfitZombie01", "outfitZombie02", "outfitZombie03"];
    for (const body of zombieBodies) {
        const def = GameObjectDefs.typeToDef(body, "outfit");
        expect(def.skinImg.baseSprite).toBe(`player-base-zombie-${body.slice(-2)}.img`);
        expect(UnlockDefs.unlock_default.unlocks).not.toContain(body);
    }
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add(ops.spawnEnemyPublic("zombie_walker").outfit);
    for (const outfit of seen) expect(zombieBodies).toContain(outfit);
    expect(seen.size).toBeGreaterThan(1);
});

test("Ray Gun: legendary ring on the floor and it flashes by in the box cycle", () => {
    const def = GameObjectDefs.typeToDef(ZombieRayGun.type, "gun") as GunDef;
    expect(def.lootImg.legendaryRing).toBe("loot-circle-legendary-ring.img");
    expect(GameObjectDefs.typeToDef("explosion_legendary_reveal", "explosion").damage).toBe(0);

    const { ops } = rayGunGame(TeamMode.Solo);
    const pick = (previous: string) =>
        (ops as unknown as { pickMysteryBoxWeapon(previous: string): string }).pickMysteryBoxWeapon(previous);
    const seen = new Set<string>();
    let previous = "";
    for (let i = 0; i < 2000; i++) {
        previous = pick(previous);
        seen.add(previous);
    }
    expect(seen.has(ZombieRayGun.type)).toBe(true);
    for (const gun of ZombieMysteryBoxWeapons) expect(seen.has(gun), gun).toBe(true);
    expect(seen.size).toBe(ZombieMysteryBoxWeapons.length + 1);
});

test("Ray Gun: the box reveal plays the legendary burst", () => {
    const { game, a: buyer } = rayGunGame(TeamMode.Solo);
    const box = game.map.obstacles.find((obstacle) => obstacle.type === "zombie_mystery_box")!;
    v2.set(buyer.pos, v2.add(box.pos, v2.create(0, -4.5)));
    game.grid.updateObject(buyer);
    game.specOps!.grantCash(buyer, ZombieMysteryBoxCost);
    const random = Math.random;
    Math.random = () => 0;
    try {
        box.interact(buyer);
    } finally {
        Math.random = random;
    }
    let burst = false;
    const t0 = ZombieMysteryBoxRollDuration + 0.3;
    for (let t = 0; t < t0; t += 0.1) {
        game.explosionBarn.newExplosions.length = 0;
        game.step(0.1);
        burst ||= game.explosionBarn.newExplosions.some((e) => e.type === "explosion_legendary_reveal");
    }
    expect(burst).toBe(true);
    const prize = game.lootBarn.loots.find((loot) => loot.mysteryBoxId === box.__id && !loot.destroyed)!;
    expect(prize.type).toBe(ZombieRayGun.type);
});

test("Dev cheat: set and add cash (clamped to the cap, not counted as earned)", async () => {
    const { Config } = await import("../../server/src/config.ts");
    const { EditMsg } = await import("../../shared/net/editMsg.ts");
    const { SpecOpsCashCap } = await import("../../shared/defs/maps/specOpsShop.ts");
    const game = createGame(TeamMode.Solo, "specops_complex");
    const player = game.playerBarn.addTestPlayer({ name: "Dev" });
    game.update(0.1);
    const allow = Config.debug.allowEditMsg;
    Config.debug.allowEditMsg = true;
    try {
        const earned = player.specOpsCashEarned;
        const send = (setCash: number, addCash: number) => {
            const msg = new EditMsg();
            msg.setCash = setCash;
            msg.addCash = addCash;
            player.processEditMsg(msg);
        };
        send(25000, 0);
        expect(player.specOpsCash).toBe(25000);
        send(-1, 5000);
        expect(player.specOpsCash).toBe(30000);
        send(0, 0);
        expect(player.specOpsCash).toBe(0);
        send(SpecOpsCashCap + 999, 0);
        expect(player.specOpsCash).toBe(SpecOpsCashCap);
        expect(player.specOpsCashEarned).toBe(earned);

        // A plain edit message (no cash fields) leaves cash alone.
        send(-1, 0);
        expect(player.specOpsCash).toBe(SpecOpsCashCap);

        // With edit messages disabled (prod), cheats do nothing.
        Config.debug.allowEditMsg = false;
        send(100, 0);
        expect(player.specOpsCash).toBe(SpecOpsCashCap);
    } finally {
        Config.debug.allowEditMsg = allow;
    }
});

test("Pack-a-Punch: Mark II tracers are visual only (same damage, speed, range)", () => {
    for (const base of Object.keys(ZombiePackAPunchNames)) {
        const gun = GameObjectDefs.typeToDef(base, "gun") as GunDef;
        const upgraded = GameObjectDefs.typeToDef(packAPunchType(base), "gun") as GunDef;
        expect(upgraded.bulletType, base).toBe(packAPunchBulletType(gun.bulletType));
        const orig = GameObjectDefs.typeToDef(gun.bulletType, "bullet");
        const bullet = GameObjectDefs.typeToDef(upgraded.bulletType, "bullet");
        expect(bullet.damage).toBe(orig.damage);
        expect(bullet.speed).toBe(orig.speed);
        expect(bullet.distance).toBe(orig.distance);
        expect(bullet.obstacleDamage).toBe(orig.obstacleDamage);
        expect(bullet.onHit).toBe(orig.onHit);
        expect(bullet.tracerColor).toBe("pap");
        expect(bullet.tracerWidth).toBeCloseTo(orig.tracerWidth * ZombiePackAPunchTracer.widthMult, 6);
        const pellets = gun.bulletCount > 1;
        expect(!!bullet.sparkTrail, base).toBe(!pellets);
        expect(!!bullet.tracerCore, base).toBe(!pellets);
        expect(bullet.glowColor, base).toBeUndefined();
    }
    expect(GameConfig.tracerColors.pap).toBeDefined();
});

test("Pack-a-Punch: a Mark II gun fires its Mark II bullet", () => {
    const game = createGame(TeamMode.Solo, "specops_complex");
    const player = game.playerBarn.addTestPlayer({ name: "P" });
    game.update(0.1);
    player.weaponManager.setWeapon(GameConfig.WeaponSlot.Primary, "ak47_pap", 45);
    player.weaponManager.setCurWeapIndex(GameConfig.WeaponSlot.Primary);
    const papBullet = packAPunchBulletType("bullet_ak47");
    const firedPap = () => game.bulletBarn.bullets.some((b) => b.bulletType === papBullet);
    expect(firedPap()).toBe(false);
    player.shootStart = true;
    player.shootHold = true;
    for (let i = 0; i < 10 && !firedPap(); i++) game.step(0.05);
    expect(firedPap()).toBe(true);
});
