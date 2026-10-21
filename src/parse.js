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
      if (!parts[2].startsWith("Obtain ")) continue;
      if (!current) return { ok: false };
      current.obtains.push({ status: parts[0], text: parts[2] });
      continue;
    }
    if (
      parts.length === 4 &&
      parts[1] === "" &&
      parts[2] !== "" &&
      !parts[2].startsWith("Obtain ")
    ) {
      continue;
    }
    return { ok: false };
  }
  if (!saw) return { ok: false };
  return { ok: true, classes };
}

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
