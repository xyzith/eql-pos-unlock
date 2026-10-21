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
