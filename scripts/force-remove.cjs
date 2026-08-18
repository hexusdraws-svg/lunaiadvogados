const fs = require("fs");
const path = require("path");

const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

const files = fs.readdirSync(dir);
console.log("Files:", files.join("\n"));

// Try to remove the file with underscore
const underscoreFile = files.find((f) => f.startsWith("processos_.") && f.endsWith(".tsx"));
if (underscoreFile) {
  const oldPath = path.join(dir, underscoreFile);
  console.log("Attempting to remove:", oldPath);

  // Try chmod first
  try {
    fs.chmodSync(oldPath, 0o666);
    console.log("chmod succeeded");
  } catch (e) {
    console.log("chmod failed:", e.message);
  }

  // Try rename to temp and back
  try {
    const tempPath = path.join(dir, "_temp_" + Date.now() + ".tsx");
    fs.renameSync(oldPath, tempPath);
    fs.unlinkSync(tempPath);
    console.log("rename+unlink succeeded");
  } catch (e) {
    console.log("rename failed:", e.message);
  }
}

// Verify
const remaining = fs.readdirSync(dir).filter((f) => f.includes("processos_"));
console.log("Still have underscore files:", remaining);
