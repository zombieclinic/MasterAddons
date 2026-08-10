import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { mainMenu } from "./mainmenu.js";
import { adminPlayerManagement } from "./admin_contols/admin_player_managment.js"
import { playerMenuSettings } from "./admin_contols/playermenusettings.js"
import { banMenu } from "./banplayer.js"
import { economy } from "./economy.js"
import { playerBaseMenu } from "./playerbasemanagment.js"
import { inspectPlayerInventory } from "./playinventory.js"
import { inspectEnderChest } from "./player_enderchest.js"
import { dataBase } from "./redbutton.js"
import { addEntityScore } from "./core/scoreboard.js";
import { writeWorldData } from "./core/storage.js";
import { isOwner } from "./core/permissions.js";
import { deleteAllWorldMenuData } from "./core/reset.js";
import { giveAdminGuide } from "./guidebooks.js";
import { claimBetaCape, isBetaTester } from "./core/betaRewards.js";



export function adminMenu(player) {
    const initialMenu = new ActionFormData()
        .title("§4Admin Menu")
        .body("Administrative tools for managing the server.")
        .button("Player Management", "textures/ui/invite_base")
        .button("Admin Settings", "textures/ui/gear")
        .button("Give Admin Book", "textures/items/worldmenuhowto")
        .button("§l§cBack", "textures/ui/book_arrowleft_hover")
        .button("§l§cExit", "textures/ui/crossout");



    initialMenu.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        switch (response.selection) {
            case 0:
                playerManagementMenu(player);
                break;
            case 1:
                adminSettingsMenu(player);
                break;
            case 2:
                giveAdminGuide(player);
                adminMenu(player);
                break;
            case 3:
                mainMenu(player);
                break;
            case 4:
                player.sendMessage("Exiting menu...");
                return; // Exit completely

            default:
                break;
        }
    });
}




export function playerManagementMenu(player) {
    const playerManagementForm = new ActionFormData()
        .title("§2Player Management")
        .body("Manage players on the server.")
        .button("Change Gamemode", "textures/ui/emptyStar")
        .button("Ban Menu", "textures/ui/ErrorGlyph")
        .button("Modify Player Balance", "textures/ui/enable_editor")
        .button("View Player Inventory", "textures/ui/settings_glyph_color_2x")
        .button("Teleport to Player", "textures/ui/update")
        .button("Player Bases", "textures/ui/invite_base")
        .button("§l§cBack", "textures/ui/book_arrowleft_hover")
        .button("§l§cExit", "textures/ui/crossout");

    playerManagementForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        switch (response.selection) {
            case 0: changeGamemode(player); break;
            case 1: banMenu(player); break;
            case 2: playerRewards(player); break;
            case 3: viewPlayerInventory(player); break;
            case 4: adminTeleport(player); break;
            case 5: playerBaseMenu(player); break;
            case 6: adminMenu(player); break;
            case 7:
                player.sendMessage("§0Exiting menu...");
                return;
            default: break;
        }
    });
}



export function adminSettingsMenu(player) {
    const adminSettingsForm = new ActionFormData()
        .title("§4Admin Settings")
        .body("Administrative configurations.")
        .button("Admin Management", "textures/ui/attack_pressed")
        .button("Player Menu Settings", "textures/ui/settings_glyph_color_2x")
        .button("Commands Prompt", "textures/blocks/command_block")
        .button("Set Spawn", "textures/ui/village_hero_effect")
        .button("Economy", "textures/ui/deop")
        .button("View and edit\nDataBase", "textures/ui/gear");

    const actions = [
        () => adminPlayerManagement(player),
        () => playerMenuSettings(player),
        () => adminCommand(player),
        () => setSpawn(player),
        () => economy(player),
        () => dataBase(player)
    ];

    if (isOwner(player)) {
        adminSettingsForm.button("§l§4Delete All", "textures/ui/trash");
        actions.push(() => confirmDeleteAll(player));
    }

    adminSettingsForm
        .button("§l§cBack", "textures/ui/book_arrowleft_hover")
        .button("§l§cExit", "textures/ui/crossout");
    actions.push(() => adminMenu(player), () => player.sendMessage("§0Exiting menu..."));

    adminSettingsForm.show(player).then((response) => {
        if (response.canceled) return;
        actions[response.selection]?.();
    });
}

