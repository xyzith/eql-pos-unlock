# PoS Class Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a static page that compares a local EverQuest Legends achievement export and inventory export with a baked-in Plane of Sky class-unlock catalog.

**Architecture:** `src/parse.js` reads the two txt formats. `src/diff.js` turns a catalog plus those parses into the result object from the spec. `src/app.js` only paints that object. `catalog.json` is data, built once from the saved sixteen-class guide and then tested by its shape.

**Tech Stack:** Plain browser ES modules, `catalog.json`, Node's built-in `node --test`. No dependencies and no build step.

**Spec:** `DESIGN.md`

## Global Constraints

- Work only in `/home/lain/workspace/eql-pos-unlock` on `main`. Do not edit family-bot.
- Public repo `xyzith/eql-pos-unlock`. Pages serves `main` at `/`. URL: `https://xyzith.github.io/eql-pos-unlock/`
- No npm dependencies. `"type": "module"`. Test command: `node --test`
- Do not commit real `*-Achievements.txt` or `*-Inventory.txt` exports, and do not commit the guide text.
- Interface copy is Traditional Chinese. Item, mob, and NPC names stay the English strings from the catalog.
- These strings are exact: `這兩個檔只在這台瀏覽器裡讀，不會送出。`、`沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。`、`沒有成就清單。已解完又刪掉的也算還缺。`、`成就清單沒讀到。`、`裝備清單沒讀到。`、`這份成就檔裡沒有職業解鎖。`、`試煉都勾了，職業列仍是未完成。`、`目錄沒有這個職業：`、`目錄沒有：`、`已完成 N 個職業`、`沒有還沒完成的試煉。`、`沒有還缺的交物。`、`齊了還沒交`、`持有一部分`、`都還沒有`、`已有`、`還缺`、`雜兵`、`依職業`、`依島`、`交給`
- `<html lang="zh-Hant">`
- `file://` is unsupported. Open the page through Pages or a static server so `catalog.json` loads.
- Drop ids, in island order: `protector` Protector of Sky, `gorgalosk` Gorgalosk, `keeper` Keeper of Souls, `spiroc` The Spiroc Lord, `bazzt` Bazzt Zzzt, `sister` Sister of the Spire, `eye` Eye of Veeshan, `isle7trash` Sphinx、Drakes、Undine Spirits, `bees` bees, `efreeti` Noble Dojorn、Overseer of Air、the Hand of Veeshan. Wind runes are a final section titled `雜兵`.
- Result fields: `banners`, `showList`, `completed`, `classes[]`, `islands[]`. A class has `name`, `npc`, `note`, `tests`. A test has `rewards`, `status`, `unmatched`, `lines`. A line has `name`, `kind`, `mark`, `source`. An island has `title` and `rows`. A row has `name`, `kind`, `holders`. A holder has `class` and `rewards`.
- `status` is `ready`, `partial`, `none`, or `null`. `mark` is `have`, `need`, or `null`. `completed` is a number or `null`.
- `showList: false` means `classes` and `islands` are empty and `completed` is `null`.

---

### Task 1: Achievement parser

