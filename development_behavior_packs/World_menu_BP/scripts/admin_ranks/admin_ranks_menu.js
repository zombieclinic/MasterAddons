import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { mainMenu } from "../mainmenu.js"; // If you have a separate main menu file
import { commandPromptMenu } from "./commandprompt.js"
import { teleportMenu } from "./tp.js"
import { modifyPlayerBalance } from "./mpb.js"
import { inspectPlayerInventory } from "./player_inventory.js"
import { inspectEnderChest } from "./player_enderchest.js"
import { playerBaseMenu } from "../playerbasemanagment.js";
import { gamemodeMenu } from "./gamemode.js"
import { configureServerStores } from "../admin_contols/server_stores.js";
import { sellShop } from "../admin_contols/sellShop.js";
import { playerstoreplayer } from "../admin_contols/player_stores_start_up.js";
import { getAdminRank } from "../core/permissions.js";
import { banMenu } from "../banplayer.js";
import { giveAdminGuide } from "../guidebooks.js";

/*************************************************
 * 1) formRank – Main Rank Menu (Dynamic)
 *************************************************/
export function formRank(player) {
    const adminObjective = world.scoreboard.getObjective("admin");
    if (!adminObjective) {
        player.sendMessage("§cNo 'admin' scoreboard found.");
        return;
    }

    const adminScore = getAdminRank(player);
    if (adminScore === undefined) {
        player.sendMessage("§cYou are not recognized as an admin with a rank.");
        return;
    }

    // 2) Find rank participant matching that score, e.g. "rank_Mod"
    const rankParticipant = adminObjective
        .getParticipants()
        .find(p => p.displayName.startsWith("rank_") && adminObjective.getScore(p) === adminScore);
    if (!rankParticipant) {
        player.sendMessage(`§cNo rank found for your admin score of '${adminScore}'.`);
        return;
    }

    const rawRankName = rankParticipant.displayName.replace("rank_", "");
    const rankScoreboardName = `rank_${rawRankName}`;

    // 3) Load rank_<Name> scoreboard
    const rankObjective = world.scoreboard.getObjective(rankScoreboardName);
    if (!rankObjective) {
        player.sendMessage(`§cThe rank scoreboard '${rankScoreboardName}' does not exist.`);
        return;
    }

    // 4) Build form with dynamic toggles
    const form = new ActionFormData()
        .title(`§4Rank Menu: ${rawRankName}`)
        .body("Select an option:");

    const buttonActions = [];
    const isEnabled = (fakeName) => {
        const part = rankObjective.getParticipants().find(p => p.displayName === fakeName);
        return part && rankObjective.getScore(part) === 1;
    };

    // Command Prompt
    if (isEnabled("commandprompt")) {
        form.button("CommandPrompt", "textures/ui/creator_glyph_color");
        buttonActions.push(() => commandPromptMenu(player, { name: rawRankName }));
    }

    // Teleport
    if (isEnabled("tp_settings")) {
        form.button("Teleport", "textures/ui/up_arrow");
        buttonActions.push(() => teleportMenu(player, { name: rawRankName }));
    }

    // Player Settings
    if (isEnabled("player_settings")) {
        form.button("Player Settings", "textures/ui/bubble");
        buttonActions.push(() => playerSettingsMenu(player, { name: rawRankName }));
    }

    // Store Settings
    if (isEnabled("stores_settings")) {
        form.button("Store Settings", "textures/ui/icon_panda");
        buttonActions.push(() => storeSettingsMenu(player, { name: rawRankName }));
    }

    // Gamemode Settings
    if (isEnabled("gamemode_settings")) {
        form.button("Gamemode Settings", "textures/ui/op");
        buttonActions.push(() => gamemodeMenu(player, { name: rawRankName }));
    }

    form.button("Give Admin Book", "textures/items/worldmenuhowto");
    buttonActions.push(() => {
        giveAdminGuide(player);
        formRank(player);
    });

    // Back => main admin menu
    form.button("Back", "textures/ui/book_arrowleft_hover");
    buttonActions.push(() => mainMenu(player));
    form.button("Exit", "textures/ui/crossout");
    buttonActions.push(() => {});

    form.show(player).then(resp => {
        if (resp.canceled) return;
        const idx = resp.selection;
        if (buttonActions[idx]) buttonActions[idx]();
    }).catch(err => {
        player.sendMessage(`§cError in Rank Menu: ${err}`);
    });
}




/*************************************************
 * 4) Player Settings Submenu
 *************************************************/
export function playerSettingsMenu(player, rank) {
    const rankScoreboardName = `rank_${rank.name}`;
    const obj = world.scoreboard.getObjective(rankScoreboardName);

    // Potential toggles
    const possibleSettings = [
        { name: "PlayerSettings_banmenu", desc: "Ban Menu", icon: "textures/ui/icon_trending", func: () => banMenu(player, rank) },
        { name: "PlayerSettings_mpb", desc: "Modify Players' Score", icon: "textures/ui/icon_map", func: () => modifyPlayerBalance(player, rank) },
        { name: "PlayerSettings_inventory", desc: "View Player Inventory", icon: "textures/ui/icon_crafting", func: () => viewPlayerInventoryMenu(player, rank) },
        { name: "PlayerSettings_playerbases", desc: "Player Bases", icon: "textures/ui/icon_recipe_item", func: () => playerBaseMenu(player, rank) },
    ];

    const form = new ActionFormData()
        .title("Player Settings")
        .body("Choose a player-related option:");

    const buttonActions = [];
    possibleSettings.forEach(opt => {
        const part = obj.getParticipants().find(p => p.displayName === opt.name);
        const score = part ? obj.getScore(part) : 0;
        if (score === 1) {
            form.button(opt.desc, opt.icon);
            buttonActions.push(opt.func);
        }
    });

    // Back => rank
    form.button("Back", "textures/ui/book_arrowleft_hover");
    buttonActions.push(() => formRank(player));
    form.button("Exit", "textures/ui/crossout");
    buttonActions.push(() => {});

    form.show(player).then(resp => {
        if (resp.canceled) return;
        const idx = resp.selection;
        if (buttonActions[idx]) buttonActions[idx]();
    });
}