async function confirmDeleteAll(player) {
    if (!isOwner(player)) {
        player.sendMessage("§cOnly the world owner can use Delete All.");
        return;
    }

    const first = await new MessageFormData()
        .title("§4Delete All World Menu Data?")
        .body(
            "§cThis will remove everything the World Menu has created:\n\n" +
            "§f• Economy balances and settings\n" +
            "• Stores, listings, stock, and earnings\n" +
            "• Bases, basemates, homes, bans, ranks, and permissions\n" +
            "• World Menu scoreboards and configuration\n\n" +
            "§4This cannot be undone."
        )
        .button1("§cNo, Cancel")
        .button2("§4Yes, Continue")
        .show(player);

    if (first.canceled || first.selection !== 1) return adminSettingsMenu(player);
    if (!isOwner(player)) return;

    const final = await new MessageFormData()
        .title("§4Final Confirmation")
        .body(
            "§cAre you absolutely sure?\n\n" +
            "Deleting all World Menu data is permanent. The setup menu will appear again the next time the World Menu is opened."
        )
        .button1("§cNo, Keep Everything")
        .button2("§4YES, DELETE ALL")
        .show(player);

    if (final.canceled || final.selection !== 1) return adminSettingsMenu(player);
    if (!isOwner(player)) {
        player.sendMessage("§cOwner permission could not be verified. Nothing was deleted.");
        return;
    }

    try {
        const result = deleteAllWorldMenuData();
        if (result.failedObjectives.length) {
            console.warn(`[World Menu] Some objectives could not be removed: ${result.failedObjectives.join("; ")}`);
        }
        player.sendMessage(
            `§aWorld Menu data was deleted. Removed ${result.removedObjectives.length} scoreboards.`
        );
    } catch (error) {
        console.error(`[World Menu] Delete All failed: ${error}`);
        player.sendMessage("§cDelete All did not finish successfully. Check the content log.");
    }
}


async function setSpawn(player) {
    const { x, y, z } = player.location;
    const dimension = player.dimension.id.replace("minecraft:", ""); // e.g., overworld, nether, end

    // Confirm spawn point dialog
    const confirmationForm = new ActionFormData()
        .title("§4Set Spawn Confirmation")
        .body(
            `§bAre you sure you want to set the spawn point to the following location? 

` +
            `X: §a${Math.round(x)}§r
` +
            `Y: §a${Math.round(y)}§r
` +
            `Z: §a${Math.round(z)}§r
` +
            `Dimension: §a${dimension}`
        )
        .button("§aYes, Set Spawn")
        .button("§cNo, Cancel");

    confirmationForm.show(player).then(async (response) => {
        if (response.canceled || response.selection === 1) {
            player.sendMessage("§cSpawn point setting canceled.");
            adminSettingsMenu(player);
            return;
        }

        if (response.selection === 0) {
            try {
                writeWorldData("teleport:spawn", {
                    dimensionId: player.dimension.id,
                    x: Math.round(x),
                    y: Math.round(y),
                    z: Math.round(z)
                });
                if (player.dimension.id === "minecraft:overworld") {
                    player.dimension.runCommand(
                        `setworldspawn ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}`
                    );
                }

                player.sendMessage(
                    `§aGlobal spawn point set successfully at:
` +
                    `§bX=${Math.round(x)}, Y=${Math.round(y)}, Z=${Math.round(z)} in ${dimension}.` +
                    `\n§aWorld spawn also updated!`
                );
                adminSettingsMenu(player);
            } catch (error) {
                console.error("Error setting global spawn point:", error);
                player.sendMessage("§cAn error occurred while setting the global spawn point.");
                adminSettingsMenu(player);
            }
        }
    }).catch((error) => {
        console.error("Error showing spawn confirmation form:", error);
        player.sendMessage("§cAn error occurred while confirming the spawn point.");
        adminSettingsMenu(player);
    });
}

export { setSpawn };




function adminTeleport(player) {
    const players = [...world.getPlayers()];

    if (players.length === 0) {
        player.sendMessage("§cNo players are currently online.");
        adminMenu(player);
        return;
    }

    const playerSelectionForm = new ActionFormData()
        .title("§4Teleport")
        .body("Select a player to teleport to:");

    players.forEach((targetPlayer) => playerSelectionForm.button(targetPlayer.name));
    playerSelectionForm.button("§l§cBack", "textures/ui/book_arrowleft_hover");
    playerSelectionForm.button("§l§cExit", "textures/ui/crossout");

    playerSelectionForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        if (response.selection === players.length) {
            adminMenu(player);
            return;
        }

        if (response.selection === players.length + 1) {
            player.sendMessage("§0Exiting menu...");
            return; // Exit completely
        }

        const targetPlayer = players[response.selection];
        if (targetPlayer) {
            try {
                player.teleport(targetPlayer.location, {
                    dimension: targetPlayer.dimension
                });
                player.sendMessage(`§0Teleported to ${targetPlayer.name}!`);
                playerManagementMenu(player);
            } catch (err) {
                player.sendMessage(`§cFailed to teleport: ${err.message}`);
                playerManagementMenu(player);
            }
        } else {
            player.sendMessage("§cPlayer not found. Please try again.");
            adminTeleport(player);
        }
    });
}



