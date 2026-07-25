// pumpkin_scythe.js — Stable 2.6d • CC v2
// Spec:
// - 2D + Crouch + Use/ALT:
//     • If 2D lore has §eCharges: N > 0 → swap to 3D using those charges (NO XP COST)
//     • Else → cost 5 levels, set §eCharges: 5, swap to 3D
// - 3D + Use (primary): summon 1 zombie:trick_or_treat_zombie, auto-tame to summoner, consume 1 charge; at 0 → auto-revert (strips charges)
// - 3D + Crouch + Use/ALT: manual revert to 2D (FREE) and KEEP remaining charges on the 2D’s lore
// - On-hit: say "hi" (testing)
//
// 2.6d change: safer write-back of held item — never guesses slot 0; only writes container if we can prove the hotbar index.

import {
  ItemStack,
  EquipmentSlot,
  system,
  EnchantmentType,
} from "@minecraft/server";

/* ───────── IDs / CONFIG ───────── */
const BASE_ID     = "zombie:pumpkin_scythe";
const THREE_DID   = "zombie:pumpkin_scythe_3d";

const COST_CHARGE = 5;                // levels to load charges
const CHARGE_LOAD = 5;                // charges to grant when paying XP
const SUMMON_ID   = "zombie:trick_or_treat_zombie"; // your custom mob id

const COOLDOWN_MS = 350;              // debounce
const DEBUG = false;

/* ───────── internals ───────── */
const lastUse = new Map(); // player.id -> ms

/* ───────── XP helpers ───────── */
function getLevels(player) {
  try {
    const xp = player.getComponent("minecraft:experience") || player.getComponent("experience");
    if (xp && typeof xp.level === "number") return xp.level | 0;
  } catch {}
  return (typeof player.level === "number" ? (player.level | 0) : 0);
}

async function tryRemoveLevelsNow(player, lv) {
  try {
    const xp = player.getComponent("minecraft:experience") || player.getComponent("experience");
    if (xp) {
      if (typeof xp.addLevels === "function") { xp.addLevels(-lv); return true; }
      if (typeof xp.level === "number") { xp.level = Math.max(0, (xp.level | 0) - lv); return true; }
    }
  } catch {}
  try { await player.runCommandAsync(`xp -${lv}L @s`); return true; } catch {}
  try { player.runCommand(`xp -${lv}L @s`); return true; } catch {}
  return false;
}

/* ───────── item data helpers ───────── */
function getDur(src){ try { return src.getComponent("durability")?.damage ?? 0; } catch { return 0; } }
function setDur(dst,d){ try { const c=dst.getComponent("durability"); if(c) c.damage=Math.max(0,d|0); } catch {} }

function copyLore(src,dst){ try { dst.setLore(src.getLore()); } catch {} }
function copyName(src,dst){
  try {
    if (typeof src.nameTag === "string" && src.nameTag.length) dst.nameTag = src.nameTag;
    if (typeof dst.setName === "function" && typeof src.getName === "function") {
      const n = src.getName(); if (n) dst.setName(n);
    }
  } catch {}
}

function copyEnchants(src,dst){
  let from=null,to=null;
  try { from = src.getComponent("minecraft:enchantable"); } catch {}
  try { to   = dst.getComponent("minecraft:enchantable"); } catch {}
  if (!from || !to) return;
  try { to.removeAllEnchantments?.(); } catch {}
  try {
    if (typeof from.getEnchantments === "function") {
      for (const e of from.getEnchantments()) {
        let type = e.type;
        if (!type || typeof type !== "object") {
          const id = (e.id ?? e.type ?? "").toString().replace(/^minecraft:/, "");
          type = new EnchantmentType(id);
        }
        to.addEnchantment?.({ type, level: e.level|0 });
      }
      return;
    }
  } catch {}
}

function cloneWithData(newId, src){
  const out = new ItemStack(newId, src.amount);
  setDur(out, getDur(src));
  copyLore(src, out);
  copyName(src, out);
  copyEnchants(src, out);
  return out;
}

/* ───────── lore/charges helpers ───────── */
const CHARGE_RX = /§eCharges:\s*(\d+)/i;

function getLore(item){ try { return item.getLore?.() ?? []; } catch { return []; } }
function setLore(item, lore){ try { item.setLore?.(lore); } catch {} }

function getChargesFromLoreLines(lore){
  for (const l of lore) {
    const m = CHARGE_RX.exec(l);
    if (m) return Math.max(0, parseInt(m[1], 10) || 0);
  }
  return 0;
}
function getCharges(item){ return getChargesFromLoreLines(getLore(item)); }

