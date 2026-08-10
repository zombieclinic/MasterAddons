import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { adminSettingsMenu } from "admin_menu"

// Helper function for a delay
async function sleep(ticks) {
    return new Promise((resolve) => {
        system.runTimeout(resolve, ticks);
    });
}


export function dataBase(player) {
    const dataBaseform = new ActionFormData()
        .title("DataBase")
        .body("choose a option")
        .button("Remove Scoreboards")
        .button("View DataBase")
        .button("back")

    dataBaseform.show(player).then((response) => {

        if (response.canceled) return;


        switch (response.selection) {

            case 0:
                redButton(player); break;

            case 1:
                viewDataBase(player); break;

            case 2:
                adminSettingsMenu(player); break;

        }
    }
    )
}





function redButton(player) {
    const objectives = world.scoreboard.getObjectives();
    if (!objectives || objectives.length === 0) {
        player.sendMessage("§cNo scoreboards found.");
        return;
    }

    const form = new ModalFormData().title("§cDelete Scoreboards");

    const scoreboardNames = objectives.map(obj => obj.id);
    scoreboardNames.forEach(name => {
        form.toggle(`§e${name}`, { defaultValue: false });
    });

    form.show(player).then((response) => {
        if (response.canceled) {
            player.sendMessage("§7Scoreboard deletion canceled.");
            return;
        }

        // Collect selected scoreboards
        const selectedScoreboards = scoreboardNames.filter((_, index) => response.formValues[index]);

        if (selectedScoreboards.length === 0) {
            player.sendMessage("§cNo scoreboards selected for deletion.");
            return;
        }

        // Open the final confirmation form
        confirmDeletionForm(player, selectedScoreboards);
    }).catch((error) => {
        player.sendMessage(`§cError: ${error}`);
        console.error("Error in redbutton function:", error);
    });
}



// Function to confirm deletion with "Back" and "Confirm" buttons using ActionFormData
function confirmDeletionForm(player, selectedScoreboards) {
    const confirmForm = new ActionFormData()
        .title("§cFinal Confirmation")
        .body("§cYou are about to delete these scoreboards:\n\n" + selectedScoreboards.join("\n") + "\n\nThis action cannot be undone!")
        .button("§aConfirm Deletion")  // Button index 0
        .button("§cBack");  // Button index 1

    confirmForm.show(player).then((confirmResponse) => {
        if (confirmResponse.canceled) {
            player.sendMessage("§7Scoreboard deletion canceled.");
            return;
        }

        // If "Back" is clicked (button index 1), return to first form
        if (confirmResponse.selection === 1) {
            redbutton(player); // Reopen the scoreboard selection menu
            return;
        }

        // If "Confirm Deletion" is clicked (button index 0), delete selected scoreboards
        selectedScoreboards.forEach((scoreboardToDelete) => {
            world.scoreboard.removeObjective(scoreboardToDelete);
            player.sendMessage(`§aDeleted scoreboard: §6${scoreboardToDelete}`);
        });

        player.sendMessage("§aScoreboard deletion complete.");
    }).catch((error) => {
        player.sendMessage(`§cError: ${error}`);
        console.error("Error in confirmDeletionForm:", error);
    });
}





export function viewDataBase(player) {
    try {
        const objectives = world.scoreboard.getObjectives();

        if (objectives.length === 0) {
            player.sendMessage("§cNo scoreboards found.");
            return;
        }

        const scoreboardMenu = new ActionFormData()
            .title("§eScoreboard Database")
            .body("Select a scoreboard to view its data:");

        objectives.forEach((obj) => {
            scoreboardMenu.button(obj.id);
        });

        scoreboardMenu.button("§cBack"); // Back button

        scoreboardMenu.show(player).then((response) => {
            if (response.canceled || response.selection === objectives.length) return;

            const selectedObjective = objectives[response.selection].id;
            viewScoreboardData(player, selectedObjective);
        });
    } catch (error) {
        console.error("Error in viewDataBase function:", error);
        player.sendMessage("§cAn error occurred. Please try again.");
    }
}

async function viewScoreboardData(player, objectiveId) {
    try {
        const scores = world.scoreboard.getObjective(objectiveId)?.getParticipants() || [];

        if (scores.length === 0) {
            player.sendMessage(`§cNo players found for scoreboard: ${objectiveId}`);
            return;
        }

        const scoreMenu = new ActionFormData()
            .title(`§eScoreboard: ${objectiveId}`)
            .body("Select a fake player to view their score:");

        scores.forEach((participant) => {
            const name = participant.displayName;
            const score = world.scoreboard.getObjective(objectiveId).getScore(participant);
            scoreMenu.button(`${name}: ${score}`);
        });

        scoreMenu.button("§cBack"); // Back button

        scoreMenu.show(player).then((response) => {
            if (response.canceled || response.selection === scores.length) {
                viewDataBase(player); // Go back to the scoreboard list
                return;
            }
        });
    } catch (error) {
        console.error("Error in viewScoreboardData function:", error);
        player.sendMessage("§cAn error occurred. Please try again.");
    }
}
