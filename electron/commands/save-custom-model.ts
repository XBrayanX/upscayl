import fs from "fs";
import path from "path";
import getModels from "../utils/get-models";
import { savedCustomModelsPath } from "../utils/config-variables";
import { getMainWindow } from "../main-window";
import { ELECTRON_COMMANDS } from "../../common/electron-commands";
import logit from "../utils/logit";
import { SaveCustomModelPayload } from "../../common/types/types";

const saveCustomModel = async (
  event: any,
  payload: SaveCustomModelPayload,
) => {
  const {
    folderPath,
    name,
    description,
    previewMode = "single",
    previewPath,
    beforePath,
    afterPath,
  } = payload;

  if (!folderPath || !fs.existsSync(folderPath)) {
    logit("❌ Invalid folder path provided to saveCustomModel: ", folderPath);
    return { success: false, error: "Folder does not exist" };
  }

  const jsonPath = path.join(folderPath, "model.json");
  let existingData: Record<string, any> = {};

  if (fs.existsSync(jsonPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch (e) {
      existingData = {};
    }
  }

  const removeFileIfInFolder = (fileName?: string) => {
    if (!fileName) return;
    const target = path.join(folderPath, fileName);
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch (e) {
        logit("⚠️ Could not remove file: ", target);
      }
    }
  };

  const syncImageField = (
    field: "preview" | "before" | "after",
    sourcePath?: string,
  ) => {
    const oldFileName = existingData[field];
    if (sourcePath && fs.existsSync(sourcePath)) {
      const ext = path.extname(sourcePath);
      const targetFileName = `${field}${ext}`;
      const targetFilePath = path.join(folderPath, targetFileName);

      if (oldFileName && oldFileName !== targetFileName) {
        removeFileIfInFolder(oldFileName);
      }
      if (path.resolve(path.dirname(sourcePath)) !== path.resolve(folderPath)) {
        fs.copyFileSync(sourcePath, targetFilePath);
      }
      existingData[field] = targetFileName;
    } else {
      removeFileIfInFolder(oldFileName);
      delete existingData[field];
    }
  };

  if (previewMode === "single") {
    syncImageField("preview", previewPath);
    syncImageField("before");
    syncImageField("after");
  } else {
    syncImageField("preview");
    syncImageField("before", beforePath);
    syncImageField("after", afterPath);
  }

  existingData.name = name;
  existingData.description = description;
  existingData.previewMode = previewMode;

  fs.writeFileSync(jsonPath, JSON.stringify(existingData, null, 2), "utf-8");
  logit("💾 Successfully updated model.json at: ", jsonPath);

  // Refresh models list in Electron and notify renderer
  if (savedCustomModelsPath) {
    const updatedModels = await getModels(savedCustomModelsPath);
    const mainWindow = getMainWindow();
    if (mainWindow && updatedModels) {
      mainWindow.webContents.send(
        ELECTRON_COMMANDS.CUSTOM_MODEL_FILES_LIST,
        updatedModels,
      );
    }
    return { success: true, models: updatedModels };
  }

  return { success: true };
};

export default saveCustomModel;

