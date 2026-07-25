import { EntityDamageCause, system, world } from "@minecraft/server";
import { startDemonClawTrap } from "./demonClawTrap.js";

const BOSS = "zombie:demon_lord";
const CLAW = "zombie:demon_lord_claw";
const MINIONS = ["zombie:hell_brute", "zombie:emberstalker"];
const HELPER_TAG = "zombie:demon_lord_helper";
const REGISTER_EVENT = "zombie:demon_lord_register";
const bosses = new Map();
const A = Object.freeze({ IDLE: 0, ATTACK1: 1, ATTACK2: 2, THORNS: 3, SEISMIC: 4, SWORD: 5, SUMMON: 6, CHARGE1: 7, CHARGE2: 8, PHASE2: 9 });

function safe(id) {
  try {
    const entity = world.getEntity(id);
    return entity?.isValid ? entity : undefined;
  } catch {
    return undefined;
  }
}

function later(ticks, callback) {
  system.runTimeout(() => {
    try {
      callback();
    } catch (error) {
      console.warn(`[Demon Lord] Scheduled action failed: ${error}`);
    }
  }, Math.max(0, ticks));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function direction(from, to) {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const z = to.z - from.z;
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function target(boss, radius = 56) {
  return boss.dimension.getPlayers({ location: boss.location, maxDistance: radius, closest: 1 })[0];
}

function players(boss, location, radius) {
  return boss.dimension.getPlayers({ location, maxDistance: radius });
}

function begin(boss, state, animation, duration, victim) {
  state.busyUntil = system.currentTick + duration;
  boss.setProperty("zombie:animation_state", animation);
  boss.triggerEvent("zombie:script_lock");
  if (victim) {
    boss.teleport(boss.location, {
      facingLocation: { x: victim.location.x, y: victim.location.y + 1, z: victim.location.z }
    });
  }
}

function finish(id, cooldown = 15) {
  const boss = safe(id);
  const state = bosses.get(id);
  if (!boss || !state) return;
  boss.setProperty("zombie:animation_state", A.IDLE);
  boss.triggerEvent("zombie:script_unlock");
  state.busyUntil = 0;
  state.nextAttack = system.currentTick + cooldown;
}

function push(player, origin, horizontal = 0.7, vertical = 0.2) {
  const away = direction(origin, player.location);
  player.applyImpulse({ x: away.x * horizontal, y: vertical, z: away.z * horizontal });
}

function areaHit(boss, location, radius, damage, knockback = 0, effect) {
  for (const player of players(boss, location, radius)) {
    player.applyDamage(damage, { cause: EntityDamageCause.magic, damagingEntity: boss });
    if (knockback) push(player, location, knockback, 0.25);
    if (effect) player.addEffect(effect.id, effect.duration, { amplifier: effect.amplifier, showParticles: true });
  }
}

function frontHit(boss, radius, damage, knockback, minDot) {
  const view = boss.getViewDirection();
  for (const player of players(boss, boss.location, radius)) {
    const toward = direction(boss.location, player.location);
    if (toward.x * view.x + toward.z * view.z < minDot) continue;
    player.applyDamage(damage, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
    push(player, boss.location, knockback, 0.22);
  }
}

function prune(ids) {
  for (const id of ids) if (!safe(id)) ids.delete(id);
}

function spawnHelper(boss, type, location, ids) {
  const entity = boss.dimension.spawnEntity(type, location);
  entity.addTag(HELPER_TAG);
  ids.add(entity.id);
  return entity;
}

function claw(boss, state, location, firstDamage = 16, secondDamage = 8) {
  prune(state.claws);
  if (state.claws.size >= 12) return;
  const entity = spawnHelper(boss, CLAW, location, state.claws);
  startDemonClawTrap(entity);
  const bossId = boss.id;
  const clawId = entity.id;
  later(15, () => {
    const liveBoss = safe(bossId);
    const liveClaw = safe(clawId);
    if (liveBoss && liveClaw) areaHit(liveBoss, liveClaw.location, 1.8, firstDamage, 0.4, { id: "slowness", duration: 40, amplifier: 1 });
  });
  if (secondDamage) {
    later(45, () => {
      const liveBoss = safe(bossId);
      const liveClaw = safe(clawId);
      if (liveBoss && liveClaw) areaHit(liveBoss, liveClaw.location, 1.8, secondDamage, 0.25);
    });
  }
}

function ring(boss, state, radius, count, damage) {
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / count;
    claw(boss, state, {
      x: boss.location.x + Math.cos(angle) * radius,
      y: boss.location.y,
      z: boss.location.z + Math.sin(angle) * radius
    }, damage, 0);
  }
}

function melee(boss, state, victim, heavy) {
  const duration = heavy ? 25 : 30;
  begin(boss, state, heavy ? A.ATTACK2 : A.ATTACK1, duration, victim);
  const id = boss.id;
  later(heavy ? 14 : 17, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (live && liveState) frontHit(live, heavy ? 5 : 4.5, (heavy ? 30 : 22) + (liveState.phase ? 4 : 0), heavy ? 1 : 0.7, heavy ? 0.1 : -0.1);
  });
  if (state.phase) {
    const victimId = victim.id;
    later(duration - 5, () => {
      const live = safe(id);
      const player = safe(victimId);
      const liveState = bosses.get(id);
      if (live && player && liveState) claw(live, liveState, player.location, 10, 0);
    });
  }
  later(duration, () => finish(id, state.phase ? 10 : 14));
}

function thorns(boss, state, victim) {
  begin(boss, state, A.THORNS, 45, victim);
  state.cooldowns.thorns = system.currentTick + (state.phase ? 280 : 360);
  const id = boss.id;
  const velocity = victim.getVelocity();
  const predicted = {
    x: victim.location.x + velocity.x * 8,
    y: victim.location.y,
    z: victim.location.z + velocity.z * 8
  };
  later(8, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (!live || !liveState) return;
    const toward = direction(live.location, predicted);
    const side = { x: -toward.z, z: toward.x };
    const spots = [
      predicted,
      { x: predicted.x + side.x * 2.4, y: predicted.y, z: predicted.z + side.z * 2.4 },
      { x: predicted.x - side.x * 2.4, y: predicted.y, z: predicted.z - side.z * 2.4 }
    ];
    if (liveState.phase) spots.push({ x: predicted.x - toward.x * 2.6, y: predicted.y, z: predicted.z - toward.z * 2.6 });
    for (const spot of spots) claw(live, liveState, spot);
  });
  later(45, () => finish(id, state.phase ? 15 : 20));
}

