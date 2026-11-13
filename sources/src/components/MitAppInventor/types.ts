export type BlockCategory =
  | "Control"
  | "Logic"
  | "Math"
  | "Text"
  | "Lists"
  | "Dictionaries"
  | "Colors"
  | "Variables"
  | "Procedures"
  | "ComponentEvent"
  | "ComponentCall"
  | "ComponentSetter"
  | "ComponentGetter";

export type BlockShape =
  | "hat" // Event handler: rounded top, notch inside C-mouth
  | "command" // Standard statement: top notch, bottom tab
  | "c-block" // Control: top notch, bottom tab, and nested C-mouth statement slot
  | "value" // Expression: left tab (output) and optional right input sockets
  | "procedure"; // Procedure definition: rounded top, statement slot

export interface BlockInputSlot {
  id: string;
  name: string;
  label?: string;
  type: "value" | "statement";
  connectedBlockId?: string; // ID of the block plugged into this slot
  defaultValue?: string | number | boolean;
}

export interface BlockInstance {
  id: string;
  type: string;
  category: BlockCategory;
  shape: BlockShape;
  color: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  componentName?: string;
  eventName?: string;
  propertyName?: string;
  methodName?: string;
  inputs: BlockInputSlot[];
  fields: Record<string, any>; // Values for dropdowns, text inputs, etc.
  dataStructureType?: "text" | "list" | "dictionary" | "color";
  listItems?: string[];
  dictPairs?: Array<{ key: string; value: string }>;
  colorHex?: string;
  colorRgb?: { r: number; g: number; b: number };
  varName?: string;
  nextBlockId?: string; // Block connected below this statement
  previousBlockId?: string; // Block above this statement
  parentSlotId?: string; // If this block is inside a C-slot or value socket
  subStatements?: BlockInstance[]; // Inner nested statement blocks for C-shapes
  inlineValues?: Array<{ label: string; value: string; color?: string }>; // Connected inline value chips
  isCollapsed?: boolean;
  comment?: string;
  originalDivSnippet?: string; // Original DIV line of code for 100% roundtrip accuracy
}

export interface AppInventorComponent {
  id: string;
  name: string;
  type: "Screen" | "Canvas" | "Player" | "Enemy" | "Button" | "Clock" | "Sound" | "Label";
  icon: string;
  properties: Record<string, any>;
  events: string[];
  methods: string[];
  setters: string[];
  getters: string[];
}

export interface MediaAsset {
  name: string;
  type: "image" | "sound" | "font";
  url?: string;
}
