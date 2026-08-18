const fs = require("fs");
const path = require("path");
const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";

// Try to read the locked file
try {
  const content = fs.readFileSync(path.join(dir, "processos_.$id.tsx"), "utf8");
  // Write to the correct file
  fs.writeFileSync(path.join(dir, "processos.$id.tsx"), content);
  console.log("Recreated processos.$id.tsx");
} catch (e) {
  console.log("Read error:", e.message);
}
