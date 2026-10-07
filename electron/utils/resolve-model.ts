import { MODELS } from "../../common/models-list";
import { modelsPath } from "./get-resource-paths";
import {
  getCustomModelById,
  savedCustomModelsPath,
} from "./config-variables";

export interface ResolvedModel {
  isDefaultModel: boolean;
  targetModelsPath: string;
  targetModelName: string;
}

/**
 * Resolves the directory path and model file name for upscayl-bin,
 * handling both default packaged models and custom subfolder models.
 */
export function resolveModel(model: string): ResolvedModel {
  const isDefaultModel = model in MODELS;
  const customModel = getCustomModelById(model);

  const targetModelsPath = isDefaultModel
    ? modelsPath
    : customModel?.folderPath ?? savedCustomModelsPath ?? modelsPath;

  const targetModelName = isDefaultModel
    ? model
    : customModel?.modelFileName ?? model;

  return { isDefaultModel, targetModelsPath, targetModelName };
}

