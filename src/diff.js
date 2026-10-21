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
