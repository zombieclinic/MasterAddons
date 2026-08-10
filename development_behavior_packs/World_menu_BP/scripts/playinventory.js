import { ItemStack, ItemTypes, Player, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { viewPlayerInventory } from "./admin_menu.js";
import { itemMetadataText } from "./core/itemData.js";


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


export function inspectPlayerInventory(player, selectedPlayer) {
    const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;

    if (!inventory) {
        player.sendMessage("§cUnable to fetch inventory.");
        viewPlayerInventory(player);
        return;
    }

    const items = [];
    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (item) items.push({ slot, item });
    }

    showInventoryForm(player, selectedPlayer, items);
}

function showInventoryForm(player, selectedPlayer, items) {
    const inventoryForm = new ActionFormData()
        .title(`§6"${selectedPlayer.name}"'s Inventory`)
        .body("Select an item to view details:");

    items.forEach((entry) => {
        if (!entry || !entry.item || !entry.item.typeId) {
            console.warn("Invalid item detected, skipping:", entry); // Debugging
            return;
        }
        const itemName = entry.item.typeId || "§cUnknown Item";
        const itemAmount = entry.item.amount || 1; // Default to 1 if amount is not specified
        inventoryForm.button(`${itemAmount}x ${itemName}`);
    });

    inventoryForm.button("§l§cBack", "textures/ui/book_arrowleft_hover");
    inventoryForm.button("§l§cExit", "textures/ui/crossout");

    inventoryForm.show(player).then((response) => {
        if (response.canceled) return; // Exit silently

        if (response.selection === items.length) {
            // Back button
            viewPlayerInventory(player);
            return;
        }

        if (response.selection === items.length + 1) {
            // Exit button
            player.sendMessage("§aExiting menu...");
            return; // Exit completely
        }

        const selectedEntry = items[response.selection];
        if (!selectedEntry || !selectedEntry.item) {
            player.sendMessage("§cInvalid item selected.");
            showInventoryForm(player, selectedPlayer, items);
            return;
        }

        showItemDetails(player, selectedPlayer, selectedEntry, items);
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        adminMenu(player);
    });
}



function showItemDetails(player, selectedPlayer, selectedEntry, items) {
    const { slot, item } = selectedEntry;

    if (!item || !item.typeId) {
        player.sendMessage("§cInvalid item selected.");
        showInventoryForm(player, selectedPlayer, items);
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
            showInventoryForm(player, selectedPlayer, items);
            return;
        }

        switch (response.selection) {
            case 0: // Take Item
                showTakeConfirmation(player, selectedPlayer, selectedEntry, items);
                return;

            case 1: // Remove Item
                showRemoveConfirmation(player, selectedPlayer, selectedEntry, items);
                return;

            case 2: // Back to Inventory
                showInventoryForm(player, selectedPlayer, items);
                return;

            case 3: // Admin Menu
                adminMenu(player);
                return;

            default:
                player.sendMessage("§cInvalid selection.");
                break;
        }

        showInventoryForm(player, selectedPlayer, items);
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showInventoryForm(player, selectedPlayer, items);
    });
}

function showTakeConfirmation(player, selectedPlayer, selectedEntry, items) {
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
            // If canceled or "No" is clicked, go back to the item details
            showItemDetails(player, selectedPlayer, selectedEntry, items);
            return;
        }

        if (response.selection === 0) {
            // If "Yes" is clicked, take the item and refresh the inventory view
            const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;
            const adminInventory = player.getComponent("minecraft:inventory")?.container;

            if (!inventory || !adminInventory) {
                player.sendMessage("§cUnable to fetch inventories.");
                return;
            }

            inventory.setItem(slot, null); // Remove the item from the player's inventory
            const remaining = adminInventory.addItem(item); // Try to add it to the admin's inventory

            if (remaining) {
                player.sendMessage("§cYour inventory is full. The item couldn't be fully transferred.");
            } else {
                player.sendMessage(`§aYou took ${itemAmount}x ${customName} from "${selectedPlayer.name}".`);
            }

            // Refresh the inventory menu
            const refreshedItems = [];
            for (let i = 0; i < inventory.size; i++) {
                const refreshedItem = inventory.getItem(i);
                if (refreshedItem) refreshedItems.push({ slot: i, item: refreshedItem });
            }

            showInventoryForm(player, selectedPlayer, refreshedItems);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showItemDetails(player, selectedPlayer, selectedEntry, items);
    });
}

function showRemoveConfirmation(player, selectedPlayer, selectedEntry, items) {
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
            // If canceled or "No" is clicked, go back to the item details
            showItemDetails(player, selectedPlayer, selectedEntry, items);
            return;
        }

        if (response.selection === 0) {
            // If "Yes" is clicked, remove the item and refresh the inventory view
            const inventory = selectedPlayer.getComponent("minecraft:inventory")?.container;

            if (!inventory) {
                player.sendMessage("§cUnable to fetch the player's inventory.");
                return;
            }

            inventory.setItem(slot, null); // Remove the item
            player.sendMessage(`§aYou removed ${itemAmount}x ${customName} from "${selectedPlayer.name}"'s inventory.`);

            // Refresh the inventory menu
            const refreshedItems = [];
            for (let i = 0; i < inventory.size; i++) {
                const refreshedItem = inventory.getItem(i);
                if (refreshedItem) refreshedItems.push({ slot: i, item: refreshedItem });
            }

            showInventoryForm(player, selectedPlayer, refreshedItems);
        }
    }).catch((err) => {
        player.sendMessage(`§cAn error occurred: ${err.message}`);
        showItemDetails(player, selectedPlayer, selectedEntry, items);
    });
}
