const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro\\frontend\\src";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".jsx") || entry.name.endsWith(".js")) &&
      !entry.name.includes(".backup")
    ) {
      out.push(full);
    }
  }

  return out;
}

function fixCode(code) {
  let next = code;

  // Common mojibake punctuation.
  next = next.replace(/\u00c2\u00b7/g, " - ");
  next = next.replace(/\u00c2/g, "");
  next = next.replace(/\u00c3\u0097/g, "x");
  next = next.replace(/\u00c3\u2014/g, "x");
  next = next.replace(/\u00c2\u00a3/g, "GBP");

  // Corrupted arrows and bullets.
  next = next.replace(/\u00e2\u0086\u0092/g, "->");
  next = next.replace(/\u00e2\u2020\u2019/g, "->");
  next = next.replace(/\u00e2\u0086\u0090/g, "<-");
  next = next.replace(/\u00e2\u2020\u0090/g, "<-");
  next = next.replace(/\u00e2\u20ac\u00a2/g, "-");

  // Corrupted close/check icons.
  next = next.replace(/\u00e2\u0153\u2022/g, "x");
  next = next.replace(/\u00e2\u0153[\u0085\u201d]/g, "");
  next = next.replace(/\u00e2\u0153/g, "");

  // Replacement character from broken multiplication sign.
  next = next.replace(/ \ufffd /g, " x ");
  next = next.replace(/\ufffd/g, "");

  // Any mojibake emoji inside icon/emoji string fields becomes safe text.
  next = next.replace(/icon:\s*"\u00f0[^"]*"/g, 'icon: ""');
  next = next.replace(/icon:\s*"\u00e2[^"]*"/g, 'icon: ""');
  next = next.replace(/emoji:\s*"\u00f0[^"]*"/g, 'emoji: "FOOD"');
  next = next.replace(/emoji:\s*"\u00e2[^"]*"/g, 'emoji: "FOOD"');

  // Remove remaining broken emoji fragments from visible JSX strings/text.
  next = next.replace(/\u00f0[^\s"<>{}`;,\)]*/g, "");
  next = next.replace(/\u00e2[^\s"<>{}`;,\)]*/g, "");

  // Clean common visible labels.
  next = next.replace(/\?\? Items/g, "Items");
  next = next.replace(/\?\? Visible/g, "Visible");
  next = next.replace(/\?\? Menu Items/g, "Menu Items");
  next = next.replace(/\?\? Tax & Charges/g, "Tax & Charges");
  next = next.replace(/\?\? Loyalty Customer/g, "Loyalty Customer");
  next = next.replace(/\? Back/g, "<- Back");

  // Close buttons only.
  next = next.replace(/(<button[^>]*>\s*)\?(\s*<\/button>)/g, "$1x$2");

  // Dine-in table status pill: remove icon prefix if present.
  next = next.replace(
    /\{tone\.icon\}\s*\{isMergedChild \? "Merged Child" : tone\.label\}/g,
    '{isMergedChild ? "Merged Child" : tone.label}'
  );

  // Status icon values should stay clean.
  next = next.replace(/icon:\s*"",\s*title:\s*"Cash"/g, 'icon: "Rs", title: "Cash"');
  next = next.replace(/icon:\s*"",\s*title:\s*"Card"/g, 'icon: "CC", title: "Card"');
  next = next.replace(/icon:\s*"",\s*title:\s*"Easypaisa"/g, 'icon: "EP", title: "Easypaisa"');
  next = next.replace(/icon:\s*"",\s*title:\s*"JazzCash"/g, 'icon: "JC", title: "JazzCash"');
  next = next.replace(/icon:\s*"",\s*title:\s*"Bank"/g, 'icon: "BK", title: "Bank"');
  next = next.replace(/icon:\s*"",\s*title:\s*"Complimentary"/g, 'icon: "VIP", title: "Complimentary"');

  return next;
}

const files = walk(root);
let changed = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixCode(before);

  if (after !== before) {
    fs.copyFileSync(file, file + ".backup-before-node-mojibake-fix");
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log("Fixed:", file);
  }
}

console.log("Done. Changed files:", changed);