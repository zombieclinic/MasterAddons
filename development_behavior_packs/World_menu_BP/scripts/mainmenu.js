import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { adminMenu } from "./admin_menu.js";
import { playerShop } from "./admin_contols/player_stores.js";
import { baseManagement } from "./basemanagment.js";
import { serverSellShop } from "./server_sellshop.js";
import { bank } from "./bank.js";
import { playerTpmenu } from "./playertp.js";
import { formRank } from "./admin_ranks/admin_ranks_menu.js";
import { serverStoresMenu } from "./server_store_menu.js";
import { economyTransfer } from "./economy_transfer.js"; // Importing the function for conversion
import { getAdminRank, isOwner } from "./core/permissions.js";
import { getEconomySettings } from "./core/economy.js";
import {
    claimBetaReward,
    getBetaClaimCount,
    isBetaTester,
    upgradeOwnedBetaRewards
} from "./core/betaRewards.js";

export function mainMenu(player) {
    const mainMenuForm = new ActionFormData()
        .title("§4World§2Menu")
        .body("Welcome to the World Menu!\nChoose an option below:");

    const adminObjective = world.scoreboard.getObjective("admin");
    if (!adminObjective) {
        player.sendMessage("§cNo 'admin' scoreboard found.");
        return;
    }

    const owner = isOwner(player);
    const rank = getAdminRank(player);

    let buttonActions = [];

    try {
        const playerTpVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "TpController" && adminObjective.getScore(p) === 1);

        const serverStoresVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "menu_serverStores" && adminObjective.getScore(p) === 1);

        const playerStoresVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "playerstoresbutton" && adminObjective.getScore(p) === 1);

        const baseSecurityVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "basesecuritybutton" && adminObjective.getScore(p) === 1);

        const sellShopVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "sellshop" && adminObjective.getScore(p) === 1);

        const bankControllerVisible = adminObjective
            .getParticipants()
            .some((p) => p.displayName === "BankController" && adminObjective.getScore(p) === 1);

        const economyTransferVisible = getEconomySettings().transferVisible;

        if (playerTpVisible) {
            mainMenuForm.button("Player Tp", "textures/ui/NetherPortalMirror");
            buttonActions.push(() => {
                playerTpmenu(player);
            });
        }

        if (serverStoresVisible) {
            mainMenuForm.button("Server Store", "textures/ui/backup_replace");
            buttonActions.push(() => {
                serverStoresMenu(player);
            });
        }

        if (playerStoresVisible) {
            mainMenuForm.button("PlayerShops", "textures/ui/village_hero_effect");
            buttonActions.push(() => {
                playerShop(player);
            });
        }

        if (baseSecurityVisible) {
            mainMenuForm.button("Base Security", "textures/ui/emptyStarFocus");
            buttonActions.push(() => {
                baseManagement(player);
            });
        }

        if (sellShopVisible) {
            mainMenuForm.button("Sell Shop", "textures/ui/fire_resistance_effect");
            buttonActions.push(() => {
                serverSellShop(player);
            });
        }

        if (bankControllerVisible) {
            mainMenuForm.button("Bank", "textures/ui/icon_minecoin_9x9");
            buttonActions.push(() => {
                bank(player);
            });
        }

        // Economy Transfer Button
        if (economyTransferVisible) {
            mainMenuForm.button("Convert Money", "textures/ui/realmsIcon");
            buttonActions.push(() => {
                economyTransfer(player);
            });
        }

        if (owner || typeof rank === "number") {
            mainMenuForm.button("Admin", "textures/ui/world_glyph_desaturated");
            buttonActions.push(() => {
                const currentOwner = isOwner(player);
                const currentRank = getAdminRank(player);
                if (!currentOwner && typeof currentRank !== "number") {
                    player.sendMessage("§cYou no longer have World Menu admin access.");
                    return mainMenu(player);
                }
                return currentOwner || currentRank === 0
                    ? adminMenu(player)
                    : formRank(player);
            });
        }

        if (isBetaTester(player)) {
            mainMenuForm.button("Beta Testers", "textures/ui/creative_icon");
            buttonActions.push(() => {
                betaTestersMenu(player);
            });
        }

        if (buttonActions.length === 0) {
            mainMenuForm.button("No Player Features Enabled", "textures/ui/infobulb");
            buttonActions.push(() => {
                player.sendMessage("§eNo player-facing World Menu features are enabled yet.");
                mainMenu(player);
            });
        }

        mainMenuForm.button("§l§cExit", "textures/ui/crossout");
        buttonActions.push(() => {});
    } catch (err) {
        player.sendMessage("§cError checking menu visibility: " + err);
    }

    mainMenuForm
        .show(player)
        .then((response) => {
            if (response.canceled) return;

            const action = buttonActions[response.selection];
            if (action) {
                action();
            } else {
                player.sendMessage("§cInvalid selection.");
            }
        })
        .catch((err) => {
            player.sendMessage(`§cAn error occurred: ${err}`);
        });
}



function betaTestersMenu(player) {
    upgradeOwnedBetaRewards(player);
    const betaForm = new ActionFormData()
        .title("§6Thank You Beta Testers!")
        .body(
            "We appreciate your efforts in testing the addon, finding bugs, and helping improve it.\n\n" +
            "§eYou may claim the Ender Zombie Mask and Ender Zombie Cape up to two times each.\n\n" +
            "The mask equips on your head. The cape equips in your offhand. Both are kept after death."
        )
        .button("Claim Gift", "textures/ui/gift_square")
        .button("Back", "textures/ui/book_arrowleft_hover");

    betaForm.show(player).then((response) => {
        if (response.canceled) return;

        if (response.selection === 0) {
            betaGiftMenu(player);
        } else if (response.selection === 1) {
            mainMenu(player);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred while showing the Beta Testers menu: ${err}`);
    });
}

function betaGiftMenu(player) {
    const maskClaims = getBetaClaimCount(player, "mask");
    const capeClaims = getBetaClaimCount(player, "cape");
    const giftForm = new ActionFormData()
        .title("§6Claim Beta Gift")
        .body(
            "You can claim each reward two times.\n\n" +
            `§dMask claims: §f${maskClaims}/2\n` +
            `§5Cape claims: §f${capeClaims}/2\n\n` +
            "Choose which gift you want to claim."
        )
        .button("Mask", "textures/ui/gift_square")
        .button("Cape", "textures/ui/gift_square")
        .button("Both", "textures/ui/gift_square")
        .button("Back", "textures/ui/book_arrowleft_hover");

    giftForm.show(player).then((response) => {
        if (response.canceled) return;
        if (response.selection === 3) return betaTestersMenu(player);

        const selections = ["mask", "cape", "both"];
        try {
            const result = claimBetaReward(player, selections[response.selection]);
            player.sendMessage(result.message);
            betaGiftMenu(player);
        } catch (error) {
            player.sendMessage(`§cFailed to grant the item: ${error.message}`);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred while showing the gift menu: ${err}`);
    });
}

