import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { adminSettingsMenu } from "./admin_menu.js";
import {
  applyEconomyDisplay,
  ensureEconomyObjectives,
  getEconomySettings,
  renameEconomyObjectives,
  saveEconomySettings
} from "./core/economy.js";
import { ensureObjective } from "./core/scoreboard.js";

export async function economy(player) {
  const settings = getEconomySettings();
  const response = await new ActionFormData()
    .title("Economy Management")
    .body(`Name: ${settings.name}\nStarting balance: $${settings.startingBalance}`)
    .button("Rename Economy", "textures/ui/darkness_effect")
    .button("Display Settings", "textures/ui/sidebar_icons/my_content")
    .button("Set Starting Balance", "textures/ui/dressing_room_capes")
    .button("Convert Old Economy", "textures/ui/backup_replace")
    .button("Reset All Balances", "textures/ui/cancel")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("§l§cExit", "textures/ui/crossout")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return renameEconomy(player);
  if (response.selection === 1) return chooseDisplay(player);
  if (response.selection === 2) return setStartingBalance(player);
  if (response.selection === 3) return convertOldEconomy(player);
  if (response.selection === 4) return confirmReset(player);
  if (response.selection === 5) return adminSettingsMenu(player);
  if (response.selection === 6) return;
}

async function renameEconomy(player) {
  const settings = getEconomySettings();
  const response = await new ModalFormData()
    .title("Rename Economy")
    .textField("Economy name", "Example: ZCoins", { defaultValue: settings.name })
    .show(player);
  if (response.canceled) return economy(player);
  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cEconomy name cannot be empty.");
    return renameEconomy(player);
  }

  try {
    renameEconomyObjectives(name);
    player.sendMessage(`§aEconomy renamed to ${name}.`);
  } catch (error) {
    console.warn(`[World Menu] Economy rename failed: ${error}`);
    player.sendMessage(`§cEconomy rename failed: ${error.message}`);
  }
  return economy(player);
}

async function chooseDisplay(player) {
  const settings = getEconomySettings();
  const response = await new ActionFormData()
    .title("Economy Display")
    .body(
      `Current: ${settings.displayMode}\n\n` +
      "Action Bar is private: each player sees only their own balance."
    )
    .button("Action Bar — Personal Balance")
    .button("Sidebar")
    .button("Action Bar and Sidebar")
    .button("Player List — Ascending")
    .button("Player List — Descending")
    .button("Sidebar and Player List")
    .button("Hidden")
    .button("Customize Action Bar Text")
    .button("§l§cBack")
    .button("§l§cExit")
    .show(player);
  if (response.canceled || response.selection === 8) return economy(player);
  if (response.selection === 9) return;
  if (response.selection === 7) return configureActionBar(player);
  const modes = [
    "actionbar",
    "sidebar",
    "actionbar_sidebar",
    "list_ascending",
    "list_descending",
    "both",
    "none"
  ];
  const mode = modes[response.selection];
  saveEconomySettings({ displayMode: mode });
  applyEconomyDisplay(mode);
  return economy(player);
}

async function configureActionBar(player) {
  const settings = getEconomySettings();
  const response = await new ModalFormData()
    .title("Customize Action Bar")
    .textField(
      "Text: {player}, {economy}, {money}. Type \\n for a new line.",
      "Example: §d{player}\\n§6{economy} - $ {money}",
      { defaultValue: settings.actionBarTemplate }
    )
    .show(player);
  if (response.canceled) return chooseDisplay(player);

  const template = String(response.formValues[0] ?? "").trim();
  if (!template || template.length > 500) {
    player.sendMessage("§cAction Bar text must contain 1–500 characters.");
    return configureActionBar(player);
  }
  saveEconomySettings({ actionBarTemplate: template, displayMode: "actionbar" });
  applyEconomyDisplay("actionbar");
  player.sendMessage("§aPersonal Action Bar display saved.");
  return chooseDisplay(player);
}

async function setStartingBalance(player) {
  const settings = getEconomySettings();
  const response = await new ModalFormData()
    .title("Starting Balance")
    .textField("Amount granted once to new players", "Zero or positive whole number", { defaultValue: String(settings.startingBalance) })
    .show(player);
  if (response.canceled) return economy(player);
  const amount = Number.parseInt(String(response.formValues[0]), 10);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    player.sendMessage("§cEnter zero or a positive whole number.");
    return setStartingBalance(player);
  }
  saveEconomySettings({ startingBalance: amount });
  return economy(player);
}

export async function convertOldEconomy(player) {
  const settings = getEconomySettings();
  const response = await new ModalFormData()
    .title("Convert Old Economy")
    .textField("Old scoreboard objective ID", "Exact objective ID", { defaultValue: settings.oldObjectiveId ?? "" })
    .toggle("Show conversion button to players", { defaultValue: settings.transferVisible })
    .show(player);
  if (response.canceled) return economy(player);

  const objectiveId = String(response.formValues[0] ?? "").trim();
  if (objectiveId && !world.scoreboard.getObjective(objectiveId)) {
    player.sendMessage(`§cThe objective “${objectiveId}” does not exist.`);
    return convertOldEconomy(player);
  }
  saveEconomySettings({
    oldObjectiveId: objectiveId || undefined,
    transferVisible: Boolean(response.formValues[1])
  });
  ensureObjective("economyTransfer", "Economy Conversion Status");
  player.sendMessage("§aConversion settings saved.");
  return economy(player);
}

async function confirmReset(player) {
  const response = await new MessageFormData()
    .title("Reset Economy")
    .body("Reset every stored Money balance? This cannot be undone.")
    .button1("Cancel")
    .button2("§cReset")
    .show(player);
  if (response.canceled || response.selection !== 1) return economy(player);

  try {
    world.scoreboard.removeObjective("Money");
    world.scoreboard.removeObjective("MoneyDisplay");
  } catch {
    // Missing objectives need no cleanup.
  }
  ensureEconomyObjectives();
  player.sendMessage("§aAll economy balances were reset.");
  return economy(player);
}