function seismic(boss, state, victim) {
  begin(boss, state, A.SEISMIC, 43, victim);
  state.cooldowns.seismic = system.currentTick + (state.phase ? 220 : 280);
  const id = boss.id;
  later(20, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (!live || !liveState) return;
    areaHit(live, live.location, 3.2, 28 + (liveState.phase ? 4 : 0), 1.1, { id: "weakness", duration: 70, amplifier: 0 });
    for (const player of players(live, live.location, 3.2)) player.applyImpulse({ x: 0, y: 0.65, z: 0 });
    ring(live, liveState, 3, 6, 14);
  });
  if (state.phase) {
    later(28, () => {
      const live = safe(id);
      const liveState = bosses.get(id);
      if (live && liveState) ring(live, liveState, 6, 6, 16);
    });
  }
  later(43, () => finish(id, state.phase ? 18 : 24));
}

function sword(boss, state, victim) {
  begin(boss, state, A.SWORD, 80, victim);
  state.cooldowns.sword = system.currentTick + (state.phase ? 320 : 400);
  const id = boss.id;
  later(35, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (live && liveState) frontHit(live, 7, 20 + (liveState.phase ? 4 : 0), 0.7, -0.2);
  });
  later(55, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (!live || !liveState) return;
    frontHit(live, liveState.phase ? 12 : 10, 28 + (liveState.phase ? 5 : 0), 1.1, 0.2);
    const view = live.getViewDirection();
    for (let step = 1; step <= 4; step++) {
      later(step * 3, () => {
        const current = safe(id);
        const currentState = bosses.get(id);
        if (current && currentState) claw(current, currentState, {
          x: current.location.x + view.x * step * 2,
          y: current.location.y,
          z: current.location.z + view.z * step * 2
        }, 10, 0);
      });
    }
  });
  later(80, () => finish(id, state.phase ? 20 : 26));
}

