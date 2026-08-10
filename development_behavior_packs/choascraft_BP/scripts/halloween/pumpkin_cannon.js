import { system, world, ItemStack, EquipmentSlot } from "@minecraft/server";

/*───────────────── CONFIG ─────────────────*/
export const AMMO_PROJECTILE_ID = "zombie:chargedammopumpkin";
export const RUNTIME_PROXY_ID   = "minecraft:snowball";
export const PROJECTILE_TAG     = "zc_charged";
export const PUMPKIN_ID         = "minecraft:carved_pumpkin";
export const SEARCH_RADIUS      = 3.0;

/*────────────── utils ───────────*/
export const isValid = (e) => !!e && (e.isValid !== false);
const isNPCvanilla = (e) => e?.typeId === "minecraft:npc";
const isNPCcustom  = (e) => { try { const t = e.getTags?.() ?? []; return t.includes("npc") || t.includes("is_npc"); } catch { return false; } };

function pickDim(dimLike) {
  try {
    const id  = dimLike?.id || "overworld";
    const dim = (typeof world.getDimension === "function" ? world.getDimension(id) : null) || dimLike || world.overworld;
    return dim;
  } catch { return world.overworld; }
}

async function execCmd(dimLike, cmd) {
  const dim = pickDim(dimLike);
  try {
    if (typeof dim.runCommandAsync === "function") return await dim.runCommandAsync(cmd);
    if (typeof dim.runCommand === "function")       return dim.runCommand(cmd);
  } catch (e) { throw e; }
  throw new TypeError("No runCommand or runCommandAsync on dimension");
}

/*──────────── inventory helpers ───────────*/
function hasEmptySlot(player){
  const inv = player.getComponent("minecraft:inventory"); if (!inv) return false;
  const c = inv.container; for (let i=0;i<c.size;i++) if (!c.getItem(i)) return true; return false;
}
function tryAddToInventory(player, stack){
  const inv = player.getComponent("minecraft:inventory"); if (!inv) return false;
  const c = inv.container;
  if (typeof c.addItem === "function") { try { c.addItem(stack); return true; } catch {} }
  for (let i=0;i<c.size;i++) if (!c.getItem(i)) { c.setItem(i, stack); return true; }
  return false;
}
function copyStack(s){ if (!s) return; try { return typeof s.clone==="function" ? s.clone() : new ItemStack(s.typeId, s.amount??1); } catch { return new ItemStack(s.typeId, s.amount??1); } }

/*──────────── find nearby from projectile ───────────*/
function d2(a,b){ const dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z; return dx*dx+dy*dy+dz*dz; }

function queryNearbyEntities(center, radius){
  const {x,y,z}=center.location;
  try {
    if (typeof world.getEntities==="function") {
      return world.getEntities({ location:{x,y,z}, maxDistance: radius });
    }
  } catch {}
  const out=[]; const dim=center.dimension;
  if (typeof dim?.getEntitiesAtBlockLocation!=="function") return out;
  for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++){
    try {
      const list = dim.getEntitiesAtBlockLocation({x:Math.floor(x)+dx,y:Math.floor(y)+dy,z:Math.floor(z)+dz})||[];
      for (const e of list) out.push(e);
    } catch {}
  }
  return out;
}

export function findNearestTargetFromProjectile(proj){
  const candidates = queryNearbyEntities(proj, SEARCH_RADIUS);
  let best=null, bestScore=Number.POSITIVE_INFINITY;
  for (const e of candidates){
    if (!isValid(e) || e===proj) continue;
    if (e.typeId === AMMO_PROJECTILE_ID || e.typeId === RUNTIME_PROXY_ID) continue;
    if (e.typeId === "minecraft:item" || e.typeId === "minecraft:xp_orb") continue;
    if (isNPCvanilla(e) || isNPCcustom(e)) continue;
    const score = d2(e.location, proj.location);
    if (score < bestScore){ bestScore=score; best=e; }
  }
  return best;
}

export function isOurProjectile(entity){
  if (!isValid(entity)) return false;
  if (entity.typeId === AMMO_PROJECTILE_ID) return true;
  if (entity.typeId === RUNTIME_PROXY_ID) {
    try { return (entity.getTags?.() ?? []).includes(PROJECTILE_TAG); } catch {}
  }
  return false;
}

/*────── non-player path: replaceitem ─────*/
async function forceEquipCarvedPumpkinCmd(target) {
  const tag = `zc_h_${Math.random().toString(36).slice(2,8)}`;
  try { target.addTag(tag); } catch {}

  const cmdOld = `replaceitem entity @e[tag=${tag},c=1] slot.armor.head 0 carved_pumpkin`;
  const cmdNew = `item replace entity @e[tag=${tag},limit=1] armor.head with minecraft:carved_pumpkin 1`;

  try {
    await execCmd(target.dimension, cmdOld);
  } catch {
    try {
      await execCmd(target.dimension, cmdNew);
    } catch {}
  } finally {
    system.runTimeout(() => { try { target.removeTag(tag); } catch {} }, 0);
  }
}

/*──────────────────── core: pumpkinize ────────────────────*/
export function pumpkinize(target){
  if (!isValid(target)) return;
  // skip NPCs
  if (isNPCvanilla(target) || isNPCcustom(target)) return;

  const isPlayer = target.typeId === "minecraft:player";
  const eq = target.getComponent?.("minecraft:equippable");
  const headSlot = (EquipmentSlot && EquipmentSlot.Head) ?? "head";

  if (isPlayer){
    if (!eq) return;
    const cur = eq.getEquipment?.(headSlot);
    if (cur){
      if (!hasEmptySlot(target)) return;
      const copy = copyStack(cur); if (!copy) return;
      if (!tryAddToInventory(target, copy)) return;
    }
    eq.setEquipment?.(headSlot, new ItemStack(PUMPKIN_ID, 1));
    return;
  }

  // non-players
  forceEquipCarvedPumpkinCmd(target);
}
