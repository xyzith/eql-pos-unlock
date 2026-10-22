import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { diff } from "../src/diff.js";
import { decodeText, parseAchievements, parseInventory } from "../src/parse.js";

test("decodeText strips a BOM and rejects invalid UTF-8", () => {
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x41])), "A");
  assert.equal(decodeText(new Uint8Array([0xff])), null);
});

test("parseAchievements keeps an obtain under a completed class", () => {
  const parsed = parseAchievements(
    [
      "\uFEFFUntapped Potential: Classes",
      "C\tRace Unlock - Barbarian",
      "C\tPrimary Class Unlock - Bard\t",
      "I\t\tObtain Mask of Song.",
      "I\t\tThis achievement can be bypassed using a Primary Class Unlock Token.",
      "I\t\tThis achievement will autocomplete if you chose to confirm your Primary Class as a Bard.",
    ].join("\r\n"),
  );
  assert.deepEqual(parsed, {
    ok: true,
    classes: [
      {
        status: "C",
        name: "Bard",
        obtains: [{ status: "I", text: "Obtain Mask of Song." }],
      },
    ],
  });
});

test("parseAchievements returns an empty class list when no unlock rows exist", () => {
  const parsed = parseAchievements("C\tRace Unlock - Human\n");
  assert.deepEqual(parsed, { ok: true, classes: [] });
});

test("parseAchievements fails closed", () => {
  assert.deepEqual(parseAchievements("hello\n"), { ok: false });
  assert.deepEqual(parseAchievements("C\t\t\tnope\n"), { ok: false });
  assert.deepEqual(parseAchievements("I\t\tObtain Mask of Song.\n"), { ok: false });
});

test("parseAchievements skips non-obtain rows around a class block", () => {
  const parsed = parseAchievements(
    [
      "C\t\tGet maximum faction with the guards",
      "C\tPrimary Class Unlock - Bard",
      "I\t\tObtain Mask of Song.",
      "I\t\tFinish the trial\t2/5",
    ].join("\n"),
  );
  assert.deepEqual(parsed, {
    ok: true,
    classes: [
      {
        status: "C",
        name: "Bard",
        obtains: [{ status: "I", text: "Obtain Mask of Song." }],
      },
    ],
  });
});

const HEADER = "Location\tName\tID\tCount\tSlots";

test("parseInventory keeps bag names and keyring names", () => {
  const parsed = parseInventory(
    [
      HEADER,
      "General 1-Slot1\tSpiroc Air Totem\t1\t1\t11",
      "General 1-Slot2\tEmpty\t0\t0\t0",
      "General 1-Slot3\tWind Rune Beza\t2\t0\t11",
      "Bank1\tPauldrons of the Blue Sky +7\t3\t1\t11\t",
      "",
      "KeyRing\tName\tID\t",
      "Augmentation\tAl`Kabor's Cap of Binding\t9",
      "Equipment\tEmpty\t8",
      "",
    ].join("\n"),
  );
  assert.deepEqual(parsed, {
    ok: true,
    names: [
      "Spiroc Air Totem",
      "Pauldrons of the Blue Sky +7",
      "Al`Kabor's Cap of Binding",
    ],
  });
});

test("parseInventory accepts a file with no keyring", () => {
  const parsed = parseInventory([HEADER, "Head\tMask of Song\t1\t1\t10", ""].join("\n"));
  assert.deepEqual(parsed, { ok: true, names: ["Mask of Song"] });
});

test("parseInventory fails closed", () => {
  assert.deepEqual(parseInventory("Name\tID\n"), { ok: false });
  assert.deepEqual(parseInventory(`${HEADER}\nHead\tOnly\n`), { ok: false });
  assert.deepEqual(parseInventory(`${HEADER}\nHead\tMask\tnope\t1\t10\n`), { ok: false });
  assert.deepEqual(
    parseInventory([HEADER, "Head\tMask\t1\t1\t10", "", "Augmentation\tFoo\t1"].join("\n")),
    { ok: false },
  );
});

