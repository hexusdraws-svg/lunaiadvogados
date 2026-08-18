const fs = require("fs");

// Try using the raw Windows device path
const rawPath =
  "\\\\.\\C:\\Users\\the exceed\\Documents\\lunaiadvocacia\\src\\routes\\processos_.$id.tsx";
const path = "C:\\Users\\the exceed\\Documents\\lunaiadvocacia\\src\\routes\\processos_.$id.tsx";

// Try opening with low-level handle
try {
  const fd = fs.openSync(path, "r");
  console.log("Opened fd:", fd);

  // Try to close and delete
  fs.closeSync(fd);
  fs.unlinkSync(path);
  console.log("Deleted!");
} catch (e) {
  console.log("Error:", e.message, e.code);
}
