import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { playerSettingsMenu } from "./admin_ranks_menu.js"
import { addEntityScore } from "../core/scoreboard.js";


/*************************************************
 * 4b) Modify Player Balance
 *************************************************/
export function modifyPlayerBalance(player, rank) {
    const online = [...world.getPlayers()];
    if (!online.length) {
        player.sendMessage("§cNo players online.");
        playerSettingsMenu(player, rank);
        return;
    }

    const form = new ActionFormData()
        .title("Modify Player Balance")
        .body("Select a player:");
    const actions = [];
    online.forEach(p => {
        form.button(p.name);
        actions.push(() => inputRewardAmount(player, rank, p));
    });

    // Back
    form.button("Back", "textures/ui/book_arrowleft_hover");
    actions.push(() => playerSettingsMenu(player, rank));

    form.show(player).then(r => {
        if (r.canceled) return;
        if (r.selection < actions.length) actions[r.selection]();
    });
}

function inputRewardAmount(player, rank, target) {
    const m = new ModalFormData()
        .title(`Modify Balance for ${target.name}`)
        .textField("Amount (+ for reward, - for penalty):", "Amount", { defaultValue: "0" });

    m.show(player).then(r => {
        if (r.canceled) {
            modifyPlayerBalance(player, rank);
            return;
        }
        const amt = parseInt(r.formValues[0]);
        if (isNaN(amt)) {
            player.sendMessage("§cInvalid amount.");
            inputRewardAmount(player, rank, target);
            return;
        }
        confirmModifyBalance(player, rank, target, amt);
    });
}

function confirmModifyBalance(player, rank, target, amt) {
    const op = amt >= 0 ? "Reward" : "Penalty";
    const absVal = Math.abs(amt);

    const c = new ActionFormData()
        .title(`Confirm ${op}`)
        .body(`Are you sure you want to ${op.toLowerCase()} ${target.name} by ${absVal} Money?`)
        .button("Yes", "textures/ui/check")
        .button("No", "textures/ui/crossout");

    c.show(player).then(resp => {
        if (resp.canceled || resp.selection === 1) {
            modifyPlayerBalance(player, rank);
            return;
        }
        try {
            addEntityScore("Money", target, amt);
            player.sendMessage(`§aSuccessfully ${op.toLowerCase()}ed ${target.name} by ${absVal}.`);
        } catch (err) {
            player.sendMessage(`§cFailed updating Money: ${err}`);
        }
        playerSettingsMenu(player, rank);
    });
}
