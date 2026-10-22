import { decodeText, parseAchievements, parseInventory } from "./parse.js";
import { diff } from "./diff.js";
import { loadProgress, saveSide } from "./store.js";

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

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function addSpan(parent, text, className) {
  const node = el("span", className);
  node.textContent = text;
  parent.append(node);
  return node;
}

function addRewards(parent, rewards) {
  rewards.forEach((name, index) => {
    if (index > 0) parent.append("、");
    addSpan(parent, name, "eq-gear");
  });
}

function openStorage() {
  try {
    const probe = "eql-pos-unlock.probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
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
    if (row.npc) {
      const turnIn = el("p");
      turnIn.append("交給 ");
      addSpan(turnIn, row.npc, "eq-npc");
      block.append(turnIn);
    }
    if (row.note) addText(block, "p", row.note);
    for (const item of row.tests) {
      const card = addText(block, "section", "");
      if (item.unmatched) {
        addText(card, "p", item.unmatched);
        continue;
      }
      const heading = el("h3");
      addRewards(heading, item.rewards);
      card.append(heading);
      if (item.status) addText(card, "p", STATUS[item.status]);
      const list = document.createElement("ul");
      for (const line of item.lines) {
        const li = el("li");
        addSpan(li, line.name, "eq-item");
        li.append("　");
        addSpan(li, line.source, "eq-mob");
        if (line.mark) {
          const mark = el("span", line.mark);
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
    addText(block, "h2", section.title, "eq-mob");
    const list = document.createElement("ul");
    for (const item of section.rows) {
      const li = el("li");
      addSpan(li, item.name, "eq-item");
      li.append("　");
      item.holders.forEach((holder, index) => {
        if (index > 0) li.append("；");
        li.append(`${holder.class} `);
        addRewards(li, holder.rewards);
      });
      list.append(li);
    }
    block.append(list);
  }
}

async function refresh() {
  const result = diff(catalog, achievements, inventory);
  render(result);
}

const storage = openStorage();

function restore() {
  if (!storage) return;
  const saved = loadProgress(storage);
  if (saved.achievements !== null) {
    achievements = parseAchievements(saved.achievements);
    achName.textContent = saved.achievementsName || "上次的成就清單";
  }
  if (saved.inventory !== null) {
    inventory = parseInventory(saved.inventory);
    invName.textContent = saved.inventoryName || "上次的裝備清單";
  }
}

function remember(side, text, name) {
  if (!storage) return;
  saveSide(storage, side, text, name);
}

async function takeFile(input, side, parse) {
  const file = input.files?.[0] ?? null;
  if (!file) return null;
  const label = side === "achievements" ? achName : invName;
  label.textContent = file.name;
  const text = decodeText(new Uint8Array(await file.arrayBuffer()));
  if (text === null) {
    remember(side, "", file.name);
    return { ok: false };
  }
  remember(side, text, file.name);
  return parse(text);
}

achInput.addEventListener("change", async () => {
  const parsed = await takeFile(achInput, "achievements", parseAchievements);
  if (!parsed) return;
  achievements = parsed;
  await refresh();
});

invInput.addEventListener("change", async () => {
  const parsed = await takeFile(invInput, "inventory", parseInventory);
  if (!parsed) return;
  inventory = parsed;
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

restore();
await refresh();
