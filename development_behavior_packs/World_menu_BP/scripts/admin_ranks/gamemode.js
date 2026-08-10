import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { playerSettingsMenu } from "./admin_ranks_menu.js";

/**
 * Gamemode Menu – Shows only those options (self or others) that are enabled.
 */
export function gamemodeMenu(player, rank) {
    const scoreboardName = `rank_${rank.name}`;
    // Define the eight gamemode options.
    const gmOptions = [
        { name: "gamemode_self_survival", description: "Self Survival", texture: "textures/ui/mashup_world", type: "self", mode: "survival" },
        { name: "gamemode_self_creative", description: "Self Creative", texture: "textures/ui/mining_fatigue_effect", type: "self", mode: "creative" },
        { name: "gamemode_self_spectator", description: "Self Spectator", texture: "textures/ui/nausea_effect", type: "self", mode: "spectator" },
        { name: "gamemode_self_adventure", description: "Self Adventure", texture: "textures/ui/message", type: "self", mode: "adventure" },
        { name: "gamemode_other_creative", description: "Other Creative", texture: "textures/ui/permissions_member_star_hover", type: "others", mode: "creative" },
        { name: "gamemode_other_survival", description: "Other Survival", texture: "textures/ui/profile_glyph_color", type: "others", mode: "survival" },
        { name: "gamemode_other_adventure", description: "Other Adventure", texture: "textures/ui/purple", type: "others", mode: "adventure" },
        { name: "gamemode_other_spectator", description: "Other Spectator", texture: "textures/ui/realm_icon_small", type: "others", mode: "spectator" }
    ];

    const obj = world.scoreboard.getObjective(scoreboardName);
    const scores = {};
    gmOptions.forEach(opt => {
        const part = obj.getParticipants().find(p => p.displayName === opt.name);
        scores[opt.name] = part ? obj.getScore(part) : 0;
    });

    const form = new ActionFormData()
        .title("Gamemode Settings")
        .body("Choose a gamemode option. Self is yourself; Others is another player.\nWarning: if you set yourself into spectator mode, you will need another admin to get you out.");
    const buttonActions = [];
    gmOptions.forEach(opt => {
        if (scores[opt.name] === 1) {
            form.button(opt.description, opt.texture);
            if (opt.type === "self") {
                buttonActions.push(() => selfChangeGamemode(player, rank, opt.mode));
            } else {
                buttonActions.push(() => othersChangeGamemode(player, rank, opt.mode));
            }
        }
    });
    // Add a Back button.
    form.button("Back", "textures/ui/book_arrowleft_hover");
    buttonActions.push(() => playerSettingsMenu(player, rank));

    form.show(player).then(resp => {
        if (resp.canceled) return;
        if (buttonActions[resp.selection]) buttonActions[resp.selection]();
    });
}

/**
 * For self gamemode change:
 * Prompts the admin to confirm and then sets their gamemode.
 */
function selfChangeGamemode(player, rank, mode) {
    const confirmForm = new ActionFormData()
        .title("Confirm Gamemode Change")
        .body(`Change your gamemode to ${mode}?`)
        .button("Yes", "textures/ui/check")
        .button("No", "textures/ui/crossout");
    confirmForm.show(player).then(resp => {
        if (resp.canceled || resp.selection === 1) {
            gamemodeMenu(player, rank);
            return;
        }
        try {
            player.runCommand(`gamemode ${mode} @s`);
            player.sendMessage(`§aYour gamemode has been set to ${mode}.`);
        } catch {
            player.sendMessage("§cFailed to change your gamemode.");
        }
        gamemodeMenu(player, rank);
    });
}

/**
 * For changing others' gamemode:
 * Opens a menu to select a target player, then prompts for confirmation.
 */
function othersChangeGamemode(player, rank, mode) {
    const others = world.getPlayers().filter(p => p.name !== player.name);
    const form = new ActionFormData()
        .title("Change Others Gamemode")
        .body(`Select a player to change their gamemode to ${mode}:`);
    const actions = [];
    others.forEach(target => {
        form.button(target.name);
        actions.push(() => {
            const confirmForm = new ActionFormData()
                .title("Confirm Gamemode Change")
                .body(`Change ${target.name}'s gamemode to ${mode}?`)
                .button("Yes", "textures/ui/check")
                .button("No", "textures/ui/crossout");
            confirmForm.show(player).then(resp => {
                if (resp.canceled || resp.selection === 1) {
                    othersChangeGamemode(player, rank, mode);
                    return;
                }
                try {
                    target.runCommand(`gamemode ${mode} @s`);
                    player.sendMessage(`§a${target.name}'s gamemode has been set to ${mode}.`);
                } catch {
                    player.sendMessage("§cFailed to change gamemode.");
                }
                gamemodeMenu(player, rank);
            });
        });
    });
    form.button("Back", "textures/ui/book_arrowleft_hover");
    actions.push(() => gamemodeMenu(player, rank));

    form.show(player).then(resp => {
        if (resp.canceled) return;
        if (actions[resp.selection]) actions[resp.selection]();
    });
}
