import assert from "node:assert/strict";
import test from "node:test";
import { loadProgress, saveSide } from "../src/store.js";

function memory() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

test("loadProgress is empty until a side is saved", () => {
  assert.deepEqual(loadProgress(memory()), {
    achievements: null,
    achievementsName: "",
    inventory: null,
    inventoryName: "",
  });
});

test("saveSide replaces that file and leaves the other", () => {
  const storage = memory();
  saveSide(storage, "inventory", "old inv", "a.txt");
  saveSide(storage, "achievements", "ach", "b.txt");
  saveSide(storage, "inventory", "new inv", "c.txt");
  assert.deepEqual(loadProgress(storage), {
    achievements: "ach",
    achievementsName: "b.txt",
    inventory: "new inv",
    inventoryName: "c.txt",
  });
});
