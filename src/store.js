const ACH_TEXT = "eql-pos-unlock.achievements";
const ACH_NAME = "eql-pos-unlock.achievements.name";
const INV_TEXT = "eql-pos-unlock.inventory";
const INV_NAME = "eql-pos-unlock.inventory.name";

export function loadProgress(storage) {
  return {
    achievements: storage.getItem(ACH_TEXT),
    achievementsName: storage.getItem(ACH_NAME) ?? "",
    inventory: storage.getItem(INV_TEXT),
    inventoryName: storage.getItem(INV_NAME) ?? "",
  };
}

export function saveSide(storage, side, text, name) {
  const textKey = side === "achievements" ? ACH_TEXT : INV_TEXT;
  const nameKey = side === "achievements" ? ACH_NAME : INV_NAME;
  storage.setItem(textKey, text);
  storage.setItem(nameKey, name);
}
