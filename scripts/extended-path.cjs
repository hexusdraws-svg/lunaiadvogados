const fs = require("fs");
const path = require("path");

// Use extended-length path prefix to bypass MAX_PATH limits and permission issues
const extendedPath =
  "\\\\?\\C:\\Users\\the exceed\\Documents\\lunaiadvocacia\\src\\routes\\processos_.$id.tsx";

try {
  // Try to get file attributes first
  const attrs = fs.statSync(extendedPath);
  console.log("File exists, size:", attrs.size);

  // Try to delete
  fs.unlinkSync(extendedPath);
  console.log("Deleted via extended path");
} catch (e) {
  console.log("Extended path error:", e.message);
}

// Also try with raw Node fs with O_DIRECT flag if available
try {
  const fd = fs.openSync(
    "\\\\?\\C:\\Users\\the exceed\\Documents\\lunaiadvocacia\\src\\routes\\processos_.$id.tsx",
    "r+",
  );
  fs.closeSync(fd);
  fs.unlinkSync(
    "\\\\?\\C:\\Users\\the exceed\\Documents\\lunaiadvocacia\\src\\routes\\processos_.$id.tsx",
  );
  console.log("Deleted via fd");
} catch (e2) {
  console.log("FD error:", e2.message);
}
