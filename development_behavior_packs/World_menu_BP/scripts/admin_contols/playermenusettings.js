import { ActionFormData } from "@minecraft/server-ui";
import { adminMenu } from "../admin_menu.js";
import { world } from "@minecraft/server";
import { sellShop } from "./sellShop.js"
import { tpmenuconfig } from "./tp_settings.js"
import { playerstoreplayer } from "./player_stores_start_up.js"
import { baseSecurity } from "./baseSecurity.js"
import { configureServerStores } from "./server_stores.js"

export function playerMenuSettings(player) {
    const adminObjective = world.scoreboard.getObjective("admin");
    let toggleLabel = "Bank: Off";
    if (adminObjective) {
        const participant = adminObjective.getParticipants().find(p => p.displayName === "BankController");
        const currentScore = participant ? adminObjective.getScore(participant) : 0;
        toggleLabel = currentScore === 1 ? "Bank: §aOn" : "Bank: §cOff";
    }

    const menuSettingsForm = new ActionFormData()
        .title("§4Player Menu Settings")
        .body("What menus do you want to display for all players? Configure settings for each menu.")
        .button("Server Stores", "textures/ui/backup_replace")
        .button("Player Stores", "textures/ui/book_metatag_default")
        .button("Sell Shop", "textures/ui/fire_resistance_effect")
        .button(toggleLabel, "textures/ui/icon_minecoin_9x9")
        .button("Player TP", "textures/ui/conduit_power_effect")
        .button("Base Security", "textures/ui/dressing_room_skins")
        .button("§l§cBack", "textures/ui/book_arrowleft_hover")
        .button("§l§cExit", "textures/ui/crossout");

    menuSettingsForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        switch (response.selection) {
            case 0: configureServerStores(player); break;
            case 1: playerstoreplayer(player); break;
            case 2: sellShop(player); break;
            case 3: if (adminObjective) {
                const participant = adminObjective.getParticipants().find(p => p.displayName === "BankController");
                const currentScore = participant ? adminObjective.getScore(participant) : 0;
                const newScore = currentScore === 1 ? 0 : 1;
                adminObjective.setScore("BankController", newScore);
            }
                playerMenuSettings(player); // Refresh menu break;
                break;
            case 4: tpmenuconfig(player); break;
            case 5: baseSecurity(player, "basesecurity", "Base Security"); break;
            case 6: adminMenu(player); break;
            case 7:
                player.sendMessage("§aExiting menu...");
                return;
            default: break;
        }
    });
}

