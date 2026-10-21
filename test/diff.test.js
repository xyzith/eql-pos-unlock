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
