import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";


const fireflies = new Map();

const SCRIPT_EVENT_HANDLERS = {
  "zombie:firefly2": source => registerFirefly(source)
};

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
  if (!sourceEntity) return;
  const handler = SCRIPT_EVENT_HANDLERS[id];
  if (handler) handler(sourceEntity);
});

function registerFirefly(entity) {
  if (entity.typeId !== "zombie:firefly" || fireflies.has(entity.id)) return;
  const controller = new FireflyTextureController(entity);
  fireflies.set(entity.id, controller);
  controller.start();
}

function isEntityValid(entity) {
  try {
    return typeof entity.isValid === "function" ? entity.isValid() : entity.isValid;
  } catch {
    return false;
  }
}

function randomTicks(minimum, maximum) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

class FireflyTextureController {
  constructor(entity) {
    this.entity = entity;
    this.stateRun = undefined;
  }

  start() {
    this.setLightState(true);
  }

  setLightState(lightOn) {
    if (!isEntityValid(this.entity)) {
      this.stop();
      return;
    }

    try {
      this.entity.triggerEvent(lightOn ? "firefly_on" : "firefly_off");
    } catch {
      this.stop();
      return;
    }

    if (lightOn) {
      // A lightning bug stays bright for roughly 1.5–3.5 seconds.
      this.stateRun = system.runTimeout(
        () => this.setLightState(false),
        randomTicks(30, 70)
      );
    } else {
      // Its dark pause varies so nearby fireflies do not blink in sync.
      this.stateRun = system.runTimeout(
        () => this.setLightState(true),
        randomTicks(18, 55)
      );
    }
  }

  stop() {
    if (this.stateRun !== undefined) {
      system.clearRun(this.stateRun);
      this.stateRun = undefined;
    }
    fireflies.delete(this.entity.id);
  }
}


/////////////////////////////////////////////////////////

class Guidebook {
    onUse(event) {
        const { source: player } = event;
        showGuidebookForm(player);
    }
}

// Separate function to create and show the guidebook form
function showGuidebookForm(player) {
    const guidebookForm = new ActionFormData()
        .title("The Book of Fireflies")
        .body("Welcome to the Firefly Addon! In this book, you will learn all about the new fireflies.")
        .button("Fireflies", "textures/ui/firefly")
        .button("Glass Jar", "textures/items/fireflys/glass_jar")
        .button("Firefly\n  Jar", "textures/items/fireflys/firefly_jar_5")
        .button("History", "textures/ui/book")
        .button("Emberlight", "textures/armor/dark/firefly_dark_helmet_icon")
        .button("Aetherlight", "textures/armor/green/firefly_helmet_icon")
        .button(" Firefly\nMobhead", "textures/items/mask/firefly_mask_icon")
        .button("Luciferin", "textures/items/fireflys/luciferin_item")
        .button("Luciferin\n   Fire", "textures/items/fireflys/luciferin_fire");

    guidebookForm.show(player).then(response => {
        switch (response.selection) {
            case 0: fireFly(player); break;
            case 1: glassJar(player); break;
            case 2: fireFlyjar(player); break;
            case 3: history(player); break;
            case 4: emberlight(player); break;
            case 5: aetherlight(player); break;
            case 6: fireflymobhead(player); break;
            case 7: luciferin(player); break;
            case 8: luciferinfire(player); break;
            default: break;
        }
    });
}

