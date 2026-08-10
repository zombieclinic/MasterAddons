import { ItemStack, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { isAdministrator } from "./core/permissions.js";

const PLAYER_GUIDE_ID = "zombie:world_menu_player_guide";
const ADMIN_GUIDE_ID = "zombie:world_menu_admin_guide";
const WORLD_MENU_ID = "zombie:menu_ui";
const PLAYER_GUIDE_TAG = "zc_worldmenu_guide_received";
const GUIDE_DELAY_TICKS = 20 * 60;

const PLAYER_PAGES = [
  {
    title: "Getting Started",
    icon: "textures/ui/how_to_play_button",
    text:
      "Use the World Menu item to open the menu. The buttons you see depend on the features enabled by this world's administrators.\n\n" +
      "Use this guide book at any time to reopen these instructions. Keep it somewhere safe."
  },
  {
    title: "Money and Bank",
    icon: "textures/ui/icon_minecoin_9x9",
    text:
      "Your Money balance pays for enabled menu services and store purchases.\n\n" +
      "The Bank lets you deposit supported physical currency into your balance or withdraw it again. Player Transfer sends Money to another online player. Convert Money can move an old scoreboard balance into the current economy once.\n\n" +
      "Admins can display balances privately in each player's action bar, on the sidebar, in the player list, or in a combined display. Starting balances, conversion, and available buttons are chosen by the world owner."
  },
  {
    title: "Server and Sell Shops",
    icon: "textures/ui/MCoin",
    text:
      "Server Store: choose a store, select an item, choose an amount, and confirm the purchase.\n\n" +
      "Sell Shop: select a listing and sell matching items from your inventory.\n\n" +
      "Custom names, lore, durability, enchantments, and supported item properties must match the listing exactly."
  },
  {
    title: "Player Shops",
    icon: "textures/ui/village_hero_effect",
    text:
      "Players can create shops when this feature is enabled. Add a held item as a listing, set its quantity and price, and stock it from your inventory.\n\n" +
      "Shulker boxes and other storage items keep their contents when listed, stocked, purchased, sold, or returned.\n\n" +
      "Sales are saved as pending earnings for the owner to collect. Closing a shop returns its remaining stock whenever possible."
  },
  {
    title: "Teleporting and Homes",
    icon: "textures/ui/NetherPortalMirror",
    text:
      "Player TP sends a request to another player. They must accept before the teleport countdown begins. Moving or taking damage during the countdown cancels the teleport and refunds its cost.\n\n" +
      "Homes save your location and dimension. Home and spawn teleports use the same safe countdown. You can update, rename, or remove each home. Limits, costs, and countdown length are set by admins."
  },
  {
    title: "Bases and Basemates",
    icon: "textures/ui/invite_base",
    text:
      "Base Security protects the configured area around each enabled base.\n\n" +
      "Strangers cannot break blocks or open containers there. The base owner, listed basemates/friends, and administrators are allowed. Use Base Management to rename bases and manage access."
  },
  {
    title: "Help and Safety",
    icon: "textures/ui/icon_book_writable",
    text:
      "If a button is missing, that feature may be disabled by the world owner.\n\n" +
      "If your inventory is full, delivered items may be dropped at your feet. Read confirmation screens carefully before spending money, closing a shop, removing a home, or changing a base."
  }
];

const ADMIN_PAGES = [
  {
    title: "Setup and Access",
    icon: "textures/ui/op",
    text:
      "The first person who completes World Menu setup becomes the world owner. The owner has every admin control and can create ranked admins.\n\n" +
      "Ranked admins see only the tools enabled for their rank. Player names are stored using identity-safe data, including names with spaces, underscores, and numbers."
  },
  {
    title: "Player Management",
    icon: "textures/ui/invite_base",
    text:
      "Use Player Management to change gamemodes, ban or unban players, adjust balances, inspect inventories and Ender Chests, teleport to players, and inspect protected bases or online-player homes.\n\n" +
      "Owner protection prevents the world owner from being banned."
  },
  {
    title: "Menu and TP Settings",
    icon: "textures/ui/settings_glyph_color_2x",
    text:
      "Player Menu Settings controls which player features appear: banking, teleports, stores, sell shops, and base security.\n\n" +
      "Teleport settings control requests, homes, home limits, creation costs, teleport costs, spawn behavior, and the warmup countdown. A player moving or taking damage cancels a warmup and refunds the reserved cost. Set Spawn records the menu spawn point. Command Prompt runs a command as the admin using it."
  },
  {
    title: "Economy",
    icon: "textures/ui/deop",
    text:
      "Economy settings control the currency name, starting balance, display mode, and optional conversion from an old objective. Display choices include a private action bar, sidebar, player list, combined modes, or hidden.\n\n" +
      "Customize Action Bar Text accepts {player}, {economy}, and {money}. Type \\n where a new line should appear.\n\n" +
      "Conversion runs once per player identity. Economy Reset clears World Menu Money balances, while Delete All removes every World Menu system."
  },
  {
    title: "Stores and Enchantments",
    icon: "textures/ui/icon_panda",
    text:
      "Server Stores sell configured items. Sell Shops buy matching items. Player Shops use player-owned stock and pending earnings.\n\n" +
      "Hold the exact item when creating a listing. The system preserves custom names, lore, durability, enchantments, supported dynamic properties, and the complete inventories of shulker boxes or other storage items."
  },
  {
    title: "Base Security",
    icon: "textures/ui/emptyStarFocus",
    text:
      "Configure whether Base Security appears, the protected radius, base limit, costs, and spacing requirements.\n\n" +
      "Unauthorized players are blocked from breaking blocks and opening containers. Owners, basemates/friends, and administrators bypass protection."
  },
  {
    title: "Ranks and Permissions",
    icon: "textures/ui/permissions_member_star",
    text:
      "Admin Management creates ranks, assigns their level, enables categories, and chooses individual tools inside each category.\n\n" +
      "Assign players through the player list. Removing a rank changes affected admins to the trusted fallback level instead of encoding their names into scoreboards."
  },
  {
    title: "Database and Delete All",
    icon: "textures/ui/trash",
    text:
      "View and Edit Database lets authorized admins inspect scoreboards and manually remove selected objectives.\n\n" +
      "Owner-only Delete All requires two confirmations. It removes World Menu economy, stores, bases, homes, bans, ranks, permissions, settings, and World Menu-created scoreboards. It does not remove unrelated add-on data."
  }
];

class PlayerGuideComponent {
  onUse({ source }) {
    showGuide(source, "§2ZC World Menu Player Guide", PLAYER_PAGES);
  }
}

class AdminGuideComponent {
  onUse({ source }) {
    if (!isAdministrator(source)) {
      source.sendMessage("§cThis guide is only available to World Menu administrators.");
      return;
    }
    showGuide(source, "§4ZC World Menu Admin Guide", ADMIN_PAGES);
  }
}

export function registerGuidebookComponents(itemComponentRegistry) {
  itemComponentRegistry.registerCustomComponent(
    "zombie:world_menu_player_guide",
    new PlayerGuideComponent()
  );
  itemComponentRegistry.registerCustomComponent(
    "zombie:world_menu_admin_guide",
    new AdminGuideComponent()
  );
}

export function scheduleFirstJoinGuide(player) {
  if (player.hasTag(PLAYER_GUIDE_TAG)) return;

  system.runTimeout(() => {
    if (!player.isValid || player.hasTag(PLAYER_GUIDE_TAG)) return;

    try {
      giveBook(player, PLAYER_GUIDE_ID);
      giveBook(player, WORLD_MENU_ID);
      player.addTag(PLAYER_GUIDE_TAG);
      player.sendMessage(
        "§aThank you for trying ZC World Menu! Here is your World Menu and a book that explains how everything works."
      );
    } catch (error) {
      console.warn(`[World Menu] Could not give ${player.name} the player guide: ${error}`);
    }
  }, GUIDE_DELAY_TICKS);
}

export function giveAdminGuide(player) {
  if (!isAdministrator(player)) {
    player.sendMessage("§cOnly World Menu administrators can receive the admin guide.");
    return false;
  }

  try {
    giveBook(player, ADMIN_GUIDE_ID);
    player.sendMessage("§aThe ZC World Menu Admin Guide was added to your inventory.");
    return true;
  } catch (error) {
    console.warn(`[World Menu] Could not give ${player.name} the admin guide: ${error}`);
    player.sendMessage("§cThe admin guide could not be delivered. Please try again.");
    return false;
  }
}

function giveBook(player, typeId) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) throw new Error("Player inventory is unavailable.");

  const overflow = inventory.addItem(new ItemStack(typeId, 1));
  if (overflow) player.dimension.spawnItem(overflow, player.location);
}

