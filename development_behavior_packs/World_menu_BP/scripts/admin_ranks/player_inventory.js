// player_inventory.js
import { ItemStack, ItemTypes, Player, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { openInventoryTypeMenu, formRank } from "./admin_ranks_menu.js"; // Ensure these functions are imported
import { itemMetadataText } from "../core/itemData.js";

// Helper: Retrieve enchantments from an item.
function GetEnchants(item) {
    if (!item || !item.hasComponent("minecraft:enchantable")) return [];

    try {
        const enchantComponent = item.getComponent("minecraft:enchantable");
        if (!enchantComponent) return [];
        const enchantments = enchantComponent.getEnchantments();
        return enchantments.map((enchantment) => ({
            type: enchantment.type.id.replace("minecraft:", ""),
            level: enchantment.level,
        }));
    } catch (error) {
        console.error("Error retrieving enchantments:", error);
        return [];
    }
}

// Updated function: Now accepts player, rank, and selectedPlayer.
export function inspectPlayerInventory(player, rank, selectedPlayer) {
    const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;

    if (!inventory) {
        player.sendMessage("§cUnable to fetch inventory.");
        // Return to the inventory type menu with the correct parameters.
        openInventoryTypeMenu(player, rank, selectedPlayer);
        return;
    }

    const items = [];
    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (item) items.push({ slot, item });
    }

    // Pass rank along with player and selectedPlayer.
    showInventoryForm(player, rank, selectedPlayer, items);
}

// Updated function: Now accepts player, rank, selectedPlayer, and items.
function showInventoryForm(player, rank, selectedPlayer, items) {
    // Safety-check: If selectedPlayer is missing, go to a fallback menu.
    if (!selectedPlayer) {
        player.sendMessage("§cError: No player selected. Returning to previous menu.");
        // Replace the following with whichever menu you consider appropriate.
        playerSettingsMenu(player, rank);
        return;
    }

    const inventoryForm = new ActionFormData()
        .title(`§6"${selectedPlayer.name}"'s Inventory`)
        .body("Select an item to view details:");

    // List each item in the inventory.
    items.forEach((entry) => {
        if (!entry || !entry.item || !entry.item.typeId) {
            console.warn("Invalid item detected, skipping:", entry);
            return;
        }
        const itemName = entry.item.typeId || "§cUnknown Item";
        const itemAmount = entry.item.amount || 1;
        inventoryForm.button(`${itemAmount}x ${itemName}`);
    });

    // Add Back and Exit buttons.
    inventoryForm.button("§l§cBack", "textures/ui/book_arrowleft_hover");
    inventoryForm.button("§l§cExit", "textures/ui/crossout");

    inventoryForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        // "Back" button: response.selection === items.length
        if (response.selection === items.length) {
            // Before calling openInventoryTypeMenu, check that selectedPlayer is defined.
            if (selectedPlayer) {
                openInventoryTypeMenu(player, rank, selectedPlayer);
            } else {
                player.sendMessage("§cError: No selected player found for navigation.");
                playerSettingsMenu(player, rank);
            }
            return;
        }

        // "Exit" button: response.selection === items.length + 1
        if (response.selection === items.length + 1) {
            player.sendMessage("§aExiting menu...");
            return;
        }

        const selectedEntry = items[response.selection];
        if (!selectedEntry || !selectedEntry.item) {
            player.sendMessage("§cInvalid item selected.");
            showInventoryForm(player, rank, selectedPlayer, items);
            return;
        }

        // Move to the details view with all required parameters.
        showItemDetails(player, rank, selectedPlayer, selectedEntry, items);
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        formRank(player);
    });
}