function adminCommand(player) {
    const commandForm = new ModalFormData()
        .title("§4Admin Commands")
        .textField("Enter the command to execute:", "Command");

    commandForm.show(player).then((response) => {
        if (response.canceled) {
            player.sendMessage("§cCommand input canceled.");
            return;
        }

        const command = response.formValues[0]?.trim();
        if (!command) {
            player.sendMessage("§cNo command entered. Returning to Admin Menu.");
            adminMenu(player); // Return to admin menu
            return;
        }

        // Special case for "betaplayer"
        if (command.toLowerCase() === "betaplayer") {
            if (isBetaTester(player)) {
                try {
                    player.sendMessage(claimBetaCape(player).message);
                } catch (error) {
                    player.sendMessage(`§cFailed to grant the item: ${error.message}`);
                }
            } else {
                player.sendMessage("§cYou do not have permission to use this command.");
            }
            return adminMenu(player);
        }

        // Handle other commands
        try {
            player.runCommand(command);
            player.sendMessage(`§aCommand executed successfully: /${command}`);
        } catch (err) {
            player.sendMessage(`§cFailed to execute command: ${err.message}`);
        }
        adminMenu(player);
    }).catch((err) => {
        console.error("Error showing admin command form:", err);
        player.sendMessage("§cAn error occurred while opening the command input form.");
    });
}





function changeGamemode(player) {
    const players = [...world.getPlayers()];
    if (players.length === 0) {
        player.sendMessage("§cNo players are currently online.");
        adminMenu(player);
        return;
    }

    const playerSelectionForm = new ActionFormData()
        .title("§4Select Player")
        .body("Select the player whose gamemode you want to change.");

    players.forEach((p) => playerSelectionForm.button(p.name));
    playerSelectionForm.button("§l§cBack", "textures/ui/book_arrowleft_hover");
    playerSelectionForm.button("§l§cExit", "textures/ui/crossout");

    playerSelectionForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        if (response.selection === players.length) {
            adminMenu(player);
            return;
        }

        if (response.selection === players.length + 1) {
            player.sendMessage("§aExiting menu...");
            return; // Exit completely
        }

        const targetPlayer = players[response.selection];
        if (!targetPlayer) {
            player.sendMessage("§cPlayer not found.");
            adminMenu(player);
            return;
        }

        const gamemodeForm = new ActionFormData()
            .title(`§4Change Gamemode for ${targetPlayer.name}`)
            .body("Select the gamemode to switch to:")
            .button("Survival", "textures/ui/weaving_effect")
            .button("Creative", "textures/ui/village_hero_effect")
            .button("Adventure", "textures/ui/World")
            .button("Spectator", "textures/ui/weather_clear")
            .button("§l§cBack", "textures/ui/book_arrowleft_hover")
            .button("§l§cExit", "textures/ui/crossout");

        gamemodeForm.show(player).then((response) => {
            if (response.canceled) return; // Exit silently

            if (response.selection === 4) {
                changeGamemode(player);
                return;
            }

            if (response.selection === 5) {
                player.sendMessage("§aExiting menu...");
                return; // Exit completely
            }

            const modes = ["survival", "creative", "adventure", "spectator"];
            if (response.selection < modes.length) {
                try {
                    targetPlayer.runCommand(`gamemode ${modes[response.selection]} @s`);
                    player.sendMessage(`§a${targetPlayer.name}'s gamemode has been changed to ${modes[response.selection]}!`);
                } catch (err) {
                    player.sendMessage(`§cFailed to change ${targetPlayer.name}'s gamemode: ${err}`);
                }
            }

            adminMenu(player); // Return to the admin menu
        });
    });
}