/*************************************************
 * 4c) View Player Inventory / Ender Chest
 *************************************************/
function viewPlayerInventoryMenu(player, rank) {
    // This is the “entry point” to choose a player
    // -> Then open the inventory or ender chest logic
    const players = [...world.getPlayers()];
    if (!players.length) {
        player.sendMessage("§cNo players online.");
        playerSettingsMenu(player, rank);
        return;
    }

    const selForm = new ActionFormData()
        .title("§6Select Player")
        .body("Choose a player to inspect:");

    players.forEach(p => selForm.button(p.name));

    // Back
    selForm.button("Back", "textures/ui/book_arrowleft_hover");
    const actions = players.map(p => () => openInventoryTypeMenu(player, rank, p));
    actions.push(() => playerSettingsMenu(player, rank));
    selForm.button("Exit", "textures/ui/crossout");
    actions.push(() => {});

    selForm.show(player).then(resp => {
        if (resp.canceled) return;
        if (resp.selection < actions.length) actions[resp.selection]();
    });
}

export function openInventoryTypeMenu(player, rank, selectedPlayer) {
    // Safety-check: If selectedPlayer is missing, fallback to a different menu.
    if (!selectedPlayer) {
        player.sendMessage("§cError: No player selected. Returning to player settings.");
        playerSettingsMenu(player, rank);
        return;
    }

    const invForm = new ActionFormData()
        .title(`Inspect ${selectedPlayer.name}`)
        .body("Which inventory would you like to view?")
        .button("Player Inventory", "textures/ui/chest_icon")
        .button("Ender Chest", "textures/ui/icon_blackfriday")
        .button("Back", "textures/ui/book_arrowleft_hover")
        .button("Exit", "textures/ui/crossout");

    invForm.show(player).then(r => {
        if (r.canceled) return;
        switch (r.selection) {
            case 0:
                inspectPlayerInventory(player, rank, selectedPlayer);
                break;
            case 1:
                inspectEnderChest(player, selectedPlayer, {
                    onBack: () => openInventoryTypeMenu(player, rank, selectedPlayer)
                });
                break;
            case 2:
                playerSettingsMenu(player, rank);
                break;
            case 3:
                break;
            default:
                // Fallback if none of the above match.
                viewPlayerInventoryMenu(player, rank, selectedPlayer);
                break;
        }
    });
}




/*************************************************
 * 5) Store Settings Submenu
 *************************************************/
export function storeSettingsMenu(player, rank = { name: "default" }) {
    const rankScoreboardName = `rank_${rank.name}`;
    const obj = world.scoreboard.getObjective(rankScoreboardName);
    if (!obj) {
        // Fallback: if no rank scoreboard is found, return to the rank menu.
        player.sendMessage(`§cRank scoreboard ${rankScoreboardName} not found. Returning to rank menu.`);
        formRank(player);
        return;
    }

    const storeOptions = [
        { name: "StoreSettings_ServerShop", description: "Server Shop", texture: "textures/ui/icon_armor" },
        { name: "StoreSettings_PlayertoPlayer", description: "Player to Player Shop", texture: "textures/ui/icon_potion" },
        { name: "StoreSettings_SellShop", description: "Sell Shop", texture: "textures/ui/icon_recipe_equipment" }
    ];
    const scores = {};

    storeOptions.forEach(opt => {
        const part = obj.getParticipants().find(p => p.displayName === opt.name);
        scores[opt.name] = part ? obj.getScore(part) : 0;
    });

    const form = new ActionFormData()
        .title("Store Settings")
        .body("Select a store option:");
    const buttonActions = [];

    storeOptions.forEach(opt => {
        if (scores[opt.name] === 1) {
            form.button(opt.description, opt.texture);
            if (opt.name === "StoreSettings_ServerShop") {
                buttonActions.push(() => {
                    configureServerStores(player, rank);
                });
            } else if (opt.name === "StoreSettings_PlayertoPlayer") {
                buttonActions.push(() => {
                    playerstoreplayer(player, rank);
                });
            } else if (opt.name === "StoreSettings_SellShop") {
                buttonActions.push(() => {
                    sellShop(player, rank);
                });
            }
        }
    });

    // Add a Back button that returns to the rank menu.
    form.button("Back", "textures/ui/book_arrowleft_hover");
    buttonActions.push(() => formRank(player));
    form.button("Exit", "textures/ui/crossout");
    buttonActions.push(() => {});

    form.show(player).then(r => {
        if (r.canceled) return;
        if (buttonActions[r.selection]) {
            buttonActions[r.selection]();
        }
    });
}

