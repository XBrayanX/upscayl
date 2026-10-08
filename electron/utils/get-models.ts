import fs from "fs";
import path from "path";
import logit from "./logit";
import { app } from "electron";
import settings from "electron-settings";
import { FEATURE_FLAGS } from "../../common/feature-flags";
import { CustomModel } from "../../common/types/types";
import { setSavedCustomModels } from "./config-variables";
import { getMainWindow } from "../main-window";
import { ELECTRON_COMMANDS } from "../../common/electron-commands";

const getModels = async (
  folderPath: string | undefined,
): Promise<CustomModel[] | null> => {
  let models: CustomModel[] = [];

  // SECURITY SCOPED BOOKMARKS (macOS App Store)
  let closeAccess;
  const customModelsBookmarks = await settings.get("custom-models-bookmarks");
  if (FEATURE_FLAGS.APP_STORE_BUILD && customModelsBookmarks) {
    try {
      closeAccess = app.startAccessingSecurityScopedResource(
        customModelsBookmarks as string,
      );
    } catch (error) {
      logit("📁 Custom Models Bookmarks Error: ", error);
    }
  }

  if (!folderPath || !fs.existsSync(folderPath)) {
    logit("❌ Invalid Custom Model Folder Detected");
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(
        ELECTRON_COMMANDS.UPSCAYL_WARNING,
        "The selected folder does not exist or is invalid.",
      );
    }
    return null;
  }

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const subDirPath = path.join(folderPath, entry.name);
      try {
        const subFiles = fs.readdirSync(subDirPath);

        // 1 sola pasada en memoria O(N) para clasificar archivos
        let paramFile = "";
        let binFile = "";
        let hasJson = false;
        let autoBefore = "";
        let autoAfter = "";
        let autoPreview = "";

        for (const file of subFiles) {
          const lower = file.toLowerCase();
          if (lower.endsWith(".param")) paramFile = file;
          else if (lower.endsWith(".bin")) binFile = file;
          else if (lower === "model.json") hasJson = true;
          else if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) {
            if (lower.startsWith("before.")) autoBefore = file;
            else if (lower.startsWith("after.")) autoAfter = file;
            else if (lower.startsWith("preview.")) autoPreview = file;
          }
        }

        // Descarta carpetas que no tengan el binario y parámetros requeridos
        if (!paramFile || !binFile) continue;

        const modelFileName =
          paramFile.substring(0, paramFile.lastIndexOf(".")) || paramFile;
        let name = entry.name;
        let description = "";
        let preview: string | undefined;
        let before: string | undefined;
        let after: string | undefined;

        if (hasJson) {
          try {
            const rawJson = fs.readFileSync(
              path.join(subDirPath, "model.json"),
              "utf-8",
            );
            const parsed = JSON.parse(rawJson);
            if (parsed.name && typeof parsed.name === "string") {
              name = parsed.name;
            }
            if (
              parsed.description &&
              typeof parsed.description === "string"
            ) {
              description = parsed.description;
            }

            // Resolución en memoria sin accesos extra a disco
            const resolveImg = (f?: string) =>
              f && subFiles.includes(path.basename(f))
                ? path.join(subDirPath, path.basename(f))
                : undefined;

            preview = resolveImg(parsed.preview);
            before = resolveImg(parsed.before);
            after = resolveImg(parsed.after);
          } catch (err) {
            logit("⚠️ Error reading model.json in: " + subDirPath, err);
          }
        } else {
          // Fallback automático con los archivos detectados en la pasada inicial
          if (autoBefore && autoAfter) {
            before = path.join(subDirPath, autoBefore);
            after = path.join(subDirPath, autoAfter);
          } else if (autoPreview) {
            preview = path.join(subDirPath, autoPreview);
          }
        }

        models.push({
          id: entry.name,
          name,
          description,
          modelFileName,
          folderPath: subDirPath,
          preview,
          before,
          after,
        });
      } catch (subErr) {
        logit("⚠️ Error reading directory: " + subDirPath, subErr);
      }
    }
  } catch (err) {
    logit("❌ Error reading custom models folder: ", err);
  }

  if (models.length === 0) {
    logit("❌ Invalid Custom Model Folder Detected");
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(
        ELECTRON_COMMANDS.UPSCAYL_WARNING,
        "The selected folder does not contain valid model files. Make sure each model is placed in its own folder with '.param' and '.bin' files.",
      );
    }
    return null;
  }

  setSavedCustomModels(models);
  logit(
    "🔎 Detected Custom Models: ",
    models.map((m) => m.name),
  );
  return models;
};

export default getModels;
