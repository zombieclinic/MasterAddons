import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { baseManagement } from "./basemanagment.js";
import { getFriends, saveFriends } from "./core/bases.js";

export async function editFriendsMenu(player) {
  const friends = getFriends(player.id);
  const form = new ActionFormData()
    .title("Base Members")
    .body("Members may enter all of your enabled protected bases.")
    .button("Add Online Player", "textures/ui/color_plus")
    .button("Add Player Name", "textures/ui/FriendsIcon")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const friend of friends) form.button(friend.name, "textures/ui/FriendsIcon");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return addOnlineFriend(player);
  if (response.selection === 1) return addNamedFriend(player);
  if (response.selection === 2) return baseManagement(player);
  const friend = friends[response.selection - 3];
  if (friend) return removeFriend(player, friend);
}

async function addOnlineFriend(player) {
  const existing = getFriends(player.id);
  const players = [...world.getPlayers()]
    .filter((candidate) =>
      candidate.id !== player.id
      && !existing.some((friend) => friend.id === candidate.id)
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  if (!players.length) {
    player.sendMessage("§eThere are no eligible online players.");
    return editFriendsMenu(player);
  }

  const form = new ActionFormData()
    .title("Add Base Member")
    .button("§l§cBack");
  for (const candidate of players) form.button(candidate.name);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return editFriendsMenu(player);
  const selected = players[response.selection - 1];
  if (selected) {
    existing.push({ id: selected.id, name: selected.name });
    saveFriends(player.id, existing);
    player.sendMessage(`§aAdded ${selected.name}.`);
  }
  return editFriendsMenu(player);
}

async function addNamedFriend(player) {
  const response = await new ModalFormData()
    .title("Add Base Member by Name")
    .textField("Exact player name", "Spaces, underscores, and numbers are supported")
    .show(player);
  if (response.canceled) return editFriendsMenu(player);
  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cPlayer name cannot be empty.");
    return addNamedFriend(player);
  }

  const friends = getFriends(player.id);
  if (!friends.some((friend) => friend.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    friends.push({ name });
    saveFriends(player.id, friends);
  }
  return editFriendsMenu(player);
}

async function removeFriend(player, friend) {
  const response = await new MessageFormData()
    .title("Remove Base Member")
    .body(`Remove ${friend.name} from all of your protected bases?`)
    .button1("Cancel")
    .button2("Remove")
    .show(player);
  if (!response.canceled && response.selection === 1) {
    saveFriends(
      player.id,
      getFriends(player.id).filter((entry) =>
        friend.id ? entry.id !== friend.id : entry.name !== friend.name
      )
    );
  }
  return editFriendsMenu(player);
}
