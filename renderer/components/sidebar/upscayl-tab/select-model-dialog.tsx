"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  EyeOff,
  ImageIcon,
  Maximize2,
  Pencil,
  RotateCw,
  SwatchBookIcon,
  X,
} from "lucide-react";
import { ModelId, MODELS } from "@common/models-list";
import { useAtom, useAtomValue } from "jotai";
import {
  hiddenModelIdsAtom,
  selectedModelIdAtom,
} from "@/atoms/user-settings-atom";
import { customModelsAtom } from "@/atoms/models-list-atom";
import useTranslation from "@/components/hooks/use-translation";
import posthog from "posthog-js";
import { CustomModel } from "@common/types/types";
import { sanitizePath } from "@common/sanitize-path";
import { EditCustomModelDialog } from "./edit-custom-model-dialog";
import { ELECTRON_COMMANDS } from "@common/electron-commands";

const SelectModelDialog = () => {
  const t = useTranslation();
  const [selectedModelId, setSelectedModelId] = useAtom(selectedModelIdAtom);
  const [hiddenModelIds, setHiddenModelIds] = useAtom(hiddenModelIdsAtom);
  const [showHidden, setShowHidden] = useState(false);

  const customModels = useAtomValue(customModelsAtom);
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [zoomedImages, setZoomedImages] = useState<{
    before?: string;
    after?: string;
    preview?: string;
  } | null>(null);
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null);

  const toggleHideModel = (modelId: string) => {
    setHiddenModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId],
    );
  };

  const handleRefreshModels = () => {
    setIsRefreshing(true);
    try {
      const customModelsPath = JSON.parse(
        localStorage.getItem("customModelsPath"),
      );
      if (customModelsPath) {
        window.electron.send(
          ELECTRON_COMMANDS.GET_MODELS_LIST,
          customModelsPath,
        );
      }
    } catch (err) {
      console.error("Error refreshing models:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleModelSelect = (model: ModelId | string) => {
    setSelectedModelId(model);
    setOpen(false);

    posthog.capture("model_selected", {
      $ip: "0.0.0.0",
      $geoip_disable: true,
      model,
    });
  };

  const handleZoom = (event: React.MouseEvent, model: ModelId) => {
    event.stopPropagation();
    setZoomedImages({
      before: `public:///model-comparison/${MODELS[model]?.id}/before.webp`,
      after: `public:///model-comparison/${MODELS[model]?.id}/after.webp`,
    });
  };

  const selectedCustomModel = customModels.find(
    (m) => m.id === selectedModelId,
  );

  const visibleDefaultModels = Object.entries(MODELS).filter(
    ([id]) => showHidden || !hiddenModelIds.includes(id),
  );
  const visibleCustomModels = customModels.filter(
    (m) => showHidden || !hiddenModelIds.includes(m.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="btn btn-primary justify-start border-border">
            <SwatchBookIcon className="mr-2 h-5 w-5" />
            {selectedModelId in MODELS
              ? t(
                  `APP.MODEL_SELECTION.MODELS.${MODELS[selectedModelId]?.id}.NAME` as any,
                )
              : selectedCustomModel?.name || selectedModelId}
          </button>
        </DialogTrigger>
        <DialogContent className="z-50 sm:max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-6">
            <DialogTitle>{t("APP.MODEL_SELECTION.DESCRIPTION")}</DialogTitle>
            <div className="flex items-center gap-1">
              {hiddenModelIds.length > 0 && (
                <Button
                  variant={showHidden ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-base-content/70 hover:text-base-content"
                  title={
                    showHidden
                      ? "Ocultar modelos deshabilitados"
                      : "Ver modelos ocultos"
                  }
                  onClick={() => setShowHidden(!showHidden)}
                >
                  {showHidden ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {showHidden
                      ? "Ocultando"
                      : `Ocultos (${hiddenModelIds.length})`}
                  </span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-base-content/70 hover:text-base-content"
                title="Actualizar lista de modelos"
                onClick={handleRefreshModels}
                disabled={isRefreshing}
              >
                <RotateCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>Actualizar</span>
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[600px] pr-4">
            <div className="flex flex-col gap-4">
              {visibleDefaultModels.map((modelData) => {
                const modelId = modelData[0] as ModelId;
                const model = modelData[1];
                const isHidden = hiddenModelIds.includes(modelId);
                return (
                  <button
                    key={modelId}
                    className={`btn !h-auto !w-full !flex-col !items-start !rounded-sm !p-4 ${
                      isHidden
                        ? "opacity-60 border-dashed border-base-content/40"
                        : ""
                    }`}
                    onClick={() => handleModelSelect(modelId)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {t(`APP.MODEL_SELECTION.MODELS.${modelId}.NAME`)}
                          </p>
                          {isHidden && (
                            <span className="badge badge-warning badge-xs">
                              Oculto
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-left font-normal leading-normal text-base-content/70">
                          {t(`APP.MODEL_SELECTION.MODELS.${modelId}.DESCRIPTION`)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                        title={
                          isHidden
                            ? "Mostrar modelo"
                            : "Ocultar modelo de la lista"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHideModel(modelId);
                        }}
                      >
                        {isHidden ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="relative h-52 w-full overflow-hidden rounded-sm">
                      <div className="flex h-full w-full">
                        <img
                          src={`public:///model-comparison/${model.id}/before.webp`}
                          alt={`Model Before`}
                          className="h-full w-1/2 object-cover"
                        />
                        <img
                          src={`public:///model-comparison/${model.id}/after.webp`}
                          alt={`Model After`}
                          className="h-full w-1/2 object-cover"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-full w-px bg-white opacity-50"></div>
                      </div>
                      <div className="absolute bottom-2 left-2 rounded bg-black bg-opacity-50 px-1 text-xs text-white">
                        {t("APP.MODEL_SELECTION.BEFORE")}
                      </div>
                      <div className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-1 text-xs text-white">
                        {t("APP.MODEL_SELECTION.AFTER")}
                      </div>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={(e) => handleZoom(e, modelId)}
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span className="sr-only">
                          {t("APP.MODEL_SELECTION.ZOOM")}
                        </span>
                      </Button>
                    </div>
                  </button>
                );
              })}
              {visibleCustomModels.length > 0 && (
                <p className="font-semibold text-base-content">
                  {t("APP.MODEL_SELECTION.IMPORTED_CUSTOM_MODELS")}
                </p>
              )}

              {/* Modelos personalizados enriquecidos */}
              {visibleCustomModels.map((customModel) => {
                const isSelected = selectedModelId === customModel.id;
                const isHidden = hiddenModelIds.includes(customModel.id);
                return (
                  <div
                    key={customModel.id}
                    className={`relative flex flex-col rounded-sm border p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-base-100 hover:border-primary/50"
                    } ${isHidden ? "opacity-60 border-dashed border-base-content/40" : ""}`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleModelSelect(customModel.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-base-content">
                            {customModel.name}
                          </p>
                          {isHidden && (
                            <span className="badge badge-warning badge-xs">
                              Oculto
                            </span>
                          )}
                        </div>
                        {customModel.description ? (
                          <p className="mb-2 text-left font-normal leading-normal text-base-content/70">
                            {customModel.description}
                          </p>
                        ) : (
                          <p className="mb-2 text-left text-xs font-normal italic text-base-content/40">
                            Sin descripción
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                          title={
                            isHidden
                              ? "Mostrar modelo"
                              : "Ocultar modelo de la lista"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHideModel(customModel.id);
                          }}
                        >
                          {isHidden ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                          title="Editar información del modelo"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModel(customModel);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Previews */}
                    {customModel.before && customModel.after ? (
                      <div
                        className="relative h-52 w-full cursor-pointer overflow-hidden rounded-sm"
                        onClick={() => handleModelSelect(customModel.id)}
                      >
                        <div className="flex h-full w-full">
                          <img
                            src={`file:///${sanitizePath(customModel.before)}`}
                            alt="Before"
                            className="h-full w-1/2 object-cover"
                          />
                          <img
                            src={`file:///${sanitizePath(customModel.after)}`}
                            alt="After"
                            className="h-full w-1/2 object-cover"
                          />
                        </div>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-full w-px bg-white opacity-50"></div>
                        </div>
                        <div className="absolute bottom-2 left-2 rounded bg-black bg-opacity-50 px-1 text-xs text-white">
                          {t("APP.MODEL_SELECTION.BEFORE")}
                        </div>
                        <div className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-1 text-xs text-white">
                          {t("APP.MODEL_SELECTION.AFTER")}
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImages({
                              before: `file:///${sanitizePath(customModel.before)}`,
                              after: `file:///${sanitizePath(customModel.after)}`,
                            });
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                          <span className="sr-only">Zoom</span>
                        </Button>
                      </div>
                    ) : customModel.preview ? (
                      <div
                        className="relative h-52 w-full cursor-pointer overflow-hidden rounded-sm"
                        onClick={() => handleModelSelect(customModel.id)}
                      >
                        <img
                          src={`file:///${sanitizePath(customModel.preview)}`}
                          alt={customModel.name}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImages({
                              preview: `file:///${sanitizePath(customModel.preview)}`,
                            });
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                          <span className="sr-only">Zoom</span>
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex h-20 w-full cursor-pointer items-center justify-center rounded-sm border border-dashed border-base-content/20 bg-base-200/40 text-xs text-base-content/50"
                        onClick={() => handleModelSelect(customModel.id)}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <span>Sin vista previa</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleDefaultModels.length === 0 &&
                visibleCustomModels.length === 0 && (
                  <div className="py-8 text-center text-sm text-base-content/60">
                    No hay modelos visibles.
                    {hiddenModelIds.length > 0 &&
                      " Pulsa en 'Ocultos' arriba para ver y restaurar tus modelos."}
                  </div>
                )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición de modelo personalizado */}
      <EditCustomModelDialog
        model={editingModel}
        open={!!editingModel}
        onOpenChange={(isOpen) => !isOpen && setEditingModel(null)}
      />

      {/* Diálogo de zoom unificado */}
      <Dialog
        open={!!zoomedImages}
        onOpenChange={(isOpen) => !isOpen && setZoomedImages(null)}
      >
        <DialogContent
          className="h-screen w-screen max-w-full p-0"
          hideCloseButton
        >
          <div className="relative flex h-full w-full items-center justify-center bg-black">
            {zoomedImages?.before && zoomedImages?.after ? (
              <div className="flex h-full w-full">
                <div className="relative h-full w-1/2">
                  <img
                    src={zoomedImages.before}
                    alt="Zoomed in Image - Before"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute bottom-4 left-4 rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                    Before
                  </div>
                </div>
                <div className="relative h-full w-1/2">
                  <img
                    src={zoomedImages.after}
                    alt="Zoomed in Image - After"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute bottom-4 right-4 rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                    After
                  </div>
                </div>
              </div>
            ) : zoomedImages?.preview ? (
              <img
                src={zoomedImages.preview}
                alt="Zoomed in Preview"
                className="h-full w-full object-contain"
              />
            ) : null}
            <button
              className="btn btn-circle btn-secondary absolute right-4 top-4"
              onClick={() => setZoomedImages(null)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelectModelDialog;