async function showGuide(player, title, pages) {
  const form = new ActionFormData()
    .title(title)
    .body("Choose a chapter:")
    .button("§lOverview", "textures/items/worldmenuhowto");

  for (const page of pages) form.button(page.title, page.icon);
  form.button("§cClose", "textures/ui/crossout");

  const response = await form.show(player);
  if (response.canceled || response.selection === pages.length + 1) return;
  if (response.selection === 0) return showOverview(player, title, pages);

  const page = pages[response.selection - 1];
  if (page) return showPage(player, title, pages, page);
}

async function showOverview(player, title, pages) {
  const response = await new ActionFormData()
    .title(title)
    .body(
      "This guide explains the ZC World Menu from your point of view.\n\n" +
      pages.map((page, index) => `§6${index + 1}. §f${page.title}`).join("\n")
    )
    .button("§aBack to Chapters", "textures/ui/book_arrowleft_hover")
    .button("§cClose", "textures/ui/crossout")
    .show(player);

  if (!response.canceled && response.selection === 0) return showGuide(player, title, pages);
}

async function showPage(player, title, pages, page) {
  const response = await new ActionFormData()
    .title(page.title)
    .body(page.text)
    .button("§aBack to Chapters", "textures/ui/book_arrowleft_hover")
    .button("§cClose", "textures/ui/crossout")
    .show(player);

  if (!response.canceled && response.selection === 0) return showGuide(player, title, pages);
}
