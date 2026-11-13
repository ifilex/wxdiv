import React from "react";

export type WindowId =
  | "game"
  | "code"
  | "toolbox"
  | "project"
  | "properties"
  | "mode8"
  | "md2viewer"
  | "spritegenerator"
  | "fpg"
  | "map"
  | "sprites"
  | "fonts"
  | "palette"
  | "sound"
  | "explosions"
  | "visual"
  | "designer"
  | "ai"
  | "processes";

export interface WindowConfig {
  id: WindowId;
  title: string;
  subtitle?: string;
  category: "core" | "graphics" | "audio" | "tools";
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  prevBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type LayoutPresetType =
  | "vb5-classic"
  | "code-designer"
  | "designer-delphi"
  | "code-game"
  | "mode8-game"
  | "sprites-game"
  | "sound-code"
  | "quadrant"
  | "cascade"
  | "game-max"
  | "code-max";
