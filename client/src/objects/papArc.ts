import * as PIXI from "pixi.js-legacy";

import { ZombiePackAPunchColors } from "../../../shared/defs/maps/zombiePackAPunch.ts";
import { util } from "../../../shared/utils/util.ts";
import { v2, type Vec2 } from "../../../shared/utils/v2.ts";
import type { Camera } from "../camera.ts";
import type { Renderer } from "../renderer.ts";
import type { ParticleBarn } from "./particles.ts";
import type { Player, PlayerBarn } from "./player.ts";

/**
 * Pack-a-Punch chain lightning: one short-lived jagged bolt per chain hop
 * (BO3 style). The server sends a visual-only `chainArc` bullet per hop; this
 * draws it as a purple glow with a cyan-white core that holds at full
 * brightness, flickers, then fades. Each zombie it touches gets a short
 * electric flash so it's obvious the jump landed.
 *
 * Cost: bolts are pooled and capped, and the geometry is rebuilt only on a
 * flicker tick (not every frame). Camera moves just reposition and rescale.
 */
/**
 * Each bolt lives for its gun's `arcLife` (BulletDef.chainArc.life, set from
 * ZombiePackAPunchSpecials). It stays at full brightness for this fraction of
 * that time, then fades.
 */
const ArcHoldFraction = 0.5;
const FlickerInterval = 0.08;
const MaxArcs = 40;
/** How close (beyond its radius) a player must be to a bolt end to get the flash. */
const FlashReach = 1.5;
/** World units between bolt kinks, and the most kinks one bolt may have. */
const SegmentLength = 0.55;
const MaxSegments = 12;
/**
 * Geometry is built at this many pixels per world unit and the graphic is
 * scaled to the live camera zoom, so round caps tessellate smoothly.
 */
const DrawScale = 32;

interface Arc {
    gfx: PIXI.Graphics;
    active: boolean;
    from: Vec2;
    /** Bolt end, relative to `from`. */
    delta: Vec2;
    layer: number;
    age: number;
    /** Total seconds on screen, and seconds at full brightness. */
    life: number;
    hold: number;
    flicker: number;
    sparked: boolean;
}

export class PapArcBarn {
    arcs: Arc[] = [];
    /** Zombies already flashed this frame (a mid-chain zombie ends one bolt and starts the next). */
    private flashed = new Set<number>();

    add(from: Vec2, dir: Vec2, length: number, life: number, layer: number, renderer: Renderer) {
        let arc = this.arcs.find((a) => !a.active);
        if (!arc) {
            if (this.arcs.length < MaxArcs) {
                arc = {
                    gfx: new PIXI.Graphics(),
                    active: false,
                    from: v2.create(0, 0),
                    delta: v2.create(0, 0),
                    layer: 0,
                    age: 0,
                    life: 0,
                    hold: 0,
                    flicker: 0,
                    sparked: false,
                };
                this.arcs.push(arc);
            } else {
                // Heavy fights: recycle the bolt closest to disappearing instead of growing.
                arc = this.arcs.reduce((a, b) => (b.life - b.age < a.life - a.age ? b : a));
            }
        }
        arc.active = true;
        arc.from = v2.copy(from);
        arc.delta = v2.mul(dir, length);
        arc.layer = layer;
        arc.age = 0;
        arc.life = Math.max(0.05, life);
        arc.hold = arc.life * ArcHoldFraction;
        arc.flicker = 0;
        arc.sparked = false;
        arc.gfx.visible = true;
        renderer.addPIXIObj(arc.gfx, layer, 21);
        this.redraw(arc);
    }

