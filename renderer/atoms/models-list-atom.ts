import { CustomModel } from "@common/types/types";
import { atom } from "jotai";

export const customModelsAtom = atom([] as CustomModel[]);
export const customModelIdsAtom = atom([] as string[]);
