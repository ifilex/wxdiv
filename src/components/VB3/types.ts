export type VB3ToolType =
  | "pointer"
  | "picturebox"
  | "label"
  | "textbox"
  | "frame"
  | "commandbutton"
  | "checkbox"
  | "optionbutton"
  | "combobox"
  | "listbox"
  | "hscrollbar"
  | "vscrollbar"
  | "timer"
  | "drivelistbox"
  | "dirlistbox"
  | "filelistbox"
  | "shape"
  | "line"
  | "image"
  | "data"
  | "grid"
  | "webembed"
  | "ole"
  | "commondialog"
  | "gauge";

export interface VB3Control {
  id: string;
  name: string;
  type: VB3ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
  text?: string;
  value?: string | number | boolean;
  options?: string[];
  backColor?: string;
  foreColor?: string;
  fontName?: string;
  fontSize?: number;
  fontBold?: boolean;
  enabled?: boolean;
  visible?: boolean;
  interval?: number; // for timer
  borderStyle?: number;
  shapeType?: "rect" | "roundrect" | "circle" | "oval";
  // HTML5 / JS WebEmbed & Extensions
  embedUrl?: string;
  embedHtml?: string;
  min?: number;
  max?: number;
  dialogType?: "open" | "save" | "color" | "font";
}

export interface VB3Form {
  id: string;
  name: string;
  caption: string;
  backColor: string;
  width: number;
  height: number;
  controls: VB3Control[];
}

