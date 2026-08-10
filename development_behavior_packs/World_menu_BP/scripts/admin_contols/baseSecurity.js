import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { playerMenuSettings } from "./playermenusettings.js";
import {
    getBaseSecuritySettings,
    saveBaseSecuritySettings as saveSettings
} from "../core/scoreboard.js";

export function baseSecurity(player) {
    const adminObjective = world.scoreboard.getObjective("admin");
    let toggleLabel = "Base Security: Off";
    if (adminObjective) {
        const participant = adminObjective.getParticipants().find(p => p.displayName === "basesecuritybutton");
        const currentScore = participant ? adminObjective.getScore(participant) : 0;
        toggleLabel = currentScore === 1 ? "Base Security: §aOn" : "Base Security: §cOff";
    }
    const form = new ActionFormData()
        .title("Base Security")
        .body("Manage base security settings.")
        .button(toggleLabel, "textures/ui/mashup_world")
        .button("Set Up Base Security", "textures/ui/Add-Ons_Nav_Icon36x36")
        .button("§l§cBack", "textures/ui/book_arrowleft_hover");

    form.show(player).then(response => {
        if (response.canceled) return;
        switch (response.selection) {
            case 0:
                toggleBaseSecurityButton(player);
                break;
            case 1:
                setupBaseSecurity(player);
                break;
            case 2:
                playerMenuSettings(player);
                break;
            default:
                break;
        }
    }).catch(err => {
        player.sendMessage("§cAn error occurred while managing base security.");
        console.error(err);
    });
}

function toggleBaseSecurityButton(player) {
    const adminObjective = world.scoreboard.getObjective("admin");
    if (!adminObjective) {
        player.sendMessage("§cAdmin scoreboard not found.");
        return;
    }
    const participant = adminObjective.getParticipants().find(p => p.displayName === "basesecuritybutton");
    const currentScore = participant ? adminObjective.getScore(participant) : 0;
    const newScore = currentScore === 1 ? 0 : 1;
    try {
        adminObjective.setScore("basesecuritybutton", newScore);
        player.sendMessage(`Base Security is now ${newScore === 1 ? "enabled" : "disabled"}.`);
    } catch (error) {
        player.sendMessage("§cFailed to toggle base security visibility. Please try again.");
        console.error(error);
    }
    baseSecurity(player);
}

function setupBaseSecurity(player) {
    const current = getBaseSecuritySettings();
    // The form now asks for 6 values:
    // 1. Security Radius (recommended 150)
    // 2. Allowed Base Security Systems (count)
    // 3. Minimum distance from X/Z axes (e.g., 100)
    // 4. Minimum distance from Spawn (e.g., 1000)
    // 5. Base Security Cost
    // 6. Minimum distance from another player's base (e.g., 500)
    const form = new ModalFormData()
        .title("Set Up Base Security")
        .textField("Enter the base security radius (in blocks, recommended 150):", "Radius", { defaultValue: String(current.radius) })
        .textField("Enter the number of base security systems allowed:", "Count", { defaultValue: String(current.maximum) })
        .textField("Enter the minimum distance from the X/Z axes (in blocks, e.g., 100):", "Min X/Z Distance", { defaultValue: String(current.minimumOrigin) })
        .textField("Enter the minimum distance from world/custom spawn (in blocks, e.g., 1000):", "Min Spawn Distance", { defaultValue: String(current.minimumSpawn) })
        .textField("Enter the base security cost:", "Cost", { defaultValue: String(current.cost) })
        .textField("Enter the minimum distance from another player's base (in blocks, e.g., 500):", "Min Base Distance", { defaultValue: String(current.minimumOther) });

    form.show(player).then(response => {
        if (response.canceled) {
            player.sendMessage("Setup canceled.");
            baseSecurity(player);
            return;
        }
        const radius = parseInt(response.formValues[0]);
        const count = parseInt(response.formValues[1]);
        const minXY = parseInt(response.formValues[2]);
        const minSpawn = parseInt(response.formValues[3]);
        const cost = parseInt(response.formValues[4]);
        const minBaseDistance = parseInt(response.formValues[5]);

        if (isNaN(radius) || radius <= 0 ||
            isNaN(count) || count < 0 ||
            isNaN(minXY) || minXY <= 0 ||
            isNaN(minSpawn) || minSpawn <= 0 ||
            isNaN(cost) || cost < 0 ||
            isNaN(minBaseDistance) || minBaseDistance <= 0) {
            player.sendMessage("Invalid input. Please enter positive numbers (cost may be 0).");
            setupBaseSecurity(player);
            return;
        }

        saveBaseSecuritySettings(player, radius, count, minXY, minSpawn, cost, minBaseDistance);
    }).catch(err => {
        player.sendMessage("§cAn error occurred while setting up base security.");
        console.error(err);
        baseSecurity(player);
    });
}

function saveBaseSecuritySettings(player, radius, count, minXY, minSpawn, cost, minBaseDistance) {
    const settings = {
        radius,
        maximum: count,
        minimumOrigin: minXY,
        minimumSpawn: minSpawn,
        cost,
        minimumOther: minBaseDistance
    };

    try {
        saveSettings(settings);
        player.sendMessage(
            `§aBase security settings saved immediately:\n` +
            `Radius: ${radius} blocks\n` +
            `Allowed Systems: ${count}\n` +
            `Min X/Z Distance: ${minXY} blocks\n` +
            `Min Spawn Distance: ${minSpawn} blocks\n` +
            `Security Cost: ${cost} Money\n` +
            `Min Distance from Other Bases: ${minBaseDistance} blocks`
        );
    } catch (error) {
        player.sendMessage("§cFailed to save base security settings.");
        console.error(error);
    } finally {
        baseSecurity(player);
    }
}
