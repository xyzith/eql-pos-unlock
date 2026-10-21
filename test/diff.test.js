import assert from "node:assert/strict";
import test from "node:test";
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