const fixture = (name) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

const NO_GEAR = "沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。";
const NO_ACH = "沒有成就清單。已解完又刪掉的也算還缺。";
const BAD_ACH = "成就清單沒讀到。";
const BAD_GEAR = "裝備清單沒讀到。";
const NO_UNLOCK = "這份成就檔裡沒有職業解鎖。";

const smallCatalog = {
  drops: [
    { id: "protector", label: "Protector of Sky" },
    { id: "gorgalosk", label: "Gorgalosk" },
    { id: "keeper", label: "Keeper of Souls" },
    { id: "spiroc", label: "The Spiroc Lord" },
    { id: "bazzt", label: "Bazzt Zzzt" },
    { id: "sister", label: "Sister of the Spire" },
    { id: "eye", label: "Eye of Veeshan" },
    { id: "isle7trash", label: "Sphinx、Drakes、Undine Spirits" },
    { id: "bees", label: "bees" },
    { id: "efreeti", label: "Noble Dojorn、Overseer of Air、the Hand of Veeshan" },
  ],
  tests: [
    {
      class: "Beastlord",
      npc: "Animist Kratho",
      rewards: ["Windhowl", "Spirit Render"],
      rune: "Wind Rune Izah",
      items: [
        { name: "Brass Knuckles", drop: "efreeti" },
        { name: "Mithril Bands", drop: "eye" },
        { name: "Sphinx Claw", drop: "sister" },
      ],
    },
    {
      class: "Ranger",
      npc: "Ranger Spirit",
      rewards: ["Griffon Talon Necklace"],
      rune: "Wind Rune Meda",
      items: [{ name: "Griffon Talon", drop: "keeper" }],
    },
    {
      class: "Shadow Knight",
      npc: "Sarkis Ebonblade",
      rewards: ["Khyldorn the Blood Drinker"],
      rune: "Wind Rune Kala",
      items: [{ name: "Efreeti War Spear", drop: "efreeti" }],
    },
    {
      class: "Wizard",
      npc: "Wizard Schrock",
      rewards: ["Al'Kabor's Cap of Binding"],
      rune: "Wind Rune Fana",
      items: [{ name: "Some Item", drop: "bazzt" }],
    },
    {
      class: "Warrior",
      npc: "Torgon Blademaster",
      rewards: ["Pauldrons of the Blue Sky"],
      rune: "Wind Rune Beza",
      items: [{ name: "Spiroc Air Totem", drop: "spiroc" }],
    },
  ],
};

function bothFiles() {
  return diff(
    smallCatalog,
    parseAchievements(fixture("both-achievements.txt")),
    parseInventory(fixture("both-inventory.txt")),
  );
}

