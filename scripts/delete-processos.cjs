const fs = require("fs");
const path = require("path");

const dir = "C:/Users/the exceed/Documents/lunaiadvocacia/src/routes/";
const files = fs.readdirSync(dir);

let deleted = false;
for (const f of files) {
  if (f.includes("processos_.") && f.endsWith(".tsx")) {
    const fullPath = path.join(dir, f);
    try {
      fs.unlinkSync(fullPath);
      console.log("Deleted:", f);
      deleted = true;
    } catch (e) {
      console.log("Error deleting", f, e.message);
    }
  }
}

if (!deleted) console.log("No file to delete found");
