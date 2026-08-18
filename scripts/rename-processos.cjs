const fs = require("fs");
const path = require("path");

const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";
const files = fs.readdirSync(dir);

const oldFile = files.find((f) => f.startsWith("processos_.") && f.endsWith(".tsx"));
if (!oldFile) {
  console.log("No file to rename found");
  process.exit(0);
}

const oldPath = path.join(dir, oldFile);
const newFile = oldFile.replace("processos_.", "processos.");
const newPath = path.join(dir, newFile);

const content = fs.readFileSync(oldPath, "utf8");
fs.writeFileSync(newPath, content);
fs.unlinkSync(oldPath);

console.log(`Renamed: ${oldFile} -> ${newFile}`);
