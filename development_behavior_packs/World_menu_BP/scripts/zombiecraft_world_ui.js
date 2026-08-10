import { world, system } from "@minecraft/server";
import { MainMenu } from "./menu_index.js";
import { immediatePlayerOfflineCommandLeave } from "./player_offline.js";
import { initializeBaseProtection } from "./proximityBanCheck.js";
import { ensureObjective, getEntityScore, setEntityScore } from "./core/scoreboard.js";
import { migrateLegacyPermissions } from "./core/permissions.js";
import { enforcePlayerBan } from "./core/moderation.js";
import {
    registerGuidebookComponents,
    scheduleFirstJoinGuide
} from "./guidebooks.js";
import {
    economyActionBarText,
    ensureEconomyObjectives,
    getEconomySettings
} from "./core/economy.js";
import { hasActiveTeleport } from "./core/teleportWarmup.js";
import { upgradeOwnedBetaRewards } from "./core/betaRewards.js";


system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("zombie:menu", new MainMenu());
    registerGuidebookComponents(itemComponentRegistry);
});

const intervalTicks = 30;

system.runInterval(() => {
    const money = world.scoreboard.getObjective("Money");
    const display = world.scoreboard.getObjective("MoneyDisplay");
    if (!money || !display) return;

    for (const player of world.getPlayers()) {
        if (!player.scoreboardIdentity) continue;
        try {
            setEntityScore(display, player, getEntityScore(money, player));
        } catch {
            // A player can lose validity between getPlayers() and this write
            // while joining, leaving, or changing dimension. Retry next cycle.
        }
    }
}, intervalTicks);

system.runInterval(() => {
    if (!["actionbar", "actionbar_sidebar"].includes(getEconomySettings().displayMode)) return;
    for (const player of world.getPlayers()) {
        if (hasActiveTeleport(player)) continue;
        try {
            player.onScreenDisplay.setActionBar(economyActionBarText(player));
        } catch {
            // Retry after a joining or dimension-changing player becomes valid.
        }
    }
}, 10);

world.afterEvents.playerLeave.subscribe(() => {
    immediatePlayerOfflineCommandLeave();
});

world.afterEvents.playerSpawn.subscribe(({ initialSpawn, player }) => {
    if (!initialSpawn) return;
    ensureEconomyObjectives();
    ensureObjective("economyStart", "Economy Started");
    if (enforcePlayerBan(player)) return;
    scheduleFirstJoinGuide(player);
    initializePlayerWhenScoreboardReady(player);
    system.run(() => {
        try {
            upgradeOwnedBetaRewards(player);
        } catch (error) {
            console.warn(`[World Menu] Could not upgrade ${player.name}'s beta rewards: ${error}`);
        }
    });
});

initializeBaseProtection();

function initializePlayerWhenScoreboardReady(player, attemptsRemaining = 40) {
    if (!player.isValid) return;

    try {
        // setEntityScore accepts the Entity itself and creates its identity when
        // Bedrock has not exposed scoreboardIdentity yet.
        setEntityScore("Money", player, getEntityScore("Money", player));
        migrateLegacyPermissions(player);
        immediatePlayerOfflineCommandLeave();
        system.runTimeout(() => immediatePlayerOfflineCommandLeave(), 300);
    } catch (error) {
        if (attemptsRemaining > 0) {
            system.runTimeout(
                () => initializePlayerWhenScoreboardReady(player, attemptsRemaining - 1),
                5
            );
        } else {
            console.warn(`[World Menu] Could not initialize ${player.name}: ${error}`);
        }
    }
}
