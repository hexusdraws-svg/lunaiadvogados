const fs = require("fs");
const path = require("path");

const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

// Get all files
const files = fs.readdirSync(dir);

// Find the bad file using buffer matching
for (const f of files) {
  // Check using char codes to avoid shell interpretation
  const hasUnderscore = f.includes("processos_");
  if (hasUnderscore && f.endsWith(".tsx")) {
    console.log("Found bad file:", f);

    // Try to get full stats
    const fullPath = path.join(dir, f);
    try {
      const stats = fs.statSync(fullPath);
      console.log("Stats:", stats);
    } catch (e) {
      console.log("Stat error:", e.message);
    }

    // If stats work, try delete
    try {
      // Try renaming to something else first
      const tempName = f.replace("processos_.", "").replace(".tsx", "_temp.tsx");
      fs.renameSync(fullPath, path.join(dir, tempName));
      console.log("Renamed to:", tempName);

      // Then delete
      fs.unlinkSync(path.join(dir, tempName));
      console.log("Unlinked");
    } catch (e) {
      console.log("Rename/unlink error:", e.message);
    }
  }
}

console.log(
  "Final file list:",
  fs
    .readdirSync(dir)
    .filter((f) => f.includes("processos"))
    .join(", "),
);
