const fs = require("fs");
const path = require("path");
const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

// Try to rename the file to break TanStack route detection
const underscoreFile = "processos_.$id.tsx";
const tempName = "processos_TEMP.tsx";

// Use a direct rename attempt
const oldPath = path.join(dir, underscoreFile);
const newPath = path.join(dir, tempName);

try {
  // Try rename
  fs.renameSync(oldPath, newPath);
  console.log("Renamed to tempName");
} catch (e) {
  console.log("Rename failed:", e.message);

  // Try to use fs-extra if available
  try {
    const fse = require("fs-extra");
    fse.moveSync(oldPath, newPath);
    console.log("fs-extra move succeeded");
  } catch (e2) {
    console.log("fs-extra move failed:", e2.message);
  }
}

console.log(
  "Files:",
  fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("processos"))
    .join(", "),
);