function setChargesOnLoreLines(lore, n){
  let done = false;
  for (let i=0;i<lore.length;i++){
    if (CHARGE_RX.test(lore[i])) { lore[i] = `§eCharges: ${n|0}`; done = true; break; }
  }
  if (!done) lore.push(`§eCharges: ${n|0}`);
  return lore;
}
function setCharges(item, n){
  const lore = setChargesOnLoreLines(getLore(item), n);
  setLore(item, lore);
}

function stripChargesFromLoreLines(lore){
  return lore.filter(l => !CHARGE_RX.test(l));
}

function ensureAwakened(item){
  const lore = getLore(item);
  if (!lore.some(l => /Awakened/i.test(l))) { lore.unshift("§6Awakened"); setLore(item, lore); }
}

/* ───────── inventory helpers (FIXED) ───────── */
/* Find the real hotbar index of the mainhand item without guessing. */
function _hotbarIndexForMainhand(player) {
  try {
    const sel = player.selectedSlot;
    if (typeof sel === "number" && sel >= 0 && sel <= 8) return sel;

    const eq  = player.getComponent("equippable");
    const mh  = eq?.getEquipment?.(EquipmentSlot.Mainhand);
    const inv = player.getComponent("inventory")?.container;
    if (!mh || !inv) return null;

    const loreEq = (a, b) => {
      try {
        const LA = a.getLore?.() ?? [];
        const LB = b.getLore?.() ?? [];
        if (LA.length !== LB.length) return false;
        for (let i = 0; i < LA.length; i++) if (LA[i] !== LB[i]) return false;
        return true;
      } catch { return false; }
    };
    const dur = it => { try { return it.getComponent("durability")?.damage ?? 0; } catch { return 0; } };

    for (let i = 0; i <= 8; i++) {
      const it = inv.getItem(i);
      if (!it) continue;
      if (it.typeId !== mh.typeId) continue;
      if ((it.amount|0) !== (mh.amount|0)) continue;
      if (dur(it) !== dur(mh)) continue;
      if (!loreEq(it, mh)) continue;
      return i;
    }
  } catch {}
  return null;
}

/* Safer write-back that never guesses the slot (so it won't stomp slot #1). */
function swapHeldNextTick(player, newStack) {
  system.runTimeout(() => {
    try {
      const eq = player.getComponent("equippable");
      if (eq?.setEquipment) eq.setEquipment(EquipmentSlot.Mainhand, newStack);
    } catch {}

    // Only touch the container when we can prove the correct hotbar index.
    system.runTimeout(() => {
      try {
        const inv  = player.getComponent("inventory")?.container;
        const slot = _hotbarIndexForMainhand(player);
        if (inv && slot !== null) {
          inv.setItem(slot, newStack);
        }
        // If we can't find the slot, do nothing — equippable is already updated.
        // Avoid /item replace fallback; it risks wrong slot & strips data on some builds.
      } catch {}
    }, 1);
  }, 0);
}

function getMainhand(player) {
  try {
    const eq = player.getComponent("equippable");
    return eq?.getEquipment?.(EquipmentSlot.Mainhand) ?? null;
  } catch { return null; }
}

/* ───────── form switchers ───────── */
/** Revert to 2D. If stripCharges=false, preserve charges in lore; if true, remove the charges line. */
function revertTo2D(player, current3DStack, stripCharges=false){
  const plain = cloneWithData(BASE_ID, current3DStack);
  const lore = getLore(plain);
  setLore(plain, stripCharges ? stripChargesFromLoreLines(lore) : lore);
  swapHeldNextTick(player, plain);
  try { player.sendMessage(stripCharges ? "§7Scythe reverted → 2D (no charges left)" : "§7Scythe reverted → 2D"); } catch {}
  try { player.playSound?.("random.anvil_use", { volume: 0.6 }); } catch {}
}

function upgradeTo3DWithCharges(player, current2DStack, charges){
  const upgraded = cloneWithData(THREE_DID, current2DStack);
  ensureAwakened(upgraded);
  setCharges(upgraded, charges);
  swapHeldNextTick(player, upgraded);
  try { player.playSound?.("random.anvil_use", { volume: 0.8 }); } catch {}
  try { player.sendMessage(`§6Scythe awakens → 3D §7(§e${charges}§7 charges)`); } catch {}
}

/* ───────── debounce ───────── */
function debounce(player){
  const now = Date.now(), prev = lastUse.get(player.id) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  lastUse.set(player.id, now);
  return false;
}

