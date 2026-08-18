const fs = require("fs");
const path = require("path");

const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

// Read the correct file
const correctFile = fs.readFileSync(path.join(dir, "processos.$id.tsx"), "utf8");

// Write over the underscore file (this might work if we can open it for writing)
const underscorePath = path.join(dir, "processos_.$id.tsx");

try {
  const fd = fs.openSync(underscorePath, "r+");
  fs.writeSync(fd, correctFile, 0);
  fs.closeSync(fd);
  console.log("Overwrote underscore file");
} catch (e) {
  console.log("Overwrite failed:", e.message);
}