function charge(boss, state, victim, predictive) {
  const duration = predictive ? 26 : 24;
  begin(boss, state, predictive ? A.CHARGE2 : A.CHARGE1, duration, victim);
  state.cooldowns.charge = system.currentTick + (state.phase ? 135 : 170);
  const id = boss.id;
  const victimId = victim.id;
  for (let tick = 3; tick <= 12; tick += 3) {
    later(tick, () => {
      const live = safe(id);
      const player = safe(victimId);
      if (!live || !player) return;
      const velocity = predictive ? player.getVelocity() : { x: 0, z: 0 };
      const aim = { x: player.location.x + velocity.x * 6, y: player.location.y, z: player.location.z + velocity.z * 6 };
      const toward = direction(live.location, aim);
      live.applyImpulse({ x: toward.x * 0.42, y: 0.02, z: toward.z * 0.42 });
    });
  }
  later(predictive ? 14 : 12, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (live && liveState) frontHit(live, 4.8, (predictive ? 24 : 30) + (liveState.phase ? 5 : 0), 1.2, -0.15);
  });
  later(duration, () => finish(id, state.phase ? 12 : 16));
}

function summon(boss, state, victim) {
  begin(boss, state, A.SUMMON, 61, victim);
  state.cooldowns.summon = system.currentTick + (state.phase ? 720 : 900);
  const id = boss.id;
  later(36, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (!live || !liveState) return;
    prune(liveState.minions);
    const max = liveState.phase ? 8 : 6;
    const count = Math.min(liveState.phase ? 4 : 3, max - liveState.minions.size);
    const playerCount = players(live, live.location, 18).length;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / Math.max(count, 1);
      const type = playerCount > 1 ? MINIONS[i % 2] : (i === 1 ? MINIONS[1] : MINIONS[0]);
      spawnHelper(live, type, {
        x: live.location.x + Math.cos(angle) * 3.5,
        y: live.location.y,
        z: live.location.z + Math.sin(angle) * 3.5
      }, liveState.minions);
    }
  });
  later(61, () => finish(id, state.phase ? 15 : 20));
}

function phasePulse(boss, state) {
  state.phase = 1;
  state.phasePulseDone = true;
  boss.setProperty("zombie:animation_state", A.PHASE2);
  boss.triggerEvent("zombie:script_lock");
  const id = boss.id;
  later(48, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (!live || !liveState) return;
    const health = live.getComponent("minecraft:health");
    health.setCurrentValue(Math.min(health.effectiveMax ?? 1500, health.currentValue + 140));
    live.addEffect("resistance", 120, { amplifier: 1, showParticles: false });
    ring(live, liveState, 3, 6, 12);
  });
  later(62, () => {
    const live = safe(id);
    const liveState = bosses.get(id);
    if (live && liveState) ring(live, liveState, 6, 6, 14);
  });
}

function createState(boss) {
  let phase = 0;
  try {
    phase = Number(boss.getProperty("zombie:phase")) || 0;
  } catch {}
  const state = {
    busyUntil: 0,
    nextAttack: system.currentTick + 30,
    phase,
    phasePulseDone: phase === 1,
    deathScheduled: false,
    claws: new Set(),
    minions: new Set(),
    cooldowns: { thorns: 0, seismic: 0, sword: 0, charge: 0, summon: system.currentTick + 100 }
  };
  bosses.set(boss.id, state);
  return state;
}

