const fs = require("fs");
const path = require("path");
const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

// Read all files except the locked one
const files = fs.readdirSync(dir);
const lockedFile = "processos_.$id.tsx";

const backup = {};
for (const f of files) {
  if (f !== lockedFile) {
    backup[f] = fs.readFileSync(path.join(dir, f));
  }
}

// Delete all other files
for (const [f, content] of Object.entries(backup)) {
  // Skip locked file
  const fPath = path.join(dir, f);
  try {
    fs.unlinkSync(fPath);
    console.log("Deleted:", f);
  } catch (e) {
    console.log("Delete failed for:", f, e.message);
  }
}

console.log("Done cleaning");