test("both files hide a completed class and mark partial turn-ins", () => {
  const result = bothFiles();
  assert.deepEqual(result.banners, []);
  assert.equal(result.showList, true);
  assert.equal(result.completed, 1);
  assert.deepEqual(
    result.classes.map((row) => row.name),
    ["Beastlord", "Ranger", "Shadow Knight", "Wizard", "Monk", "Not A Class"],
  );
  const beast = result.classes[0];
  assert.equal(beast.npc, "Animist Kratho");
  assert.equal(beast.note, null);
  assert.equal(beast.tests.length, 1);
  assert.deepEqual(beast.tests[0].rewards, ["Windhowl", "Spirit Render"]);
  assert.equal(beast.tests[0].status, "partial");
  assert.deepEqual(
    beast.tests[0].lines.map((line) => [line.name, line.mark, line.source]),
    [
      ["Brass Knuckles", "have", "Noble Dojorn、Overseer of Air、the Hand of Veeshan"],
      ["Mithril Bands", "have", "Eye of Veeshan"],
      ["Sphinx Claw", "need", "Sister of the Spire"],
      ["Wind Rune Izah", "need", "雜兵"],
    ],
  );
  assert.equal(result.classes[1].tests.length, 1);
  assert.deepEqual(result.classes[1].tests[0].rewards, ["Griffon Talon Necklace"]);
  assert.equal(result.classes[1].tests[0].status, "none");
  assert.equal(result.classes[2].tests[0].lines[0].name, "Efreeti War Spear");
  assert.equal(result.classes[2].tests[0].lines[0].mark, "have");
  assert.deepEqual(result.classes[3].tests.map((row) => row.unmatched), [
    "目錄沒有：Obtain Not In Catalog.",
  ]);
  assert.equal(result.classes[3].tests[0].status, null);
  assert.deepEqual(result.classes[3].tests[0].lines, []);
  assert.equal(result.classes[4].note, "試煉都勾了，職業列仍是未完成。");
  assert.deepEqual(result.classes[4].tests, []);
  assert.equal(result.classes[4].npc, null);
  assert.equal(result.classes[5].note, "目錄沒有這個職業：Not A Class");
  assert.equal(result.classes[5].npc, null);
  assert.deepEqual(
    result.islands.map((section) => section.title),
    ["Keeper of Souls", "Sister of the Spire", "雜兵"],
  );
  const claw = result.islands[1].rows[0];
  assert.equal(claw.name, "Sphinx Claw");
  assert.deepEqual(claw.holders, [
    { class: "Beastlord", rewards: ["Windhowl", "Spirit Render"] },
  ]);
  const runeNames = result.islands[2].rows.map((row) => row.name);
  assert.deepEqual(runeNames, ["Wind Rune Izah", "Wind Rune Meda", "Wind Rune Kala"]);
  const text = JSON.stringify(result);
  assert.equal(text.includes("Some Other Loot"), false);
  assert.equal(text.includes("Spiroc Air Totem"), false);
  assert.equal(text.includes("Pauldrons of the Blue Sky"), false);
  assert.equal(text.includes("Al'Kabor's Cap of Binding"), false);
  assert.equal(text.includes("Some Item"), false);
  assert.equal(text.includes("Wind Rune Fana"), false);
});

test("one file still lists rows and names the missing side", () => {
  const ach = parseAchievements(fixture("both-achievements.txt"));
  const inv = parseInventory(fixture("both-inventory.txt"));
  const achOnly = diff(smallCatalog, ach, null);
  assert.deepEqual(achOnly.banners, [NO_GEAR]);
  assert.equal(achOnly.completed, 1);
  assert.equal(achOnly.classes[0].tests[0].status, null);
  assert.equal(achOnly.classes[0].tests[0].lines[0].mark, null);
  assert.equal(
    achOnly.islands.some((section) => section.rows.some((row) => row.name === "Brass Knuckles")),
    true,
  );
  const invOnly = diff(smallCatalog, null, inv);
  assert.deepEqual(invOnly.banners, [NO_ACH]);
  assert.equal(invOnly.completed, 2);
  assert.equal(invOnly.classes[0].name, "Beastlord");
  assert.equal(invOnly.classes[0].tests[0].status, "partial");
  assert.equal(invOnly.classes.find((row) => row.name === "Warrior"), undefined);
  assert.equal(invOnly.classes.find((row) => row.name === "Wizard"), undefined);
});

