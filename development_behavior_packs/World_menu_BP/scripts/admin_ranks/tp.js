import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { formRank } from "./admin_ranks_menu.js"


/*************************************************
 * 3) Teleport Submenu
 *************************************************/
export function teleportMenu(player, rank) {
    const rankScoreboardName = `rank_${rank.name}`;
    const options = [
        { name: "Tplayer", desc: "Teleport to Other Players", icon: "textures/ui/check" },
        { name: "TPPlayer", desc: "Teleport Player to Player", icon: "textures/ui/arrow" }
    ];
    const scores = {};

    const obj = world.scoreboard.getObjective(rankScoreboardName);
    options.forEach(opt => {
        const part = obj.getParticipants().find(p => p.displayName === opt.name);
        scores[opt.name] = part ? obj.getScore(part) : 0;
    });

    const form = new ActionFormData()
        .title("Teleport Settings")
        .body("Select a teleport option:");

    const buttonActions = [];
    options.forEach(opt => {
        if (scores[opt.name] === 1) {
            form.button(opt.desc, opt.icon);
            if (opt.name === "Tplayer") {
                buttonActions.push(() => teleportToPlayer(player, rank));
            } else {
                buttonActions.push(() => teleportPlayerToPlayer(player, rank));
            }
        }
    });

    // Back => rank
    form.button("Back", "textures/ui/book_arrowleft_hover");
    buttonActions.push(() => formRank(player));

    form.show(player).then(resp => {
        if (resp.canceled) return;
        const idx = resp.selection;
        if (buttonActions[idx]) buttonActions[idx]();
    }).catch(err => {
        player.sendMessage(`§cError in teleportMenu: ${err}`);
    });
}

function teleportToPlayer(player, rank) {
    const list = [...world.getPlayers()];
    if (!list.length) {
        player.sendMessage("§cNo players online.");
        teleportMenu(player, rank);
        return;
    }

    const f = new ActionFormData()
        .title("Teleport to Player")
        .body("Select a player:");
    const actions = [];
    list.forEach(p => {
        f.button(p.name);
        actions.push(() => confirmTeleport(player, rank, p));
    });

    // Back
    f.button("Back", "textures/ui/book_arrowleft_hover");
    actions.push(() => teleportMenu(player, rank));

    f.show(player).then(resp => {
        if (resp.canceled) return;
        if (resp.selection >= actions.length) return;
        actions[resp.selection]();
    });
}

function confirmTeleport(player, rank, target) {
    const { x, y, z } = target.location;
    const cForm = new ActionFormData()
        .title("Confirm Teleport")
        .body(`Teleport to ${target.name} at [${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}]?`)
        .button("Yes", "textures/ui/check")
        .button("No", "textures/ui/crossout");

    cForm.show(player).then(resp => {
        if (resp.canceled || resp.selection === 1) {
            teleportToPlayer(player, rank);
            return;
        }
        player.teleport(target.location, { dimension: target.dimension });
        player.sendMessage(`§aTeleported to ${target.name}.`);
    });
}

function teleportPlayerToPlayer(player, rank) {
    const list = [...world.getPlayers()];
    if (list.length < 2) {
        player.sendMessage("§cNot enough players online.");
        teleportMenu(player, rank);
        return;
    }

    const names = list.map(p => p.name);
    const form = new ModalFormData()
        .title("Teleport Player to Player")
        .dropdown("Select who to teleport:", names)
        .dropdown("Select destination player:", names);

    form.show(player).then(resp => {
        if (resp.canceled) {
            teleportMenu(player, rank);
            return;
        }
        const src = list[resp.formValues[0]];
        const dest = list[resp.formValues[1]];
        if (!src || !dest || src === dest) {
            player.sendMessage("§cInvalid selection.");
            teleportMenu(player, rank);
            return;
        }
        confirmTeleportPlayerToPlayer(player, rank, src, dest);
    });
}

function confirmTeleportPlayerToPlayer(player, rank, src, dest) {
    const { x, y, z } = dest.location;
    const cForm = new ActionFormData()
        .title("Confirm Teleport")
        .body(`Teleport ${src.name} to ${dest.name}?\nCoords: [${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}]`)
        .button("Yes", "textures/ui/check")
        .button("No", "textures/ui/crossout");

    cForm.show(player).then(resp => {
        if (resp.canceled || resp.selection === 1) {
            teleportPlayerToPlayer(player, rank);
            return;
        }
        src.teleport(dest.location, { dimension: dest.dimension });
        player.sendMessage(`§aTeleported ${src.name} to ${dest.name}.`);
    });
}
