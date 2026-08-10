import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { mainMenu } from "./mainmenu.js";
import { ensureObjective, setEntityScore } from "./core/scoreboard.js";
import { setAdminRank, setOwner } from "./core/permissions.js";
import {
    applyEconomyDisplay,
    renameEconomyObjectives,
    saveEconomySettings
} from "./core/economy.js";

export class MainMenu {
    async onUse(event) {
        const { source: player } = event;

        const adminScoreboard = world.scoreboard.getObjective("admin");

        if (!adminScoreboard) {
            await startUp(player);
            return;
        }

        const initializedExists = adminScoreboard.getParticipants().some(p => p.displayName === "initialized");

        if (!initializedExists) {
            await startUp(player);
        } else {
            mainMenu(player);
        }
    }
}

async function startUp(player) {
    const startUpForm = new ActionFormData()
        .title("§4Zombie§2Craft§r §1World Menu")
        .body("§7This menu simplifies setting up your world:\n\n§f- §6Configure server stores and player shops\n§f- §6Set up an economy and base security\n§f- §6Manage teleportation and home teleports\n§f- §6Access admin controls and world management\n\n§cBy clicking 'Start,' you agree to become an administrator of this world. This will automatically grant you admin permissions.")
        .button("§0Start", "textures/ui/check")
        .button("§0Cancel", "textures/ui/cancel");

    const response = await startUpForm.show(player);
    if (response.canceled || response.selection === 1) return;

    ensureObjective("Money", "§4Z§2Coins");
    ensureObjective("MoneyDisplay", "§4Z§2Coins");
    ensureObjective("storeowner", "Store Owner");
    ensureObjective("basesecurity", "Base Security");
    ensureObjective("admin", "Admin Settings");
    ensureObjective("BanList", "Ban List");
    ensureObjective("economyStart", "Economy Started");

    setOwner(player, true);
    setAdminRank(player, 0);

    economySetup(player);
}


function economySetup(player) {
    const economyForm = new ActionFormData()
        .title("Economy Setup")
        .body("Do you want to start an economy?")
        .button("Yes", "textures/ui/confirm")
        .button("No", "textures/ui/cancel");

    economyForm.show(player).then((response) => {
        if (response.canceled || response.selection === 1) {
            ensureObjective("admin", "Admin Settings").setScore("initialized", 1);
            saveEconomySettings({ displayMode: "none" });
            mainMenu(player);
            return;
        }

        showNameEconomyForm(player);
    });
}

function showNameEconomyForm(player) {
    const nameEconomyForm = new ModalFormData()
        .title("Name Your Economy")
        .textField("Economy Name", "Examples: Coins, Gems, Gold");

    nameEconomyForm.show(player).then((nameResponse) => {
        if (nameResponse.canceled || !nameResponse.formValues || !nameResponse.formValues[0]) {
            mainMenu(player);
            return;
        }

        const economyName = nameResponse.formValues[0].trim();
        const formattedName = economyName.replace(/§/g, "¤").replace(/[^a-zA-Z0-9_¤]/g, "_");

        ensureObjective("admin", "Admin Settings").setScore(`Money_${formattedName}`, 0);
        renameEconomyObjectives(economyName);

        displayEconomyOptions(player, economyName, formattedName);
    });
}

function displayEconomyOptions(player, economyName, formattedName) {
    const displayForm = new ActionFormData()
        .title("Display Options")
        .body(`How do you want your economy "${economyName}" to be displayed?`)
        .button("Action Bar\n§7Personal balance", "textures/ui/absorption_heart")
        .button("Sidebar", "textures/ui/sidebar_icons/my_content")
        .button("Action Bar + Sidebar", "textures/ui/conduit_power_effect")
        .button("Player List", "textures/ui/Add-Ons_Side-Nav_Icon_24x24")
        .button("Sidebar + Player List", "textures/ui/permissions_member_star")
        .button("Don't Show", "textures/ui/cancel");

    displayForm.show(player).then((response) => {
        if (response.canceled) {
            ensureObjective("admin", "Admin Settings").setScore("initialized", 1);
            mainMenu(player);
            return;
        }

        switch (response.selection) {
            case 0:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 5);
                saveEconomySettings({ displayMode: "actionbar" });
                applyEconomyDisplay("actionbar");
                break;

            case 1:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 1);
                saveEconomySettings({ displayMode: "sidebar" });
                applyEconomyDisplay("sidebar");
                break;

            case 2:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 6);
                saveEconomySettings({ displayMode: "actionbar_sidebar" });
                applyEconomyDisplay("actionbar_sidebar");
                break;

            case 3:
                displayListOptions(player, economyName, formattedName);
                return;

            case 4:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 4);
                saveEconomySettings({ displayMode: "both" });
                applyEconomyDisplay("both");
                break;

            case 5:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 0);
                saveEconomySettings({ displayMode: "none" });
                applyEconomyDisplay("none");
                break;
        }

        ensureObjective("admin").setScore("initialized", 1);
        mainMenu(player);
    });
}

function displayListOptions(player, economyName, formattedName) {
    const listForm = new ActionFormData()
        .title("List Display Options")
        .body(`How do you want "${economyName}" to be sorted in the list?`)
        .button("Ascending", "textures/ui/up_arrow")                 // index 0
        .button("Descending", "textures/ui/down_arrow")             // index 1
        .button("§l§cBack", "textures/ui/book_arrowleft_hover");    // index 2

    listForm.show(player).then((response) => {
        if (response.canceled || response.selection === 2) {
            displayEconomyOptions(player, economyName, formattedName);
            return;
        }

        switch (response.selection) {
            case 0:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 2);
                saveEconomySettings({ displayMode: "list_ascending" });
                applyEconomyDisplay("list_ascending");
                break;

            case 1:
                ensureObjective("admin").setScore(`Money_${formattedName}`, 3);
                saveEconomySettings({ displayMode: "list_descending" });
                applyEconomyDisplay("list_descending");
                break;
        }

        ensureObjective("admin").setScore("initialized", 1);
        mainMenu(player);
    });
}