test("holding the reward finishes that trial and leaves its components unmarked", () => {
  const heldReward = parseInventory(
    [
      HEADER,
      "Bank1\tAmulet of the Fae\t1\t1\t11",
      "Bank2\tWindhowl +2\t2\t1\t11",
      "Bank3\tGriffon Talon Necklace\t3\t1\t11",
      "",
    ].join("\n"),
  );
  const catalog = {
    drops: smallCatalog.drops,
    tests: [
      smallCatalog.tests[0],
      smallCatalog.tests[1],
      {
        class: "Bard",
        npc: "Cilin Spellsinger",
        rewards: ["Amulet of the Fae"],
        rune: "Wind Rune Caza",
        items: [{ name: "Amulet of Woven Hair", drop: "bazzt" }],
      },
      smallCatalog.tests[4],
    ],
  };
  const onlyGear = diff(catalog, null, heldReward);
  assert.equal(onlyGear.completed, 3);
  assert.deepEqual(onlyGear.classes.map((row) => row.name), ["Warrior"]);
  assert.equal(onlyGear.classes[0].tests[0].status, "none");
  assert.equal(onlyGear.classes[0].tests[0].lines.every((line) => line.mark === "need"), true);
  const text = JSON.stringify(onlyGear);
  assert.equal(text.includes("Amulet of Woven Hair"), false);
  assert.equal(text.includes("Amulet of the Fae"), false);
  assert.equal(text.includes("Wind Rune Caza"), false);
  assert.equal(text.includes("Griffon Talon"), false);
  assert.equal(text.includes("Sphinx Claw"), false);
  const talon = parseInventory([HEADER, "Bank1\tGriffon Talon\t1\t1\t11", ""].join("\n"));
  const component = diff(smallCatalog, null, talon);
  const ranger = component.classes.find((row) => row.name === "Ranger");
  assert.equal(ranger.tests[0].status, "partial");
  assert.equal(ranger.tests[0].lines[0].mark, "have");
  assert.equal(component.completed, 0);
  const ach = parseAchievements(
    [
      "C\tPrimary Class Unlock - Warrior",
      "I\t\tObtain Pauldrons of the Blue Sky.",
      "I\tPrimary Class Unlock - Ranger",
      "I\t\tObtain Griffon Talon Necklace.",
      "I\tPrimary Class Unlock - Beastlord",
      "I\t\tObtain Windhowl and Spirit Render",
    ].join("\n"),
  );
  const both = diff(catalog, ach, heldReward);
  assert.equal(both.completed, 3);
  assert.deepEqual(both.classes, []);
  assert.deepEqual(both.islands, []);
  const mixed = diff(
    {
      drops: smallCatalog.drops,
      tests: [
        smallCatalog.tests[1],
        {
          class: "Ranger",
          npc: "Ranger Spirit",
          rewards: ["Dark Cloak of the Sky"],
          rune: "Wind Rune Oska",
          items: [{ name: "Some Item", drop: "bazzt" }],
        },
      ],
    },
    null,
    heldReward,
  );
  assert.equal(mixed.completed, 0);
  assert.deepEqual(
    mixed.classes[0].tests.map((row) => row.rewards),
    [["Dark Cloak of the Sky"]],
  );
  assert.equal(JSON.stringify(mixed).includes("Griffon Talon"), false);
});

test("unreadable files and a file with no class unlocks do not invent a list", () => {
  const ach = parseAchievements(fixture("both-achievements.txt"));
  const inv = parseInventory(fixture("both-inventory.txt"));
  const noClass = parseAchievements(fixture("no-class.txt"));
  const badInv = parseInventory(fixture("bad-inventory.txt"));
  assert.deepEqual(diff(smallCatalog, null, null), {
    banners: [],
    showList: false,
    completed: null,
    classes: [],
    islands: [],
  });
  assert.deepEqual(diff(smallCatalog, { ok: false }, { ok: false }).banners, [BAD_ACH, BAD_GEAR]);
  assert.equal(diff(smallCatalog, { ok: false }, { ok: false }).showList, false);
  assert.deepEqual(diff(smallCatalog, { ok: false }, inv).banners, [NO_ACH, BAD_ACH]);
  assert.equal(diff(smallCatalog, { ok: false }, inv).showList, true);
  assert.deepEqual(diff(smallCatalog, ach, badInv).banners, [NO_GEAR, BAD_GEAR]);
  assert.deepEqual(diff(smallCatalog, noClass, inv), {
    banners: [NO_UNLOCK],
    showList: false,
    completed: null,
    classes: [],
    islands: [],
  });
  assert.deepEqual(diff(smallCatalog, noClass, badInv).banners, [NO_UNLOCK, BAD_GEAR]);
  assert.equal(diff(smallCatalog, noClass, badInv).showList, false);
});

