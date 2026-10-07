"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { CustomModel, SaveCustomModelPayload } from "@common/types/types";
import { sanitizePath } from "@common/sanitize-path";
import { ImageIcon, Upload, X } from "lucide-react";

interface ImagePickerCardProps {
  label: string;
  emptyLabel: string;
  imagePath?: string;
  heightClass?: string;
  onSelect: () => void;
  onClear: () => void;
}

function ImagePickerCard({
  label,
  emptyLabel,
  imagePath,
  heightClass = "h-28",
  onSelect,
  onClear,
}: ImagePickerCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onSelect}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {imagePath ? "Cambiar" : "Seleccionar"}
        </Button>
      </div>

      {imagePath ? (
        <div
          className={`relative ${heightClass} w-full overflow-hidden rounded border border-border`}
        >
          <img
            src={`file:///${sanitizePath(imagePath)}`}
            alt={label}
            className="h-full w-full object-cover"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-white hover:bg-black/80"
            onClick={onClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex h-16 w-full items-center justify-center rounded border border-dashed border-base-content/20 bg-base-200/50 text-xs text-base-content/50">
          <ImageIcon className="mr-2 h-4 w-4" />
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

interface EditCustomModelDialogProps {
  model: CustomModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomModelDialog({
  model,
  open,
  onOpenChange,
}: EditCustomModelDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [previewMode, setPreviewMode] = useState<"single" | "comparison">(
    "single",
  );
  const [previewPath, setPreviewPath] = useState<string>("");
  const [beforePath, setBeforePath] = useState<string>("");
  const [afterPath, setAfterPath] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (model) {
      setName(model.name || model.id);
      setDescription(model.description || "");
      if (model.before && model.after) {
        setPreviewMode("comparison");
        setBeforePath(model.before);
        setAfterPath(model.after);
        setPreviewPath("");
      } else {
        setPreviewMode("single");
        setPreviewPath(model.preview || "");
        setBeforePath("");
        setAfterPath("");
      }
    }
  }, [model, open]);

  if (!model) return null;

  const handleSelectImage = async (
    target: "preview" | "before" | "after",
  ) => {
    try {
      const selectedPath = await window.electron.invoke(
        ELECTRON_COMMANDS.SELECT_MODEL_PREVIEW_IMAGE,
      );
      if (selectedPath) {
        if (target === "preview") setPreviewPath(selectedPath);
        if (target === "before") setBeforePath(selectedPath);
        if (target === "after") setAfterPath(selectedPath);
      }
    } catch (err) {
      console.error("Error selecting image: ", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "El modelo debe tener un nombre.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: SaveCustomModelPayload = {
        folderPath: model.folderPath,
        name: name.trim(),
        description: description.trim(),
        previewMode,
        previewPath: previewMode === "single" ? (previewPath || "") : undefined,
        beforePath: previewMode === "comparison" ? (beforePath || "") : undefined,
        afterPath: previewMode === "comparison" ? (afterPath || "") : undefined,
      };

      const result = await window.electron.invoke(
        ELECTRON_COMMANDS.SAVE_CUSTOM_MODEL_INFO,
        payload,
      );

      if (result && result.success !== false) {
        toast({
          title: "Modelo actualizado",
          description: "La información del modelo se guardó con éxito.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error al guardar",
          description: result?.error || "No se pudo actualizar el modelo.",
        });
      }
    } catch (err) {
      console.error("Error saving custom model info: ", err);
      toast({
        title: "Error al guardar",
        description: "Ocurrió un error inesperado al guardar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar información del modelo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-base-content/80">
              Nombre a mostrar
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPaste={(e) => e.stopPropagation()}
              autoFocus
              placeholder="Ej: Anime Enhancer 4x"
              className="bg-base-200"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-base-content/80">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPaste={(e) => e.stopPropagation()}
              placeholder="Describe para qué tipo de imágenes o estilos es ideal este modelo..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-base-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Selector de modo de vista previa */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-base-content/80">
              Tipo de vista previa
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={previewMode === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("single")}
              >
                Imagen única
              </Button>
              <Button
                type="button"
                variant={previewMode === "comparison" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("comparison")}
              >
                Comparativa Antes / Después
              </Button>
            </div>
          </div>

          {/* Vista previa única */}
          {previewMode === "single" && (
            <div className="rounded-md border border-border p-3">
              <ImagePickerCard
                label="Imagen de preview"
                emptyLabel="Ninguna imagen seleccionada"
                imagePath={previewPath}
                heightClass="h-36"
                onSelect={() => handleSelectImage("preview")}
                onClear={() => setPreviewPath("")}
              />
            </div>
          )}

          {/* Comparativa Antes / Después */}
          {previewMode === "comparison" && (
            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <ImagePickerCard
                label="Imagen de Antes (Original)"
                emptyLabel="Sin imagen original"
                imagePath={beforePath}
                onSelect={() => handleSelectImage("before")}
                onClear={() => setBeforePath("")}
              />
              <ImagePickerCard
                label="Imagen de Después (Reescalada)"
                emptyLabel="Sin imagen reescalada"
                imagePath={afterPath}
                onSelect={() => handleSelectImage("after")}
                onClear={() => setAfterPath("")}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