/* ───────── actions ───────── */
// 2D + crouch (+ use/ALT): If 2D already has charges in lore, use them (no XP).
// Otherwise pay levels to load CHARGE_LOAD and swap to 3D.
function tryLoadAndTransform(player, itemStack){
  if (debounce(player)) return;

  // If 2D already has charges in lore, reuse them without charging XP.
  const existingCharges = getCharges(itemStack);
  if (existingCharges > 0) {
    upgradeTo3DWithCharges(player, itemStack, existingCharges);
    return;
  }

  // Otherwise pay and load fresh charges.
  if (getLevels(player) < COST_CHARGE) {
    try { player.sendMessage(`§cNeed §e${COST_CHARGE}§c levels to load charges.`); } catch {}
    return;
  }
  system.runTimeout(async () => {
    const ok = await tryRemoveLevelsNow(player, COST_CHARGE);
    if (!ok) {
      try { player.sendMessage("§cCould not remove XP (permissions/commands blocked)."); } catch {}
      return;
    }
    upgradeTo3DWithCharges(player, itemStack, CHARGE_LOAD);
  }, 0);
}

// 3D + use: summon & consume charge; 0 -> auto-revert (strip charges)
function use3DAndConsume(player){
  if (debounce(player)) return;

  const held = getMainhand(player);
  if (!held || held.typeId !== THREE_DID) return;

  let charges = getCharges(held);
  if (charges <= 0) { revertTo2D(player, held, /*stripCharges=*/true); return; }

  // summon one minion (custom) + auto-tame to summoner
  try {
    const base = player.location;
    const dim  = player.dimension;
    const loc  = { x: base.x + 1, y: base.y + 0.1, z: base.z + 1 };

    let ent = null;
    try { ent = dim.spawnEntity(SUMMON_ID, loc); }
    catch { ent = dim.spawnEntity("minecraft:zombie", loc); } // fallback if custom not present

    if (ent) {
      // Preferred: use tameable to set owner (requires minecraft:tameable in JSON)
      try {
        const tameable =
          ent.getComponent?.("minecraft:tameable") ||
          ent.getComponent?.("tameable");
        if (tameable?.tame) tameable.tame(player);
      } catch {}

      // Apply your 'tamed' group (adds follow_owner + owner_hurt_* behaviors)
      try { ent.triggerEvent?.("tamed"); } catch {}
      try { ent.triggerEvent?.("minecraft:entity_spawned"); } catch {}

      // Cosmetic name
      try { ent.nameTag = `${player.name}'s Trick-or-Treater`; } catch {}
    }

    try { player.playSound?.("random.pop", { volume: 0.8 }); } catch {}
  } catch {}

  // consume charge
  charges = Math.max(0, charges - 1);
  setCharges(held, charges);

  if (charges <= 0) {
    try { player.sendMessage("§7Charges depleted."); } catch {}
    revertTo2D(player, held, /*stripCharges=*/true);
  } else {
    try { player.sendActionBar?.(`§eCharges: ${charges}`); } catch {}
    swapHeldNextTick(player, held); // write back lore consistently
  }
}

/* Unified handler so primary & ALT both work on all builds */
function handleUseLike(player, itemStack){
  const is3D = itemStack.typeId === THREE_DID;
  const is2D = itemStack.typeId === BASE_ID;

  // Crouch + (primary or ALT)
  if (player.isSneaking) {
    if (is2D) return tryLoadAndTransform(player, itemStack);                 // load (reuse or pay) & swap
    if (is3D) return revertTo2D(player, itemStack, /*stripCharges=*/false);  // FREE and KEEP charges
    return;
  }

  // Not crouching:
  if (is3D) return use3DAndConsume(player);   // primary/ALT behave the same here
  // 2D + not crouching: no-op
}

/* ───────── Component (CC v2) ───────── */
export class PumpkinScythe {
  // Primary Use:
  // - 2D + crouch: load (reuse or pay) & transform
  // - 3D: summon & consume
  onUse(event) {
    const { itemStack, source } = event;
    if (!source || !itemStack) return;
    handleUseLike(source, itemStack);
  }

  // ALT (right-click / secondary use) — route to same handler so platforms that only fire ALT on block still work
  onUseSecondary(event){
    const { itemStack, source } = event;
    if (!source || !itemStack) return;
    handleUseLike(source, itemStack);
  }

  // Some builds send ALT as use-on-block:
  onUseOn(event){
    const { itemStack, source } = event;
    if (!source || !itemStack) return;
    handleUseLike(source, itemStack);
  }

  // On-hit: say "hi" (testing)
  onHitEntity(event) {
    const { source } = event;
    try { source?.sendMessage?.("hi"); } catch {}
  }
}