function choose(boss, state, victim) {
  const now = system.currentTick;
  const range = distance(boss.location, victim.location);
  const velocity = victim.getVelocity();
  const moving = Math.abs(velocity.x) + Math.abs(velocity.z) > 0.05;
  const playerCount = range <= 12 ? players(boss, boss.location, 12).length : 1;
  if (playerCount >= 2 && now >= state.cooldowns.seismic) return "seismic";
  if (range <= 5) {
    if (now >= state.cooldowns.seismic && Math.random() < 0.18) return "seismic";
    return Math.random() < 0.45 ? "heavy" : "sweep";
  }
  if (range <= 14) {
    if (now >= state.cooldowns.sword && Math.random() < 0.35) return "sword";
    if (now >= state.cooldowns.charge && moving) return "charge";
    if (now >= state.cooldowns.thorns) return "thorns";
    return "sword";
  }
  if (now >= state.cooldowns.thorns && (!moving || Math.random() < 0.55)) return "thorns";
  if (now >= state.cooldowns.charge) return "charge";
  if (now >= state.cooldowns.summon) return "summon";
  return "thorns";
}

function processBoss(boss) {
  const state = bosses.get(boss.id) ?? createState(boss);
  const variant = boss.getComponent("minecraft:variant")?.value ?? 1;
  if (variant === 10) {
    state.busyUntil = Number.MAX_SAFE_INTEGER;
    if (!state.deathScheduled) {
      state.deathScheduled = true;
      const id = boss.id;
      later(100, () => {
        const live = safe(id);
        if (!live) return;
        live.runCommand("kill @s");
      });
    }
    return;
  }
  if (variant >= 2 && !state.phasePulseDone) {
    phasePulse(boss, state);
    return;
  }
  if (variant === 2 || system.currentTick < state.busyUntil || system.currentTick < state.nextAttack) return;
  const victim = target(boss);
  if (!victim) {
    boss.setProperty("zombie:animation_state", A.IDLE);
    boss.triggerEvent("zombie:script_unlock");
    return;
  }
  const attack = choose(boss, state, victim);
  if (attack === "sweep") melee(boss, state, victim, false);
  else if (attack === "heavy") melee(boss, state, victim, true);
  else if (attack === "thorns") thorns(boss, state, victim);
  else if (attack === "seismic") seismic(boss, state, victim);
  else if (attack === "sword") sword(boss, state, victim);
  else if (attack === "charge") {
    const velocity = victim.getVelocity();
    charge(boss, state, victim, velocity.x * velocity.x + velocity.z * velocity.z > 0.01);
  } else summon(boss, state, victim);
}

function cleanup(state) {
  for (const id of state.claws) safe(id)?.remove();
  for (const id of state.minions) safe(id)?.remove();
}

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  if (deadEntity.typeId !== BOSS) return;
  const state = bosses.get(deadEntity.id);
  if (state) cleanup(state);
  bosses.delete(deadEntity.id);
});

function scheduleBoss(id) {
  system.runTimeout(() => {
    const state = bosses.get(id);
    if (!state) return;

    const boss = safe(id);
    if (!boss) {
      cleanup(state);
      bosses.delete(id);
      return;
    }

    try {
      processBoss(boss);
    } catch (error) {
      console.warn(`[Demon Lord] Decision failed: ${error}`);
      state.nextAttack = system.currentTick + 20;
    }

    scheduleBoss(id);
  }, 5);
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== REGISTER_EVENT) return;
  const boss = event.sourceEntity;
  if (!boss || boss.typeId !== BOSS || bosses.has(boss.id)) return;

  createState(boss);
  scheduleBoss(boss.id);
});
