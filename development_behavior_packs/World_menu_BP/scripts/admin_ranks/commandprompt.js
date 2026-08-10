import { world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { formRank } from "./admin_ranks_menu.js"

/*************************************************
* 2) Command Prompt Submenu
*************************************************/
export async function commandPromptMenu(player, rank) {
    const rankScoreboardName = `rank_${rank.name}`;
    const rankObjective = world.scoreboard.getObjective(rankScoreboardName);

    if (!rankObjective) {
        player.sendMessage(`§cThe rank scoreboard '${rankScoreboardName}' does not exist.`);
        return;
    }

    const bannedCommands = getScoreboardEntries(rankScoreboardName, "commandprompt_");
    const blockedKeywords = getScoreboardEntries(rankScoreboardName, "commandkey_");

    const commandForm = new ModalFormData()
        .title(`§4Command Prompt: ${rank.name}`)
        .textField("Enter command to execute:", "e.g., say Hello");

    const response = await commandForm.show(player);
    if (response.canceled) {
        formRank(player);
        return;
    }

    const command = response.formValues[0]?.trim();
    if (!command) {
        player.sendMessage("§cNo command entered.");
        formRank(player);
        return;
    }

    if (bannedCommands.includes(command)) {
        player.sendMessage(`§cThis command is banned: "${command}".`);
        formRank(player);
        return;
    }

    const words = command.split(" ");
    if (blockedKeywords.some(keyword => words[0] === keyword)) {
        player.sendMessage(`§cCannot use commands starting with '${words[0]}'`);
        formRank(player);
        return;
    }

    try {
        player.runCommand(command);
        player.sendMessage(`§aCommand executed: /${command}`);
    } catch (err) {
        player.sendMessage(`§cFailed to execute: ${err.message}`);
    }

    formRank(player);
}

function getScoreboardEntries(scoreboardName, prefix) {
    const obj = world.scoreboard.getObjective(scoreboardName);
    if (!obj) return [];
    return obj.getParticipants()
        .map(p => p.displayName)
        .filter(name => name.startsWith(prefix))
        .map(name => decodeCommandString(name.replace(prefix, "")));
}

function decodeCommandString(encodedCommand) {
    return encodedCommand
        .replace(/_at_/g, "@")
        .replace(/_space_/g, " ")
        .replace(/_slash_/g, "/")
        .replace(/_colon_/g, ":")
        .replace(/_dot_/g, ".");
}