function playerRewards(player) {
    // Get a list of all online players
    const onlinePlayers = Array.from(world.getPlayers());
    if (onlinePlayers.length === 0) {
        player.sendMessage("No players are online.");
        return;
    }

    // Action Form: List of players
    const actionForm = new ActionFormData()
        .title("Select a Player")
        .body("Choose a player to reward or penalize:");

    onlinePlayers.forEach((p) => actionForm.button(p.name));
    actionForm
        .button("§l§cBack", "textures/ui/book_arrowleft_hover")
        .button("§l§cExit", "textures/ui/crossout");

    actionForm.show(player).then((actionResponse) => {
        if (actionResponse.canceled) return;
        if (actionResponse.selection === onlinePlayers.length) {
            playerManagementMenu(player);
            return;
        }
        if (actionResponse.selection === onlinePlayers.length + 1) return;

        const selectedPlayer = onlinePlayers[actionResponse.selection];
        if (!selectedPlayer) {
            player.sendMessage("Player selection failed.");
            playerRewards(player);
            return;
        }

        // Modal Form: Amount Input
        const modalForm = new ModalFormData()
            .title(`Reward or Penalize ${selectedPlayer.name}`)
            .textField("Enter the amount to add or remove (e.g., -500 to remove):", "Amount", { defaultValue: "0" });

        modalForm.show(player).then((modalResponse) => {
            if (modalResponse.canceled) return;

            const rewardAmount = parseInt(modalResponse.formValues[0]);
            if (isNaN(rewardAmount)) {
                player.sendMessage("Invalid amount entered. Please enter a valid number.");
                playerRewards(player);
                return;
            }

            const absoluteAmount = Math.abs(rewardAmount); // Get the absolute value for the command

            try {
                addEntityScore("Money", selectedPlayer, rewardAmount, "Money");
                const action = rewardAmount >= 0 ? "rewarded" : "penalized";
                player.sendMessage(`You have ${action} ${selectedPlayer.name} with ${absoluteAmount} Money.`);
            } catch (error) {
                player.sendMessage("Failed to update the player's Money score. Ensure the scoreboard exists.");
                console.error(error);
            }
            playerManagementMenu(player);
        });
    });
}


export function viewPlayerInventory(player) {
    const players = [...world.getPlayers()];
    if (players.length === 0) {
        player.sendMessage("§cNo players are currently online.");
        adminMenu(player);
        return;
    }

    const playerSelectionForm = new ActionFormData()
        .title("§4Select Player")
        .body("Choose a player to inspect:");

    players.forEach((p) => playerSelectionForm.button(p.name));
    playerSelectionForm.button("§l§cBack");
    playerSelectionForm.button("§l§cExit");

    playerSelectionForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        if (response.selection === players.length) {
            // Back button
            playerManagementMenu(player);
            return;
        }

        if (response.selection === players.length + 1) {
            // Exit button
            player.sendMessage("§aExiting menu...");
            return; // Exit completely
        }

        const selectedPlayer = players[response.selection];
        if (!selectedPlayer) {
            player.sendMessage("§cPlayer not found.");
            adminMenu(player);
            return;
        }

        const inventoryTypeForm = new ActionFormData()
            .title(`§6Inspect ${selectedPlayer.name}`)
            .body("Select which inventory to inspect:")
            .button("Player Inventory", "textures/ui/csb_purchase_amazondevicewarning")
            .button("Ender Chest", "textures/ui/icon_blackfriday")
            .button("§l§cBack", "textures/ui/book_arrowleft_hover")
            .button("§l§cExit", "textures/ui/crossout");

        inventoryTypeForm.show(player).then((inventoryResponse) => {
            if (inventoryResponse.canceled) return; // Exit silently

            if (inventoryResponse.selection === 2) {
                // Back button
                viewPlayerInventory(player); // Correctly calls the function to reopen player selection
                return;
            }

            if (inventoryResponse.selection === 3) {
                // Exit button
                player.sendMessage("§aExiting menu...");
                return; // Exit completely
            }

            if (inventoryResponse.selection === 0) {
                inspectPlayerInventory(player, selectedPlayer);
            } else if (inventoryResponse.selection === 1) {
                inspectEnderChest(player, selectedPlayer, {
                    onBack: () => viewPlayerInventory(player)
                });
            }
        }).catch((err) => {
            player.sendMessage(`§cAn error occurred: ${err.message}`);
            viewPlayerInventory(player); // Correctly call this function in case of error
        });
    }).catch((err) => {
        playerManagementMenu(player); // Returns to player management menu on error
    });
}






