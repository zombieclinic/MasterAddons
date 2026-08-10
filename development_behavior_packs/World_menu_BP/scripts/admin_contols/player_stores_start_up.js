import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { playerMenuSettings } from "./playermenusettings.js";
import { getFakeScore } from "../core/scoreboard.js";
import { listShops, saveShop } from "../core/shops.js";

export async function playerstoreplayer(player) {
  const admin = world.scoreboard.getObjective("admin")
    ?? world.scoreboard.addObjective("admin", "Admin Controls");
  const visible = getFakeScore(admin, "playerstoresbutton", 0) === 1;
  const maxStores = Math.max(1, getFakeScore(admin, "P2Pcount", 1));
  const cost = Math.max(0, getFakeScore(admin, "P2Pcost", 0));

  const form = new ActionFormData()
    .title("Player Store Management")
    .body(`Stores per player: ${maxStores}\nStore creation cost: $${cost}`)
    .button(`Player Stores: ${visible ? "§aVisible" : "§cHidden"}`, "textures/ui/MCoin")
    .button("Configure Limits and Cost", "textures/ui/mashup_world")
    .button("Enable or Disable Stores", "textures/ui/gear")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    admin.setScore("playerstoresbutton", visible ? 0 : 1);
    return playerstoreplayer(player);
  }
  if (response.selection === 1) return setupP2PStores(player);
  if (response.selection === 2) return chooseStoreState(player);
  if (response.selection === 3) return playerMenuSettings(player);
}

async function setupP2PStores(player) {
  const admin = world.scoreboard.getObjective("admin")
    ?? world.scoreboard.addObjective("admin", "Admin Controls");
  const response = await new ModalFormData()
    .title("Configure Player Stores")
    .textField("Maximum stores per player", "Positive whole number", { defaultValue: String(Math.max(1, getFakeScore(admin, "P2Pcount", 1))) })
    .textField("Cost to open a store", "Zero or a positive whole number", { defaultValue: String(Math.max(0, getFakeScore(admin, "P2Pcost", 0))) })
    .show(player);
  if (response.canceled) return playerstoreplayer(player);

  const count = Number.parseInt(String(response.formValues[0]), 10);
  const cost = Number.parseInt(String(response.formValues[1]), 10);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(cost) || cost < 0) {
    player.sendMessage("§cEnter valid whole numbers for both settings.");
    return setupP2PStores(player);
  }

  admin.setScore("P2Pcount", count);
  admin.setScore("P2Pcost", cost);
  player.sendMessage("§aPlayer-store settings saved.");
  return playerstoreplayer(player);
}

async function chooseStoreState(player) {
  const stores = listShops("player");
  const form = new ActionFormData()
    .title("Enable or Disable Stores")
    .body("Disabling is reversible and preserves the owner's stock and earnings.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const shop of stores) {
    form.button(
      `${shop.disabled ? "§cDisabled" : "§aEnabled"}§r ${shop.name}\n§7${shop.ownerName ?? "Unknown owner"}`
    );
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return playerstoreplayer(player);
  const shop = stores[response.selection - 1];
  if (!shop) return chooseStoreState(player);

  shop.disabled = !shop.disabled;
  saveShop(shop);
  player.sendMessage(`§a“${shop.name}” is now ${shop.disabled ? "disabled" : "enabled"}.`);
  return chooseStoreState(player);
}