    update(dt: number, particleBarn: ParticleBarn, playerBarn: PlayerBarn) {
        this.flashed.clear();
        for (let i = 0; i < this.arcs.length; i++) {
            const arc = this.arcs[i];
            if (!arc.active) continue;
            if (!arc.sparked) {
                arc.sparked = true;
                const end = v2.add(arc.from, arc.delta);
                // Zap flash on the zombies at both ends of the bolt.
                for (const pos of [arc.from, end]) {
                    const zombie = this.playerAt(playerBarn, pos);
                    if (zombie && !this.flashed.has(zombie.__id)) {
                        this.flashed.add(zombie.__id);
                        particleBarn.addParticle(
                            "papShockFlash",
                            zombie.layer,
                            v2.create(0, 0),
                            v2.create(0, 0),
                            1,
                            Math.random() * Math.PI * 2,
                            zombie.container,
                        );
                    }
                }
                for (let j = 0; j < 4; j++) {
                    particleBarn.addParticle(
                        "papTrailSpark",
                        arc.layer,
                        end,
                        v2.mul(v2.randomUnit(), util.random(1.5, 4)),
                    );
                }
            }
            arc.age += dt;
            if (arc.age >= arc.life) {
                arc.active = false;
                arc.gfx.visible = false;
                arc.gfx.clear();
                continue;
            }
            // Re-roll the shape only while at full brightness; a fading bolt stays still.
            arc.flicker += dt;
            if (arc.age < arc.hold && arc.flicker >= FlickerInterval) {
                arc.flicker = 0;
                this.redraw(arc);
            }
            const fade = Math.max(0, (arc.age - arc.hold) / (arc.life - arc.hold));
            arc.gfx.alpha = 1 - fade * fade;
        }
    }

    /** Living player whose body is at `pos` (bolt ends sit on zombie centres). */
    private playerAt(playerBarn: PlayerBarn, pos: Vec2): Player | undefined {
        const players = playerBarn.playerPool.m_getPool();
        let best: Player | undefined;
        let bestDist = Infinity;
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            if (!p.active || p.m_netData.m_dead) continue;
            const dist = v2.length(v2.sub(p.m_pos, pos)) - p.m_rad;
            if (dist < FlashReach && dist < bestDist) {
                best = p;
                bestDist = dist;
            }
        }
        return best;
    }

    render(camera: Camera) {
        // Screen pixels per world unit (m_pixels(1) is only the zoom factor).
        const scale = camera.m_z();
        for (let i = 0; i < this.arcs.length; i++) {
            const arc = this.arcs[i];
            if (!arc.active) continue;
            const screen = camera.m_pointToScreen(arc.from);
            arc.gfx.position.set(screen.x, screen.y);
            arc.gfx.scale.set(scale / DrawScale, scale / DrawScale);
        }
    }

    /** Rebuild the jagged path (DrawScale px per world unit, y flipped for screen space). */
    private redraw(arc: Arc) {
        const len = v2.length(arc.delta);
        const S = DrawScale;
        const n = Math.max(3, Math.min(MaxSegments, Math.ceil(len / SegmentLength)));
        const dx = arc.delta.x * S;
        const dy = -arc.delta.y * S;
        // Unit normal for sideways jitter.
        const nx = len > 0.001 ? -dy / (len * S) : 0;
        const ny = len > 0.001 ? dx / (len * S) : 1;
        const amp = Math.min(0.35, 0.1 + len * 0.04) * S;

        const xs: number[] = [0];
        const ys: number[] = [0];
        for (let i = 1; i < n; i++) {
            const t = i / n;
            // Taper the jitter so the bolt is pinned at both ends.
            const off = (Math.random() * 2 - 1) * amp * Math.sin(t * Math.PI);
            xs.push(dx * t + nx * off);
            ys.push(dy * t + ny * off);
        }
        xs.push(dx);
        ys.push(dy);

        const g = arc.gfx;
        g.clear();
        this.stroke(g, xs, ys, 0.8 * S, ZombiePackAPunchColors.glow, 0.5);
        this.stroke(g, xs, ys, 0.34 * S, ZombiePackAPunchColors.camoA, 0.9);
        this.stroke(g, xs, ys, 0.14 * S, ZombiePackAPunchColors.tracerCore, 1);

        // One short side fork from a random kink for a less "drawn" look.
        if (n >= 4) {
            const k = 1 + Math.floor(Math.random() * (n - 2));
            const side = Math.random() < 0.5 ? -1 : 1;
            const fx = xs[k] + (dx / n) * 0.8 + nx * side * amp * 1.6;
            const fy = ys[k] + (dy / n) * 0.8 + ny * side * amp * 1.6;
            this.stroke(g, [xs[k], fx], [ys[k], fy], 0.26 * S, ZombiePackAPunchColors.camoA, 0.65);
            this.stroke(g, [xs[k], fx], [ys[k], fy], 0.09 * S, ZombiePackAPunchColors.tracerCore, 0.9);
        }
    }

    private stroke(g: PIXI.Graphics, xs: number[], ys: number[], width: number, color: number, alpha: number) {
        g.lineStyle({ width, color, alpha, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
        g.moveTo(xs[0], ys[0]);
        for (let i = 1; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
    }
}