// Firefly details with a back button
function fireFly(player) {
    const fireflyForm = new ActionFormData()
        .title("Firefly")
        .body(`Fireflies are a new addition to your Minecraft world, bringing a unique atmosphere and behavior to the game. They can be found in swamps, jungles, mangrove swamps, and plains.

Fireflies have a special affinity for glow berries. Feeding glow berries to two adult fireflies will even result in baby fireflies! Young fireflies love glow berries, too, which help them grow into adults quickly.

Fireflies naturally emit light, illuminating the area around them. Their brightness ranges from level 6 to level 8, providing a soft, ambient glow.

You can leash fireflies to take them on adventures or bring them back to your base. Additionally, you can craft a glass jar to capture up to 5 fireflies. For more details, see the section on jars.:\n\n\n▪`)
        .button("Back");

    fireflyForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

// Glass Jar details with a back button
function glassJar(player) {
    const glassJarForm = new ActionFormData()
        .title("Glass Jar")
        .body(`Glass jars are a craftable item used to capture fireflies.

Empty glass jars can also be placed as blocks on the ground, walls, or ceilings, allowing for various block states.

You can even hang them from chains for a decorative touch

The crafting recipe for a glass jar requires:
- 1 Glass
- 1 Oak Slab\n\n\n▪`)
        .button("Back");

    glassJarForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

function fireFlyjar(player) {
    const fireFlyJarForm = new ActionFormData()
        .title("Firefly Jar 1")
        .body(`Firefly jars can be created by using a glass jar on a firefly, allowing you to capture them. Each jar can hold up to five fireflies.

Holding a firefly jar and using the interaction button will emit light around you for 2 seconds. The brightness increases with the number of fireflies in the jar:\n
- 1 Firefly = Brightness level 7
- 2 Fireflies = Brightness level 9
- 3 Fireflies = Brightness level 11
- 4 Fireflies = Brightness level 13
- 5 Fireflies = Brightness level 15

When placed in your off-hand, the firefly jar gives you animated firefly wings, adding a unique visual effect.

Firefly jars can also be placed like glass jars—on the ground, walls, or even ceilings. Try hanging one from a chain for dynamic lighting, as the light will flicker naturally.\n\n\n▪`)
        .button("Back");

    fireFlyJarForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

function history(player) {
    const historyForm = new ActionFormData()
        .title("History of Fireflies")
        .body(`The journey of fireflies in Minecraft began with Update 1.19, where we were promised a new mob: the firefly. Enthusiasts usuriousberry39 and knight2077—referred to as Berry and Knight in this story—were especially excited about this addition.

When fireflies didn't make it into the update, Berry and Knight had a brilliant idea: why not create their own fireflies, even better than the ones originally planned? They recruited their friend Nick, and together, they embarked on an exciting project. Both were thrilled, and soon they started crafting their own firefly addon.

**Firefly Addon Version 1.0**
Knight took on the challenge of creating the firefly model, Berry worked on the behavior coding, and Nick focused on designing the jars. Early on, they faced a key challenge: figuring out how to make the fireflies emit light. Nick had an innovative solution. Using command blocks, he created a system where light blocks would spawn around the player and the fireflies, giving the illusion of dynamic lighting. Nick’s expertise with deferred lighting made this possible, bringing the fireflies to life.

Knight's texture work was exceptional, and his original textures are still used today. The first version had light blocks that were a bit large and the items appeared oversized when held, but the functionality and overall look were incredible.

**Fireflies Addon Version 2.0**
Around this time, Berry met zombieclinic (known as Zombie), who had just started coding. He fell in love with the firefly addon and decided to take it to the next level. Thus, Fireflies 2.0 was born—a complete overhaul utilizing Minecraft’s new scripting capabilities.

Zombie worked diligently, fixing issues from the first version. When scripting was introduced, it truly brought the fireflies to life with random light timings. Zombie also redesigned the jars, giving them a more square, Minecraft-like appearance, which completed Berry, Knight, and Nick's vision.

For nearly a year, Zombie has continued to refine and improve the firefly addon, resulting in the final version we have today. Now, there are two versions available: one featuring firefly armor and another with the basic fireflies.

We hope you enjoy this mob as much as Berry, Knight, Nick, and Zombie enjoyed creating it.

**Contact Information**:
Join our community on Discord: https://discord.gg/kqWASbvfDG\n\n▪`)
        .button("Back");

    historyForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

function emberlight(player) {
    const emberlightForm = new ActionFormData()
        .title("Emberlight Armor")
        .body(`The Emberlight armor set provides complete protection against fire and lava damage, allowing you to move safely through flames and molten lava. However, intense heat will still impact its durability over time. Its strength matches Netherite armor, offering robust defense.

To craft each piece of the Emberlight armor, bring a Netherite armor piece to a smithing table and combine it with a Luciferin Fire and a Netherite ingot.

You can repair Emberlight armor in an anvil using another Emberlight armor piece or by using Luciferin Fire.\n\n▪`)
        .button("Back");

    emberlightForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}



function aetherlight(player) {
    const aetherlightForm = new ActionFormData()
        .title("Aetherlight Armor")
        .body(`The Aetherlight armor set grants powerful protection against the Wither effect and negates fall damage, allowing you to safely fall from any height. However, each fall impacts the armor’s durability. Its strength matches that of Netherite armor, providing excellent resilience.

To craft each piece of the Aetherlight armor, bring a Netherite armor piece to a smithing table and combine it with Luciferin and a Netherite ingot.

You can repair Aetherlight armor in an anvil using another Aetherlight armor piece or by using Luciferin.

**Warning:** If you enchant the boots with the Slow Falling enchantment, you will lose the fall protection effect on all pieces of the armor.\n\n▪`)
        .button("Back");

    aetherlightForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}



function fireflymobhead(player) {
    const fireflymobheadForm = new ActionFormData()
        .title("Firefly Mob Head")
        .body(`The Firefly Mob Head is a unique drop from fireflies, which you can wear on your head as a decorative item or place around your base as a display block. It can also be hung with chains to create a custom, ambient display that brings a touch of firefly charm to any environment.\n\n▪`)
        .button("Back");

    fireflymobheadForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

function luciferin(player) {
    const luciferinForm = new ActionFormData()
        .title("Luciferin")
        .body(`Luciferin is a rare drop from fireflies, which have a 1 percent chance of dropping it upon death. This chance increases with looting, adding a 2 percent multiplier per level of the enchantment. 

Luciferin can be crafted into a block that illuminates any area, providing a warm and magical glow. To craft the Luciferin Block, place 9 Luciferin items in a crafting table to create this unique light source.\n\n▪`)
        .button("Back");

    luciferinForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

function luciferinfire(player) {
    const luciferinfireForm = new ActionFormData()
        .title("Luciferin Fire")
        .body(`Luciferin Fire is created by processing Luciferin in a Blast Furnace, the only furnace capable of generating enough heat to refine this unique material.

Once crafted, Luciferin Fire can be used to create powerful armor or crafted into a luminous block that brightens any area. This refined material opens up versatile crafting options, making it a valuable asset for any adventurer.\n\n▪`)
        .button("Back");

    luciferinfireForm.show(player).then(response => {
        if (response.selection === 0) {
            showGuidebookForm(player);  // Call the main guidebook form to go back
        }
    });
}

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("zombie:guidebook", new Guidebook());
});


