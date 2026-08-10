import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { playerMenuSettings } from "./playermenusettings.js";

/**
 * Main Teleportation Menu Configuration
 * @param {Player} player - The player interacting with the menu.
 */
export function tpmenuconfig(player) {
    const scoreboardId = "admin";
    const fakePlayerName = "TpController";

    // Ensure the scoreboard exists
    const tpScoreboard = world.scoreboard.getObjective(scoreboardId)
        || world.scoreboard.addObjective(scoreboardId, "Admin Controls");

    // Get the current TP state
    const participant = tpScoreboard.getParticipants().find(
        (p) => p.displayName === fakePlayerName
    );
    const currentScore = participant ? tpScoreboard.getScore(participant) : 0;

    const tpMenuForm = new ActionFormData()
        .title("Teleportation Settings")
        .body("Configure your teleportation settings.")
        .button(`Teleportation is ${currentScore === 1 ? "§aOn" : "§cOff"}`, "textures/ui/infobulb")
        .button("Set Up Teleporters Menu", "textures/ui/book_frame")
        .button("§l§cBack", "textures/ui/book_arrowleft_hover");

    tpMenuForm.show(player).then((response) => {
        if (response.canceled) {
            player.sendMessage("Teleportation menu closed.");
            return;
        }

        switch (response.selection) {
            case 0:
                toggleTpController(player, fakePlayerName, tpScoreboard);
                break;
            case 1:
                setupTeleportersMenu(player);
                break;
            case 2:
                // Back to your main player settings menu or wherever you want to go
                playerMenuSettings(player);
                break;
            default:
                player.sendMessage("Invalid selection.");
        }
    });
}

/**
 * Toggles the main Teleportation Controller state and reloads the menu.
 * @param {Player} player 
 * @param {string} fakePlayerName 
 * @param {Objective} scoreboard 
 */
function toggleTpController(player, fakePlayerName, scoreboard) {
    const participant = scoreboard.getParticipants().find(
        (p) => p.displayName === fakePlayerName
    );
    const currentScore = participant ? scoreboard.getScore(participant) : 0;
    const newScore = currentScore === 1 ? 0 : 1;

    scoreboard.setScore(fakePlayerName, newScore);
    player.sendMessage(`Teleportation is now ${newScore === 1 ? "§aOn" : "§cOff"}.`);

    // Reload the main menu to update button text
    tpmenuconfig(player);
}

/**
 * Opens a single setup menu for all Teleporter-related settings.
 * @param {Player} player
 */
function setupTeleportersMenu(player) {
    // Gather existing values from scoreboard so we can populate defaults
    const homeTpsValue = getScoreFromAdmin("hometps");
    const homeCountValue = getScoreFromAdmin("homecount");
    const homeCostValue = getScoreFromAdmin("homecost");
    const playerTpsValue = getScoreFromAdmin("playertpsplayer");
    const teleportSpawnValue = getScoreFromAdmin("teleportspawn");
    const teleportHomeCostValue = getScoreFromAdmin("teleporthomecost");
    const teleportDelayValue = getScoreFromAdmin("teleportdelay", 5);

    const setupForm = new ModalFormData()
        .title("Teleporter Setup")
        // 1) Home Teleports On/Off
        .toggle("Home Teleports", { defaultValue: homeTpsValue === 1 })
        // 2) Number of Homes
        .textField("How many homes do you want players to have?", "Enter a number", { defaultValue: homeCountValue.toString() })
        // 3) Cost per Home
        .textField("Set the cost per home", "Enter cost", { defaultValue: homeCostValue.toString() })
        // 4) Player-to-Player Teleporter On/Off
        .toggle("Player-to-Player Teleporter", { defaultValue: playerTpsValue === 1 })
        // 5) Teleport to Spawn On/Off
        .toggle("Use Teleport to Spawn", { defaultValue: teleportSpawnValue === 1 })
        // 6) Cost to Teleport Home
        .textField("How much to charge to teleport home?", "Enter cost", { defaultValue: teleportHomeCostValue.toString() })
        // 7) Warmup before all player teleports
        .textField("Teleport warmup in seconds (movement or damage cancels):", "Seconds", { defaultValue: teleportDelayValue.toString() });

    setupForm.show(player).then((response) => {
        if (response.canceled) {
            player.sendMessage("Teleporter setup canceled.");
            // Return to main menu
            tpmenuconfig(player);
            return;
        }

        // Extract values
        const [
            homeTpsToggle,
            homeCountText,
            homeCostText,
            playerTpsToggle,
            teleportSpawnToggle,
            teleportHomeCostText,
            teleportDelayText
        ] = response.formValues;

        const homeCount = parseInt(homeCountText);
        if (isNaN(homeCount) || homeCount < 0) {
            player.sendMessage("Invalid number of homes. Please use a positive number (or 0).");
            setupTeleportersMenu(player);
            return;
        }
        const homeCost = parseInt(homeCostText);
        if (isNaN(homeCost) || homeCost < 0) {
            player.sendMessage("Invalid home cost. Please enter 0 or a positive number.");
            setupTeleportersMenu(player);
            return;
        }
        const teleportHomeCost = parseInt(teleportHomeCostText);
        if (isNaN(teleportHomeCost) || teleportHomeCost < 0) {
            player.sendMessage("Invalid home teleport cost. Please enter 0 or a positive number.");
            setupTeleportersMenu(player);
            return;
        }
        const teleportDelay = parseInt(teleportDelayText);
        if (isNaN(teleportDelay) || teleportDelay < 0 || teleportDelay > 300) {
            player.sendMessage("Teleport warmup must be between 0 and 300 seconds.");
            setupTeleportersMenu(player);
            return;
        }

        setScoreInAdmin("hometps", homeTpsToggle ? 1 : 0);
        setScoreInAdmin("homecount", homeCount);
        setScoreInAdmin("homecost", homeCost);
        setScoreInAdmin("playertpsplayer", playerTpsToggle ? 1 : 0);
        setScoreInAdmin("teleportspawn", teleportSpawnToggle ? 1 : 0);
        setScoreInAdmin("teleporthomecost", teleportHomeCost);
        setScoreInAdmin("teleportdelay", teleportDelay);

        player.sendMessage("All teleporter settings saved successfully!");
        // Return to main menu
        tpmenuconfig(player);
    });
}

/**
 * Retrieve a fake player's score from the "admin" objective.
 * @param {string} fakePlayerName 
 * @returns {number} The score stored under that fake player or 0 if not found.
 */
function getScoreFromAdmin(fakePlayerName, fallback = 0) {
    // Attempt to retrieve the 'admin' scoreboard
    const scoreboard = world.scoreboard.getObjective("admin");
    if (!scoreboard) return fallback;

    // Attempt to find the participant and get their score
    const participant = scoreboard.getParticipants().find(
        (p) => p.displayName === fakePlayerName
    );
    if (!participant) return fallback;
    return scoreboard.getScore(participant);
}

/**
 * Set a fake player's score in the "admin" objective to the specified value.
 * @param {string} fakePlayerName 
 * @param {number} score 
 */
function setScoreInAdmin(fakePlayerName, score) {
    const scoreboard = world.scoreboard.getObjective("admin")
        || world.scoreboard.addObjective("admin", "Admin Controls");
    scoreboard.setScore(fakePlayerName, score);
}