test("a complete turn-in stays on the class tab and leaves the island tab", () => {
  const ready = diff(
    smallCatalog,
    parseAchievements(fixture("ready-achievements.txt")),
    parseInventory(fixture("ready-inventory.txt")),
  );
  assert.equal(ready.classes[0].name, "Beastlord");
  assert.equal(ready.classes[0].tests[0].status, "ready");
  assert.deepEqual(ready.islands, []);
});

test("catalog has the sixteen classes and one drop per item", () => {
  const catalog = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));
  const expected = [
    ["Bard", 6, "Cilin Spellsinger"],
    ["Beastlord", 5, "Animist Kratho"],
    ["Berserker", 6, "Stragen The Hewer"],
    ["Cleric", 6, "Josin Faithbringer"],
    ["Druid", 6, "Strandar Pinemist"],
    ["Enchanter", 6, "Enchanter Jolas"],
    ["Magician", 7, "Magus Frinon"],
    ["Monk", 6, "Holwin"],
    ["Necromancer", 6, "Drakis Bloodcaster"],
    ["Paladin", 4, "Dason Goldblade"],
    ["Ranger", 6, "Ranger Spirit"],
    ["Rogue", 6, "Thalik Silenthand"],
    ["Shadow Knight", 7, "Sarkis Ebonblade"],
    ["Shaman", 6, "Medicine Man Veetra"],
    ["Warrior", 6, "Torgon Blademaster"],
    ["Wizard", 6, "Wizard Schrock"],
  ];
  assert.deepEqual(
    catalog.drops.map((drop) => drop.id),
    ["protector", "gorgalosk", "keeper", "spiroc", "bazzt", "sister", "eye", "isle7trash", "bees", "efreeti"],
  );
  assert.equal(catalog.tests.length, 95);
  const counts = new Map();
  const rewards = new Set();
  const itemDrops = new Map();
  for (const row of catalog.tests) {
    counts.set(row.class, (counts.get(row.class) ?? 0) + 1);
    assert.equal(row.npc, expected.find((item) => item[0] === row.class)[2]);
    assert.equal(typeof row.rune, "string");
    assert.equal(row.rune.startsWith("Wind Rune "), true);
    assert.ok(row.items.length >= 1);
    for (const reward of row.rewards) {
      assert.equal(rewards.has(reward), false);
      rewards.add(reward);
    }
    for (const item of row.items) {
      assert.equal(catalog.drops.some((drop) => drop.id === item.drop), true);
      const previous = itemDrops.get(item.name);
      if (previous === undefined) itemDrops.set(item.name, item.drop);
      else assert.equal(previous, item.drop);
    }
  }
  assert.deepEqual(
    expected.map(([name, count]) => [name, counts.get(name)]),
    expected.map(([name, count]) => [name, count]),
  );
  const windhowl = catalog.tests.find((row) => row.rewards.includes("Windhowl"));
  assert.deepEqual(windhowl.rewards, ["Windhowl", "Spirit Render"]);
  assert.deepEqual(
    windhowl.items.map((item) => item.name),
    ["Brass Knuckles", "Mithril Bands", "Sphinx Claw"],
  );
  const statue = catalog.tests.flatMap((row) => row.items).find((item) => item.name === "Efreeti Statuette");
  assert.equal(statue.drop, "efreeti");
  const totem = catalog.tests.flatMap((row) => row.items).find((item) => item.name === "Spiroc Air Totem");
  assert.equal(totem.drop, "spiroc");
});
