import React from "react";

export const WXDIV_ASSET_MIME = "application/x-wxdiv-asset";

export type DraggedAssetPayload =
  | {
      kind: "model3d";
      id: string;
      name: string;
      format: "md2" | "md3" | "custom";
      role: "prop" | "enemy" | "ally" | "goal";
      scale: number;
    }
  | {
      kind: "texture";
      name: string;
      displayName: string;
      texKind: "both" | "wall" | "flat";
    }
  | {
      kind: "fpg_sprite";
      id: number;
      pkgId: number;
      name: string;
    }
  | {
      kind: "fpg_package";
      pkgId: number;
      name: string;
      filename: string;
      firstSpriteId?: number;
    };

let activeDraggedAsset: DraggedAssetPayload | null = null;

export function startAssetDrag(e: React.DragEvent, payload: DraggedAssetPayload): void {
  activeDraggedAsset = payload;
  const serialized = JSON.stringify(payload);
  try {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(WXDIV_ASSET_MIME, serialized);
    e.dataTransfer.setData("text/plain", serialized);
  } catch {
    // Fallback to in-memory activeDraggedAsset when restricted
  }
}

export function endAssetDrag(): void {
  activeDraggedAsset = null;
}

export function getActiveDraggedAsset(): DraggedAssetPayload | null {
  return activeDraggedAsset;
}

export function parseDroppedAsset(e: React.DragEvent): DraggedAssetPayload | null {
  try {
    const raw =
      e.dataTransfer.getData(WXDIV_ASSET_MIME) ||
      e.dataTransfer.getData("text/plain") ||
      "";
    if (raw && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as DraggedAssetPayload;
      if (parsed && typeof parsed === "object" && "kind" in parsed) {
        return parsed;
      }
    }
  } catch {
    // ignore malformed dataTransfer JSON
  }
  return activeDraggedAsset;
}
