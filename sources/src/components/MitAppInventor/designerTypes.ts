export type DesignerComponentType =
  | "Button"
  | "Label"
  | "TextBox"
  | "Image"
  | "CheckBox"
  | "Slider"
  | "Switch"
  | "Canvas"
  | "Clock"
  | "Sound"
  | "HorizontalArrangement"
  | "VerticalArrangement"
  | "Spinner"
  | "DatePicker";

export interface DesignerComponent {
  id: string;
  type: DesignerComponentType;
  name: string;
  text: string;
  textColor: string;
  backgroundColor: string;
  fontSize: number;
  fontBold: boolean;
  width: "auto" | "fill" | number;
  height: "auto" | "fill" | number;
  enabled: boolean;
  visible: boolean;
  alignment: "left" | "center" | "right";
  hint?: string;
  value?: number;
  checked?: boolean;
  icon?: string;
  imageUrl?: string;
  parentId?: string;
}

export interface ScreenProperties {
  appName: string;
  title: string;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  orientation: "portrait" | "landscape" | "sensor";
  showStatusBar: boolean;
  titleVisible: boolean;
  scrollable: boolean;
  theme: "classic" | "material" | "dark" | "blackTitle";
  icon: string;
  sizing: "responsive" | "fixed";
}

export type DeviceType = "phone" | "tablet" | "monitor";
export type DeviceOrientation = "portrait" | "landscape";

export const DEFAULT_SCREEN_PROPERTIES: ScreenProperties = {
  appName: "Mi Gran App",
  title: "Screen1",
  backgroundColor: "#ffffff",
  primaryColor: "#5b871c", // App Inventor Classic green or Material primary
  accentColor: "#80b62b",
  textColor: "#1f2937",
  orientation: "portrait",
  showStatusBar: true,
  titleVisible: true,
  scrollable: true,
  theme: "material",
  icon: "📱",
  sizing: "responsive",
};

export const PALETTE_CATEGORIES = [
  {
    id: "user_interface",
    name: "Interfaz de Usuario",
    icon: "👆",
    items: [
      { type: "Button" as DesignerComponentType, name: "Botón", icon: "🔘", desc: "Botón táctil clickeable" },
      { type: "Label" as DesignerComponentType, name: "Etiqueta", icon: "🏷️", desc: "Texto o título en pantalla" },
      { type: "TextBox" as DesignerComponentType, name: "Campo de Texto", icon: "✍️", desc: "Entrada de texto del usuario" },
      { type: "Image" as DesignerComponentType, name: "Imagen", icon: "🖼️", desc: "Gráfico o ilustración" },
      { type: "CheckBox" as DesignerComponentType, name: "Casilla Verificación", icon: "☑️", desc: "Interruptor booleano sí/no" },
      { type: "Slider" as DesignerComponentType, name: "Deslizador", icon: "🎚️", desc: "Control de barra ajustable" },
      { type: "Switch" as DesignerComponentType, name: "Interruptor", icon: "🔛", desc: "Selector on/off moderno" },
      { type: "Spinner" as DesignerComponentType, name: "Selector Desplegable", icon: "📑", desc: "Lista de opciones táctil" },
    ],
  },
  {
    id: "layout",
    name: "Disposición (Layout)",
    icon: "📐",
    items: [
      { type: "HorizontalArrangement" as DesignerComponentType, name: "Disposición Horizontal", icon: "↔️", desc: "Alinea elementos lado a lado" },
      { type: "VerticalArrangement" as DesignerComponentType, name: "Disposición Vertical", icon: "↕️", desc: "Alinea elementos en columna" },
    ],
  },
  {
    id: "drawing",
    name: "Dibujo y Animación",
    icon: "🎨",
    items: [
      { type: "Canvas" as DesignerComponentType, name: "Lienzo (Canvas DIV)", icon: "🎯", desc: "Área de juego interactiva táctil" },
    ],
  },
  {
    id: "media",
    name: "Medios y Audio",
    icon: "🎵",
    items: [
      { type: "Sound" as DesignerComponentType, name: "Sonido", icon: "🔊", desc: "Efectos sonoros y vibración" },
    ],
  },
  {
    id: "sensors",
    name: "Sensores y Reloj",
    icon: "⏱️",
    items: [
      { type: "Clock" as DesignerComponentType, name: "Reloj (Timer)", icon: "⏰", desc: "Temporizador de eventos y bucles" },
    ],
  },
];