// Updated function: Pass player, rank, selectedPlayer, selectedEntry, and items.
function showItemDetails(player, rank, selectedPlayer, selectedEntry, items) {
    const { slot, item } = selectedEntry;

    if (!item || !item.typeId) {
        player.sendMessage("§cInvalid item selected.");
        showInventoryForm(player, rank, selectedPlayer, items);
        return;
    }

    const customName = item.nameTag || item.typeId || "Unknown Item";
    const itemAmount = item.amount || 0;

    const enchantments = GetEnchants(item);
    const enchantmentDetails = enchantments.length
        ? enchantments.map((e) => `§e${e.type}: Level ${e.level}`).join("\n")
        : "None";

    const detailsForm = new ActionFormData()
        .title(`§6Item Details: ${customName}`)
        .body(
            `§eAmount: ${itemAmount}\n` +
            `§eSlot: ${slot}\n` +
            itemMetadataText(item)
        )
        .button("Take Item")
        .button("Remove Item")
        .button("Back")
        .button("Admin Menu");

    detailsForm.show(player).then((response) => {
        if (response.canceled) {
            showInventoryForm(player, rank, selectedPlayer, items);
            return;
        }

        switch (response.selection) {
            case 0: // Take Item
                showTakeConfirmation(player, rank, selectedPlayer, selectedEntry, items);
                return;

            case 1: // Remove Item
                showRemoveConfirmation(player, rank, selectedPlayer, selectedEntry, items);
                return;

            case 2: // Back to Inventory (pass along rank as well)
                showInventoryForm(player, rank, selectedPlayer, items);
                return;

            case 3: // Admin Menu: Redirect to your main admin menu (or rank menu)
                formRank(player);
                return;

            default:
                player.sendMessage("§cInvalid selection.");
                break;
        }

        showInventoryForm(player, rank, selectedPlayer, items);
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showInventoryForm(player, rank, selectedPlayer, items);
    });
}

function showTakeConfirmation(player, rank, selectedPlayer, selectedEntry, items) {
    const { slot, item } = selectedEntry;
    const customName = item.nameTag || item.typeId || "Unknown Item";
    const itemAmount = item.amount || 0;

    const confirmationForm = new ActionFormData()
        .title("§aConfirm Take Item")
        .body(`§eAre you sure you want to take ${itemAmount}x ${customName} from "${selectedPlayer.name}"?`)
        .button("§aYes")
        .button("§cNo");

    confirmationForm.show(player).then((response) => {
        if (response.canceled || response.selection === 1) {
            // Return to the item details if canceled.
            showItemDetails(player, rank, selectedPlayer, selectedEntry, items);
            return;
        }

        if (response.selection === 0) {
            const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;
            const adminInventory = player.getComponent("minecraft:inventory")?.container;

            if (!inventory || !adminInventory) {
                player.sendMessage("§cUnable to fetch inventories.");
                return;
            }

            inventory.setItem(slot, null); // Remove the item from the player's inventory
            const remaining = adminInventory.addItem(item); // Add the item to the admin's inventory

            if (remaining) {
                player.sendMessage("§cYour inventory is full. The item couldn't be fully transferred.");
            } else {
                player.sendMessage(`§aYou took ${itemAmount}x ${customName} from "${selectedPlayer.name}".`);
            }

            // Refresh the inventory view.
            const refreshedItems = [];
            for (let i = 0; i < inventory.size; i++) {
                const refreshedItem = inventory.getItem(i);
                if (refreshedItem) refreshedItems.push({ slot: i, item: refreshedItem });
            }

            showInventoryForm(player, rank, selectedPlayer, refreshedItems);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showItemDetails(player, rank, selectedPlayer, selectedEntry, items);
    });
}

function showRemoveConfirmation(player, rank, selectedPlayer, selectedEntry, items) {
    const { slot, item } = selectedEntry;
    const customName = item.nameTag || item.typeId || "Unknown Item";
    const itemAmount = item.amount || 0;

    const confirmationForm = new ActionFormData()
        .title("§cConfirm Removal")
        .body(`§eAre you sure you want to remove ${itemAmount}x ${customName} from "${selectedPlayer.name}"'s inventory?`)
        .button("§aYes")
        .button("§cNo");

    confirmationForm.show(player).then((response) => {
        if (response.canceled || response.selection === 1) {
            showItemDetails(player, rank, selectedPlayer, selectedEntry, items);
            return;
        }

        if (response.selection === 0) {
            const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;

            if (!inventory) {
                player.sendMessage("§cUnable to fetch the player's inventory.");
                return;
            }

            inventory.setItem(slot, null); // Remove the item
            player.sendMessage(`§aYou removed ${itemAmount}x ${customName} from "${selectedPlayer.name}"'s inventory.`);

            // Refresh the inventory view.
            const refreshedItems = [];
            for (let i = 0; i < inventory.size; i++) {
                const refreshedItem = inventory.getItem(i);
                if (refreshedItem) refreshedItems.push({ slot: i, item: refreshedItem });
            }

            showInventoryForm(player, rank, selectedPlayer, refreshedItems);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showItemDetails(player, rank, selectedPlayer, selectedEntry, items);
    });
}
