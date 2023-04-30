import fs from "fs/promises";

export const removeFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch (e) {
    console.log("Error while removing file", e.message);
  }
};
