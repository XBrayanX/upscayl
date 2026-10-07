import { dialog } from "electron";
import { getMainWindow } from "../main-window";
import logit from "../utils/logit";

const selectModelPreviewImage = async () => {
  const mainWindow = getMainWindow();

  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    title: "Select Preview Image",
    filters: [
      {
        name: "Images",
        extensions: [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "PNG",
          "JPG",
          "JPEG",
          "WEBP",
        ],
      },
    ],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    logit("🚫 Preview image selection cancelled");
    return null;
  }

  logit("🖼️ Selected preview image: ", filePaths[0]);
  return filePaths[0];
};

export default selectModelPreviewImage;