**Files:**
- Create: `package.json`
- Create: `src/parse.js`
- Create: `test/diff.test.js`
- Test: `test/diff.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `decodeText(bytes: Uint8Array): string | null`
  - `parseAchievements(text: string): { ok: true, classes: { status: "C" | "I", name: string, obtains: { status: "C" | "I", text: string }[] }[] } | { ok: false }`
  - `parseInventory` is added in Task 2. Do not export it here.

- [ ] **Step 1: Write the failing test**

Create `package.json`:

```json
{
  "name": "eql-pos-unlock",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Create `test/diff.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { decodeText, parseAchievements } from "../src/parse.js";

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/diff.test.js`

Expected: FAIL because `../src/parse.js` does not exist.

- [ ] **Step 3: Write the parser**

Create `src/parse.js`:

```js
export function decodeText(bytes) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text.replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

function cells(line) {
  const parts = line.split("\t");
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

export function parseAchievements(text) {
  const body = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const classes = [];
  let saw = false;
  let current = null;
  for (const raw of body.split("\n")) {
    if (raw.trim() === "") continue;
    const flag = raw[0];
    if (flag !== "C" && flag !== "I") continue;
    if (raw[1] !== "\t") return { ok: false };
    saw = true;
    const parts = cells(raw);
    if (parts[0] !== "C" && parts[0] !== "I") return { ok: false };
    if (parts.length === 2) {
      const name = parts[1];
      if (name.startsWith("Primary Class Unlock - ")) {
        current = {
          status: parts[0],
          name: name.slice("Primary Class Unlock - ".length),
          obtains: [],
        };
        classes.push(current);
      }
      continue;
    }
    if (parts.length === 3 && parts[1] === "") {
      if (!current) return { ok: false };
      if (parts[2].startsWith("Obtain ")) {
        current.obtains.push({ status: parts[0], text: parts[2] });
      }
      continue;
    }
    return { ok: false };
  }
  if (!saw) return { ok: false };
  return { ok: true, classes };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/diff.test.js`

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add package.json src/parse.js test/diff.test.js
git commit -m "feat: parse class unlock rows from an achievement export"
```

### Task 2: Inventory parser

**Files:**
- Modify: `src/parse.js`
- Modify: `test/diff.test.js`
- Test: `test/diff.test.js`

**Interfaces:**
- Consumes: `cells` already in `src/parse.js`
- Produces: `parseInventory(text: string): { ok: true, names: string[] } | { ok: false }`

`names` are raw file names. Skip `Empty` and count `0`. Keep `+N`, `(Exaltation)`, and backticks. Include KeyRing names. Do not normalize here.

- [ ] **Step 1: Write the failing test**

Append to `test/diff.test.js`:

```js
import { parseInventory } from "../src/parse.js";

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
```

The second `import` must be merged into the existing import from `../src/parse.js`. Do not leave two import lines.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/diff.test.js`

Expected: FAIL because `parseInventory` is not exported.

- [ ] **Step 3: Write the parser**

Append to `src/parse.js`:

```js
function integer(raw) {
  return /^\d+$/.test(raw);
}

export function parseInventory(text) {
  const body = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = body.split("\n");
  if (cells(lines[0] ?? "").join("\t") !== "Location\tName\tID\tCount\tSlots") {
    return { ok: false };
  }
  const names = [];
  let i = 1;
  for (; i < lines.length; i += 1) {
    if (lines[i].trim() === "") break;
    const parts = cells(lines[i]);
    if (parts.length !== 5) return { ok: false };
    const name = parts[1];
    if (!integer(parts[2]) || !integer(parts[3])) return { ok: false };
    if (name !== "Empty" && Number(parts[3]) > 0) names.push(name);
  }
  while (i < lines.length && lines[i].trim() === "") i += 1;
  if (i >= lines.length) return { ok: true, names };
  if (cells(lines[i]).join("\t") !== "KeyRing\tName\tID") return { ok: false };
  for (i += 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "") continue;
    const parts = cells(lines[i]);
    if (parts.length !== 3) return { ok: false };
    if (parts[1] !== "Empty") names.push(parts[1]);
  }
  return { ok: true, names };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/diff.test.js`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/parse.js test/diff.test.js
git commit -m "feat: parse held names from an inventory export"
```

### Task 3: Diff when both files parsed

**Files:**
- Create: `src/diff.js`
- Create: `test/fixtures/both-achievements.txt`
- Create: `test/fixtures/both-inventory.txt`
- Modify: `test/diff.test.js`
- Test: `test/diff.test.js`

**Interfaces:**
- Consumes: `parseAchievements`, `parseInventory`
- Produces: `diff(catalog, achievements, inventory) -> Result`
  - `achievements` and `inventory` are `null` when that file was not selected, or a parse result.
  - This task only has to be correct when both arguments are `{ ok: true }` and the achievement parse has at least one class. Other inputs may return `showList: false`. Task 4 replaces that branch.

- [ ] **Step 1: Write the fixtures and the failing test**

Create `test/fixtures/both-achievements.txt` with this exact content, including the tabs:

```text
Untapped Potential: Classes
C	Primary Class Unlock - Warrior
I		Obtain Pauldrons of the Blue Sky.
I		This achievement can be bypassed using a Primary Class Unlock Token.
I	Primary Class Unlock - Ranger
C		Obtain Dark Cloak of the Sky.
I		Obtain Griffon Talon Necklace.
I		This achievement will autocomplete if you chose to confirm your Primary Class as a Ranger.
I	Primary Class Unlock - Beastlord
I		Obtain Windhowl and Spirit Render
I	Primary Class Unlock - Wizard
I		Obtain Al`Kabor's Cap of Binding.
I		Obtain Not In Catalog.
I	Primary Class Unlock - Shadowknight
I		Obtain Khyldorn the Blood Drinker.
I	Primary Class Unlock - Monk
C		Obtain Fist of the Heavens.
I	Primary Class Unlock - Not A Class
I		Obtain Something Else.
```

Create `test/fixtures/both-inventory.txt`:

```text
Location	Name	ID	Count	Slots
General 1-Slot1	Spiroc Air Totem	1	1	11
General 1-Slot2	Empty	0	0	0
General 1-Slot3	Wind Rune Beza	2	0	11
Bank1	Pauldrons of the Blue Sky +7	3	1	11
General 4	Al'Kabor's Cap of Binding (Exaltation)	4	1	11
General 5	Brass Knuckles	5	1	11
Neck	Some Other Loot	6	1	11

KeyRing	Name	ID
Augmentation	Efreeti War Spear +2	7
Equipment	Mithril Bands (Exaltation)	8
```

Append this catalog and test to `test/diff.test.js`. Merge the new imports into the existing import lines.

```js
import { readFileSync } from "node:fs";
import { diff } from "../src/diff.js";

const fixture = (name) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

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
    null,
    "目錄沒有：Obtain Not In Catalog.",
  ]);
  assert.equal(result.classes[3].tests[1].status, null);
  assert.deepEqual(result.classes[3].tests[1].lines, []);
  assert.equal(result.classes[4].note, "試煉都勾了，職業列仍是未完成。");
  assert.deepEqual(result.classes[4].tests, []);
  assert.equal(result.classes[4].npc, null);
  assert.equal(result.classes[5].note, "目錄沒有這個職業：Not A Class");
  assert.equal(result.classes[5].npc, null);
  assert.deepEqual(
    result.islands.map((section) => section.title),
    ["Keeper of Souls", "Bazzt Zzzt", "Sister of the Spire", "雜兵"],
  );
  const claw = result.islands[2].rows[0];
  assert.equal(claw.name, "Sphinx Claw");
  assert.deepEqual(claw.holders, [
    { class: "Beastlord", rewards: ["Windhowl", "Spirit Render"] },
  ]);
  const runeNames = result.islands[3].rows.map((row) => row.name);
  assert.deepEqual(runeNames, ["Wind Rune Izah", "Wind Rune Meda", "Wind Rune Kala", "Wind Rune Fana"]);
  assert.equal(JSON.stringify(result).includes("Some Other Loot"), false);
  assert.equal(JSON.stringify(result).includes("Spiroc Air Totem"), false);
  assert.equal(JSON.stringify(result).includes("Pauldrons of the Blue Sky"), false);
});
```

Monk is absent from `smallCatalog`, and its only obtain is `C`, so the note is `試煉都勾了` and `npc` is `null`. `Not A Class` has an open obtain and no catalog rows, so its note is the unknown-class sentence.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/diff.test.js`

Expected: FAIL because `../src/diff.js` does not exist.

- [ ] **Step 3: Write the diff**

Create `src/diff.js`:

```js
const NO_GEAR = "沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。";
const NO_ACH = "沒有成就清單。已解完又刪掉的也算還缺。";
const BAD_ACH = "成就清單沒讀到。";
const BAD_GEAR = "裝備清單沒讀到。";
const NO_UNLOCK = "這份成就檔裡沒有職業解鎖。";
const ALL_CHECKED = "試煉都勾了，職業列仍是未完成。";
const UNKNOWN_CLASS = "目錄沒有這個職業：";
const UNKNOWN_OBTAIN = "目錄沒有：";
const TRASH = "雜兵";

export function normItem(raw) {
  let name = String(raw).trim().replace(/[`'’‘´]/g, "'");
  let exalt = false;
  let upgrade = false;
  while (true) {
    if (!exalt && name.endsWith(" (Exaltation)")) {
      name = name.slice(0, -" (Exaltation)".length);
      exalt = true;
      continue;
    }
    if (!upgrade && / \+\d+$/.test(name)) {
      name = name.replace(/ \+\d+$/, "");
      upgrade = true;
      continue;
    }
    break;
  }
  name = name.trim();
  return name === "" ? "" : name.toLowerCase();
}

export function normClass(raw) {
  return String(raw).replace(/\s+/g, "").toLowerCase();
}

function empty() {
  return { banners: [], showList: false, completed: null, classes: [], islands: [] };
}

function testKey(className, rewards) {
  return `${normClass(className)}\n${rewards.map(normItem).slice().sort().join("\n")}`;
}

function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const b = right.slice().sort();
  return left.slice().sort().every((name, index) => name === b[index]);
}

function matchObtain(tests, obtainText) {
  const body = obtainText.replace(/^Obtain /, "").replace(/\.$/, "");
  const whole = normItem(body);
  const singles = tests.filter(
    (row) => row.rewards.length === 1 && normItem(row.rewards[0]) === whole,
  );
  if (singles.length === 1) return singles[0];
  if (singles.length > 1) return null;
  const parts = body.split(" and ").map(normItem);
  if (parts.length < 2) return null;
  const sets = tests.filter((row) => sameSet(row.rewards.map(normItem), parts));
  if (sets.length === 1) return sets[0];
  return null;
}

function viewOf(row, held) {
  const lines = [
    ...row.items.map((item) => ({
      name: item.name,
      kind: "item",
      mark: markOf(held, item.name),
      source: sourceLabel(row, item.drop),
    })),
    {
      name: row.rune,
      kind: "rune",
      mark: markOf(held, row.rune),
      source: TRASH,
    },
  ];
  return { rewards: row.rewards.slice(), status: statusOf(held, lines), unmatched: null, lines };
}

function sourceLabel(row, dropId) {
  const found = row.drops?.find?.((drop) => drop.id === dropId);
  return found ? found.label : dropId;
}

function markOf(held, name) {
  if (!held) return null;
  return held.has(normItem(name)) ? "have" : "need";
}

function statusOf(held, lines) {
  if (!held) return null;
  if (lines.every((line) => line.mark === "have")) return "ready";
  if (lines.every((line) => line.mark === "need")) return "none";
  return "partial";
}

function classTests(catalog, name) {
  return catalog.tests.filter((row) => normClass(row.class) === normClass(name));
}

function openFromAchievements(catalog, achievements, held) {
  const normal = [];
  const tail = [];
  let completed = 0;
  for (const row of achievements.classes) {
    if (row.status === "C") {
      completed += 1;
      continue;
    }
    const found = classTests(catalog, row.name);
    const open = row.obtains.filter((item) => item.status === "I");
    if (open.length === 0) {
      tail.push({
        name: found[0]?.class ?? row.name,
        npc: found[0]?.npc ?? null,
        note: ALL_CHECKED,
        tests: [],
      });
      continue;
    }
    if (found.length === 0) {
      tail.push({
        name: row.name,
        npc: null,
        note: `${UNKNOWN_CLASS}${row.name}`,
        tests: [],
      });
      continue;
    }
    const tests = [];
    for (const obtain of open) {
      const matched = matchObtain(found, obtain.text);
      if (!matched) {
        tests.push({
          rewards: [],
          status: null,
          unmatched: `${UNKNOWN_OBTAIN}${obtain.text}`,
          lines: [],
        });
        continue;
      }
      const view = viewOf({ ...matched, drops: catalog.drops }, held);
      tests.push(view);
    }
    normal.push({
      name: found[0].class,
      npc: found[0].npc,
      note: null,
      tests,
      order: catalog.tests.findIndex((item) => normClass(item.class) === normClass(row.name)),
    });
  }
  normal.sort((a, b) => a.order - b.order);
  return {
    completed,
    classes: [...normal.map(({ order, ...row }) => row), ...tail],
  };
}

function islandsOf(catalog, classes) {
  const open = new Map();
  for (const row of classes) {
    for (const item of row.tests) {
      if (item.unmatched || item.status === "ready") continue;
      open.set(testKey(row.name, item.rewards), { row, item });
    }
  }
  const sections = new Map();
  const ensure = (title) => {
    if (!sections.has(title)) sections.set(title, []);
    return sections.get(title);
  };
  for (const testRow of catalog.tests) {
    const hit = open.get(testKey(testRow.class, testRow.rewards));
    if (!hit) continue;
    for (const line of hit.item.lines) {
      if (line.mark === "have") continue;
      const title = line.kind === "rune" ? TRASH : line.source;
      const rows = ensure(title);
      let existing = rows.find((item) => normItem(item.name) === normItem(line.name));
      if (!existing) {
        existing = { name: line.name, kind: line.kind, holders: [] };
        rows.push(existing);
      }
      existing.holders.push({ class: hit.row.name, rewards: hit.item.rewards.slice() });
    }
  }
  const ordered = [];
  for (const drop of catalog.drops) {
    const rows = sections.get(drop.label);
    if (rows?.length) ordered.push({ title: drop.label, rows });
  }
  const trash = sections.get(TRASH);
  if (trash?.length) ordered.push({ title: TRASH, rows: trash });
  return ordered;
}

export function diff(catalog, achievements, inventory) {
  if (!achievements?.ok || !inventory?.ok || achievements.classes.length === 0) return empty();
  const held = new Set(inventory.names.map(normItem).filter((name) => name !== ""));
  const built = openFromAchievements(catalog, achievements, held);
  return {
    banners: [],
    showList: true,
    completed: built.completed,
    classes: built.classes,
    islands: islandsOf(catalog, built.classes),
  };
}
```

`sourceLabel` reads `row.drops` because `viewOf` is called with the catalog drops attached. Do not look up a drop id that is missing from `catalog.drops`; the fixture includes every id it uses.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/diff.test.js`

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diff.js test/diff.test.js test/fixtures/both-achievements.txt test/fixtures/both-inventory.txt
git commit -m "feat: diff open class trials against held items"
```

### Task 4: Missing files and unreadable files

**Files:**
- Modify: `src/diff.js`
- Create: `test/fixtures/no-class.txt`
- Create: `test/fixtures/bad-inventory.txt`
- Create: `test/fixtures/ready-achievements.txt`
- Create: `test/fixtures/ready-inventory.txt`
- Modify: `test/diff.test.js`
- Test: `test/diff.test.js`

**Interfaces:**
- Consumes: `diff`, `parseAchievements`, `parseInventory`, `smallCatalog`, `fixture`, `bothFiles`
- Produces: the same `diff` signature. Banner order is the mode sentence first, then a parse-failure sentence.

- [ ] **Step 1: Write the failing tests**

Create `test/fixtures/no-class.txt`:

```text
C	Race Unlock - Human
```

Create `test/fixtures/bad-inventory.txt`:

```text
Name	ID
```

Create `test/fixtures/ready-achievements.txt`:

```text
I	Primary Class Unlock - Beastlord
I		Obtain Windhowl and Spirit Render
```

Create `test/fixtures/ready-inventory.txt`:

```text
Location	Name	ID	Count	Slots
General 1	Brass Knuckles	1	1	11
General 2	Mithril Bands	2	1	11
General 3	Sphinx Claw	3	1	11
General 4	Wind Rune Izah	4	1	11
```

Append to `test/diff.test.js`:

```js
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
  assert.equal(invOnly.completed, null);
  assert.equal(invOnly.classes[0].name, "Beastlord");
  const warrior = invOnly.classes.find((row) => row.name === "Warrior");
  assert.equal(warrior.tests[0].status, "partial");
  assert.equal(warrior.tests[0].lines[0].mark, "have");
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
```

Add the five string constants next to the other test helpers, copied from `src/diff.js`:

```js
const NO_GEAR = "沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。";
const NO_ACH = "沒有成就清單。已解完又刪掉的也算還缺。";
const BAD_ACH = "成就清單沒讀到。";
const BAD_GEAR = "裝備清單沒讀到。";
const NO_UNLOCK = "這份成就檔裡沒有職業解鎖。";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/diff.test.js`

Expected: FAIL. `diff(smallCatalog, ach, null)` currently returns `showList: false`.

- [ ] **Step 3: Replace `diff`**

Replace the exported `diff` function in `src/diff.js` with:

```js
function heldSet(inventory) {
  return new Set(inventory.names.map(normItem).filter((name) => name !== ""));
}

function listFromAchievements(catalog, achievements, held) {
  const built = openFromAchievements(catalog, achievements, held);
  return {
    banners: [],
    showList: true,
    completed: built.completed,
    classes: built.classes,
    islands: islandsOf(catalog, built.classes),
  };
}

function listFromInventory(catalog, held) {
  const classes = [];
  for (const row of catalog.tests) {
    let group = classes.find((item) => item.name === row.class);
    if (!group) {
      group = { name: row.class, npc: row.npc, note: null, tests: [] };
      classes.push(group);
    }
    group.tests.push(viewOf({ ...row, drops: catalog.drops }, held));
  }
  return {
    banners: [],
    showList: true,
    completed: null,
    classes,
    islands: islandsOf(catalog, classes),
  };
}

export function diff(catalog, achievements, inventory) {
  const achOk = Boolean(achievements?.ok);
  const invOk = Boolean(inventory?.ok);
  if (achOk && achievements.classes.length === 0) {
    const banners = [NO_UNLOCK];
    if (inventory && !inventory.ok) banners.push(BAD_GEAR);
    return { banners, showList: false, completed: null, classes: [], islands: [] };
  }
  if (!achOk && !invOk) {
    const banners = [];
    if (achievements && !achievements.ok) banners.push(BAD_ACH);
    if (inventory && !inventory.ok) banners.push(BAD_GEAR);
    return { banners, showList: false, completed: null, classes: [], islands: [] };
  }
  if (achOk) {
    const result = listFromAchievements(catalog, achievements, invOk ? heldSet(inventory) : null);
    if (!invOk) result.banners.push(NO_GEAR);
    if (inventory && !inventory.ok) result.banners.push(BAD_GEAR);
    return result;
  }
  const result = listFromInventory(catalog, heldSet(inventory));
  result.banners.push(NO_ACH);
  if (achievements && !achievements.ok) result.banners.push(BAD_ACH);
  return result;
}
```

Keep `empty`. It can remain unused. Delete it if nothing calls it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/diff.test.js`

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diff.js test/diff.test.js test/fixtures/no-class.txt test/fixtures/bad-inventory.txt test/fixtures/ready-achievements.txt test/fixtures/ready-inventory.txt
git commit -m "feat: keep a partial list when one export is missing"
```

### Task 5: Catalog

**Files:**
- Create: `catalog.json`
- Modify: `test/diff.test.js`
- Test: `test/diff.test.js`

**Interfaces:**
- Consumes: nothing from `diff`
- Produces: `catalog.json` with `drops` and `tests`, 16 classes, 95 tests

- [ ] **Step 1: Write the failing shape test**

Append to `test/diff.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/diff.test.js`

Expected: FAIL because `catalog.json` does not exist.

- [ ] **Step 3: Build the catalog from the guide**

If `/tmp/pos-guide.txt` contains the line `Pauldrons of the Blue Sky，Torgon Blademaster 交出。`, use that file. Otherwise:

```bash
curl -fsS "http://192.168.0.110:3001/view/doc?id=cafb8749-7d8d-4ef8-b0c5-dae824a9d4ec" -o /tmp/pos-view.json
node /tmp/extract-pos-guide.mjs
```

`/tmp/extract-pos-guide.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const data = JSON.parse(readFileSync("/tmp/pos-view.json", "utf8"));
let text = String(data.html);
text = text.replace(/<br\s*\/?>/gi, "\n");
text = text.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
text = text.replace(/<[^>]+>/g, "");
text = text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, ent) => {
  const key = ent.toLowerCase();
  if (named[key]) return named[key];
  if (ent[0] === "#") {
    const hex = ent[1] === "x" || ent[1] === "X";
    const code = hex ? Number.parseInt(ent.slice(2), 16) : Number.parseInt(ent.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : all;
  }
  return all;
});
writeFileSync("/tmp/pos-guide.txt", text);
```

If the curl fails and the guide file is absent, stop. Do not type the 95 rows by hand.

Write `/tmp/build-catalog.mjs` and run `node /tmp/build-catalog.mjs /tmp/pos-guide.txt`.

```js
import { readFileSync, writeFileSync } from "node:fs";

const classes = ["Bard", "Beastlord", "Berserker", "Cleric", "Druid", "Enchanter", "Magician", "Monk", "Necromancer", "Paladin", "Ranger", "Rogue", "Shadow Knight", "Shaman", "Warrior", "Wizard"];
const phrases = [
  ["isle two 的 protector of sky 掉落", "protector"],
  ["isle three 的 gorgalosk 掉落", "gorgalosk"],
  ["isle four 的 keeper of souls 掉落", "keeper"],
  ["isle five 的 the spiroc lord 掉落", "spiroc"],
  ["isle six 的 bazzt zzzt 掉落", "bazzt"],
  ["isle seven 的 sister of the spire 掉落", "sister"],
  ["isle eight 的 eye of veeshan 掉落", "eye"],
  ["isle seven 的 sphinx、drakes、undine spirits 掉落", "isle7trash"],
  ["isle six 的 bees 掉落", "bees"],
];
const drops = [
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
];

function dropId(source) {
  const folded = source.toLowerCase();
  if (folded.includes("noble dojorn") && folded.includes("overseer of air") && folded.includes("hand of veeshan")) {
    return "efreeti";
  }
  for (const [phrase, id] of phrases) if (folded.includes(phrase)) return id;
  return null;
}

const text = readFileSync(process.argv[2], "utf8");
const sourced = new Map();
for (const line of text.split("\n")) {
  const match = line.trim().match(/^(.+?)，(.+掉落)。交給/);
  if (!match || match[1].startsWith("Wind Rune")) continue;
  const id = dropId(match[2]);
  if (!id) throw new Error(`unknown source: ${match[2]}`);
  sourced.set(match[1], id);
}

let current = null;
let npc = null;
let testRow = null;
const tests = [];
for (const line of text.split("\n")) {
  const trimmed = line.trim();
  if (classes.includes(trimmed)) {
    current = trimmed;
    testRow = null;
    continue;
  }
  const giver = trimmed.match(/^交給 (.+)。$/);
  if (giver && current) {
    npc = giver[1];
    continue;
  }
  const reward = trimmed.match(/^(.+)，(.+) 交出。$/);
  if (reward && current) {
    testRow = { class: current, npc, rewards: [reward[1]], rune: null, items: [] };
    tests.push(testRow);
    continue;
  }
  const sourcedLine = trimmed.match(/^(.+?)，(.+掉落)。交給/);
  const bareLine = sourcedLine ? null : trimmed.match(/^(.+?)。交給/);
  const hit = sourcedLine ?? bareLine;
  if (!hit || !testRow) continue;
  const name = hit[1];
  if (name.startsWith("Wind Rune")) {
    if (testRow.rune) throw new Error(`second rune on ${testRow.rewards.join(", ")}`);
    testRow.rune = name;
    continue;
  }
  const id = sourcedLine ? dropId(sourcedLine[2]) : sourced.get(name);
  if (!id) throw new Error(`no drop for ${name}`);
  testRow.items.push({ name, drop: id });
}

for (const row of tests) {
  if (!row.rune || row.items.length === 0) throw new Error(`incomplete ${row.rewards.join(", ")}`);
}
const windhowl = tests.find((row) => row.rewards[0] === "Windhowl");
if (!windhowl) throw new Error("missing Windhowl");
windhowl.rewards.push("Spirit Render");
if (tests.length !== 95) throw new Error(`expected 95 tests, got ${tests.length}`);

const catalog = { drops, tests };
writeFileSync("catalog.json", `${JSON.stringify(catalog, null, 2)}\n`);
```

Run it from the repo root. Do not commit `/tmp/extract-pos-guide.mjs`, `/tmp/build-catalog.mjs`, or the guide.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/diff.test.js`

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add catalog.json test/diff.test.js
git commit -m "feat: add the sixteen-class sky unlock catalog"
```

### Task 6: Page

**Files:**
- Create: `index.html`
- Create: `site.css`
- Create: `src/app.js`
- Test: browser at `http://127.0.0.1:8765/`

**Interfaces:**
- Consumes: `decodeText`, `parseAchievements`, `parseInventory`, `diff`, `catalog.json`
- Produces: the page. `src/app.js` is not imported by `node --test`.

- [ ] **Step 1: Write the page**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PoS 職業解鎖</title>
    <link rel="stylesheet" href="site.css">
  </head>
  <body>
    <main>
      <h1>Plane of Sky 職業解鎖</h1>
      <p class="local">這兩個檔只在這台瀏覽器裡讀，不會送出。</p>
      <label>成就清單 <input id="ach" type="file" accept=".txt"></label>
      <p id="ach-name"></p>
      <label>裝備清單 <input id="inv" type="file" accept=".txt"></label>
      <p id="inv-name"></p>
      <div id="banners"></div>
      <p id="completed"></p>
      <div id="tabs" hidden>
        <button type="button" id="tab-class" aria-selected="true">依職業</button>
        <button type="button" id="tab-island">依島</button>
      </div>
      <div id="class-pane"></div>
      <div id="island-pane" hidden></div>
    </main>
    <script type="module" src="src/app.js"></script>
  </body>
</html>
```

Create `site.css`:

```css
body {
  margin: 0;
  font: 16px/1.5 sans-serif;
  background: #16130f;
  color: #f3ead8;
}
main {
  max-width: 48rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
label, button {
  font: inherit;
}
.local, .banner {
  color: #e2c27a;
}
.class-block, .island-block {
  margin-top: 1.25rem;
}
button[aria-selected="true"] {
  border-bottom: 2px solid #e2c27a;
}
.have {
  color: #9dcc9d;
}
.need {
  color: #e7a0a0;
}
```

Create `src/app.js`:

```js
import { decodeText, parseAchievements, parseInventory } from "./parse.js";
import { diff } from "./diff.js";

const catalog = await fetch(new URL("../catalog.json", import.meta.url)).then((res) => res.json());
const achInput = document.querySelector("#ach");
const invInput = document.querySelector("#inv");
const achName = document.querySelector("#ach-name");
const invName = document.querySelector("#inv-name");
const banners = document.querySelector("#banners");
const completed = document.querySelector("#completed");
const tabs = document.querySelector("#tabs");
const classPane = document.querySelector("#class-pane");
const islandPane = document.querySelector("#island-pane");
const tabClass = document.querySelector("#tab-class");
const tabIsland = document.querySelector("#tab-island");

let achievements = null;
let inventory = null;

const STATUS = { ready: "齊了還沒交", partial: "持有一部分", none: "都還沒有" };
const MARK = { have: "已有", need: "還缺" };

function clear(node) {
  node.replaceChildren();
}

function addText(parent, tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

async function readSelected(file, parse) {
  if (!file) return null;
  const text = decodeText(new Uint8Array(await file.arrayBuffer()));
  if (text === null) return { ok: false };
  return parse(text);
}

function render(result) {
  clear(banners);
  clear(completed);
  clear(classPane);
  clear(islandPane);
  for (const text of result.banners) addText(banners, "p", text, "banner");
  tabs.hidden = !result.showList;
  if (!result.showList) return;
  if (result.completed !== null) completed.textContent = `已完成 ${result.completed} 個職業`;
  if (result.completed !== null && result.classes.length === 0) {
    addText(classPane, "p", "沒有還沒完成的試煉。");
  }
  for (const row of result.classes) {
    const block = addText(classPane, "section", "", "class-block");
    addText(block, "h2", row.name);
    if (row.npc) addText(block, "p", `交給 ${row.npc}`);
    if (row.note) addText(block, "p", row.note);
    for (const item of row.tests) {
      const card = addText(block, "section", "");
      if (item.unmatched) {
        addText(card, "p", item.unmatched);
        continue;
      }
      addText(card, "h3", item.rewards.join("、"));
      if (item.status) addText(card, "p", STATUS[item.status]);
      const list = document.createElement("ul");
      for (const line of item.lines) {
        const li = document.createElement("li");
        li.textContent = `${line.name}　${line.source}`;
        if (line.mark) {
          const mark = document.createElement("span");
          mark.className = line.mark;
          mark.textContent = `　${MARK[line.mark]}`;
          li.append(mark);
        }
        list.append(li);
      }
      card.append(list);
    }
  }
  if (result.islands.length === 0) addText(islandPane, "p", "沒有還缺的交物。");
  for (const section of result.islands) {
    const block = addText(islandPane, "section", "", "island-block");
    addText(block, "h2", section.title);
    const list = document.createElement("ul");
    for (const item of section.rows) {
      const who = item.holders
        .map((holder) => `${holder.class} ${holder.rewards.join("、")}`)
        .join("；");
      addText(list, "li", `${item.name}　${who}`);
    }
    block.append(list);
  }
}

async function refresh() {
  const result = diff(catalog, achievements, inventory);
  render(result);
}

achInput.addEventListener("change", async () => {
  const file = achInput.files?.[0] ?? null;
  achName.textContent = file ? file.name : "";
  achievements = await readSelected(file, parseAchievements);
  await refresh();
});

invInput.addEventListener("change", async () => {
  const file = invInput.files?.[0] ?? null;
  invName.textContent = file ? file.name : "";
  inventory = await readSelected(file, parseInventory);
  await refresh();
});

tabClass.addEventListener("click", () => {
  tabClass.setAttribute("aria-selected", "true");
  tabIsland.setAttribute("aria-selected", "false");
  classPane.hidden = false;
  islandPane.hidden = true;
});

tabIsland.addEventListener("click", () => {
  tabIsland.setAttribute("aria-selected", "true");
  tabClass.setAttribute("aria-selected", "false");
  classPane.hidden = true;
  islandPane.hidden = false;
});

await refresh();
```

- [ ] **Step 2: Confirm the unit tests still pass**

Run: `node --test`

Expected: PASS, 12 tests.

- [ ] **Step 3: Check the page in a browser**

Serve the repo root:

```bash
python3 -m http.server 8765 --directory /home/lain/workspace/eql-pos-unlock
```

Open `http://127.0.0.1:8765/`. Before any file is chosen, the fixed local-file sentence is visible, the completed count is absent, and neither tab list is visible.

Choose `test/fixtures/both-achievements.txt` and `test/fixtures/both-inventory.txt`. Confirm all of these:

- No banner.
- `已完成 1 個職業`
- Class order starts `Beastlord`, then `Ranger`, `Shadow Knight`, `Wizard`, `Monk`, `Not A Class`. `Warrior` is absent.
- The two file names are shown under the inputs.
- Beastlord shows `交給 Animist Kratho`, `Windhowl、Spirit Render`, `持有一部分`, Brass Knuckles and Mithril Bands as `已有`, Sphinx Claw and Wind Rune Izah as `還缺`.
- Shadow Knight shows `Efreeti War Spear` as `已有`. The inventory line is `Efreeti War Spear +2`.
- Wizard shows `目錄沒有：Obtain Not In Catalog.`
- Monk shows `試煉都勾了，職業列仍是未完成。`
- `依島` shows `Sister of the Spire` with Sphinx Claw, and `雜兵` with Wind Rune Izah. Brass Knuckles is not on that tab.
- `Some Other Loot` is nowhere on the page.

Stop the server when the check is done.

- [ ] **Step 4: Commit**

```bash
git add index.html site.css src/app.js
git commit -m "feat: show open sky trials by class and by island"
```

### Task 7: README and GitHub Pages

**Files:**
- Create: `README.md`
- Modify: none of the page files

**Interfaces:**
- Consumes: the page from Task 6
- Produces: `https://xyzith.github.io/eql-pos-unlock/`

- [ ] **Step 1: Write the README**

Create `README.md` with this content. The inner command is indented as a fenced bash block:

~~~~md
# eql-pos-unlock

靜態頁。用 EverQuest Legends 的成就匯出和裝備匯出，看 Plane of Sky 十六個職業解鎖還缺哪些交物。

這兩個檔只在這台瀏覽器裡讀，不會送出。

開頁：<https://xyzith.github.io/eql-pos-unlock/>

本地：

```bash
python3 -m http.server 8765
```

然後開 <http://127.0.0.1:8765/>。不要用 `file://`。

成就檔是遊戲的 `*-Achievements.txt`。裝備檔是 `*-Inventory.txt`。只選一個也能看，頁面會寫哪裡不準。

目錄是 `catalog.json`。改掉落就改那份檔。

測試：`node --test`
~~~~

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: describe the sky unlock page"
git push origin main
```

- [ ] **Step 3: Turn on Pages**

```bash
gh api --method POST repos/xyzith/eql-pos-unlock/pages --input - <<'EOF'
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
EOF
```

If Pages is already enabled, update the source instead of posting a second time:

```bash
gh api --method PUT repos/xyzith/eql-pos-unlock/pages --input - <<'EOF'
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
EOF
```

- [ ] **Step 4: Confirm the live page**

Poll until the body contains the local-file sentence:

```bash
curl -fsS https://xyzith.github.io/eql-pos-unlock/
```

Expected: HTML contains `這兩個檔只在這台瀏覽器裡讀，不會送出。` Pages can take a minute after the first push. A 404 before that is not a failed build. Do not say the site is up until this curl succeeds.
