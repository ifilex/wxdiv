import type { CSSProperties } from "react";

export type IdeThemeId =
  | "classic-div"
  | "amber-dos"
  | "green-phosphor"
  | "borland-blue"
  | "synthwave"
  | "cyber-dark";

export type IdeBackgroundId =
  | "div-retro-wallpaper"
  | "retro-grid"
  | "starfield"
  | "classic-dots"
  | "div-gradient"
  | "carbon-weave"
  | "solid-custom"
  | "custom-url";

export type IdeAccentId =
  | "cyan"
  | "amber"
  | "emerald"
  | "purple"
  | "magenta"
  | "blue";

export interface IdeThemeConfig {
  themeId: IdeThemeId;
  backgroundId: IdeBackgroundId;
  accentId: IdeAccentId;
  customBgColor: string;
  customBgUrl: string;
  crtScanlines: boolean;
}

export const DEFAULT_IDE_THEME: IdeThemeConfig = {
  themeId: "classic-div",
  backgroundId: "div-retro-wallpaper",
  accentId: "cyan",
  customBgColor: "#060a16",
  customBgUrl: "",
  crtScanlines: false,
};

export const THEME_PRESETS: Record<
  IdeThemeId,
  {
    name: string;
    description: string;
    bgColor: string;
    borderColor: string;
    accentColor: string;
    textColor: string;
    titlebarBg: string;
  }
> = {
  "classic-div": {
    name: "DIV Clásico DOS",
    description: "Azul cobalto y cian original de DIV Games Studio 1 y 2",
    bgColor: "#040918",
    borderColor: "#0284c7",
    accentColor: "#38bdf8",
    textColor: "#e0f2fe",
    titlebarBg: "from-[#0c1e3d] via-[#071328] to-[#040918]",
  },
  "amber-dos": {
    name: "Fósforo Ámbar",
    description: "Monocromo cálido inspirado en los monitores ámbar de los 80",
    bgColor: "#100902",
    borderColor: "#b45309",
    accentColor: "#f59e0b",
    textColor: "#fef3c7",
    titlebarBg: "from-[#291705] via-[#1a0e03] to-[#100902]",
  },
  "green-phosphor": {
    name: "Fósforo Verde CRT",
    description: "Terminal MS-DOS verde hacker de tubo de rayos catódicos",
    bgColor: "#021206",
    borderColor: "#047857",
    accentColor: "#10b981",
    textColor: "#d1fae5",
    titlebarBg: "from-[#052e16] via-[#031d0e] to-[#021206]",
  },
  "borland-blue": {
    name: "Borland Turbo IDE",
    description: "Azul marino clásico de Borland C++ y Turbo Pascal",
    bgColor: "#000080",
    borderColor: "#0284c7",
    accentColor: "#60a5fa",
    textColor: "#ffffff",
    titlebarBg: "from-[#0000a0] via-[#000080] to-[#000060]",
  },
  "synthwave": {
    name: "Synthwave 80s Neón",
    description: "Púrpura y fucsia retro-futurista cyberpunk",
    bgColor: "#0e051d",
    borderColor: "#9333ea",
    accentColor: "#e879f9",
    textColor: "#fae8ff",
    titlebarBg: "from-[#270b4a] via-[#1b0733] to-[#0e051d]",
  },
  "cyber-dark": {
    name: "Cyber Dark Carbón",
    description: "Grafito minimalista de alto contraste y baja fatiga visual",
    bgColor: "#07090e",
    borderColor: "#475569",
    accentColor: "#94a3b8",
    textColor: "#f8fafc",
    titlebarBg: "from-[#1e293b] via-[#0f172a] to-[#07090e]",
  },
};

export const BACKGROUND_PRESETS: Record<
  IdeBackgroundId,
  {
    name: string;
    description: string;
    style: (config: IdeThemeConfig) => CSSProperties;
  }
> = {
  "div-retro-wallpaper": {
    name: "Tapiz Azul DIV Original (DOS)",
    description: "Fondo texturizado original en azul cobalto y negro como en la captura clásica",
    style: () => ({
      backgroundColor: "#050b1c",
      backgroundImage: `repeating-linear-gradient(0deg, #040816 0px, #040816 3px, #0b1c44 3px, #0b1c44 6px, #07122b 6px, #07122b 9px),
                        radial-gradient(ellipse at 50% 80%, rgba(0, 80, 220, 0.45) 0%, rgba(3, 10, 30, 0.8) 70%)`,
      backgroundBlendMode: "screen",
    }),
  },
  "retro-grid": {
    name: "Rejilla Retro DIV",
    description: "Cuadrícula geométrica sutil clásica de desarrollo",
    style: (cfg) => {
      const theme = THEME_PRESETS[cfg.themeId] || THEME_PRESETS["classic-div"];
      return {
        backgroundColor: theme.bgColor,
        backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      };
    },
  },
  "classic-dots": {
    name: "Matriz de Puntos DOS",
    description: "Puntos espaciados estilo banco de trabajo DIV",
    style: (cfg) => {
      const theme = THEME_PRESETS[cfg.themeId] || THEME_PRESETS["classic-div"];
      return {
        backgroundColor: theme.bgColor,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.25) 1px, transparent 0)`,
        backgroundSize: "22px 22px",
      };
    },
  },
  "starfield": {
    name: "Espacio Estelar Pixel",
    description: "Cielo nocturno con estrellas dispersas para programadores",
    style: (cfg) => {
      const theme = THEME_PRESETS[cfg.themeId] || THEME_PRESETS["classic-div"];
      return {
        backgroundColor: theme.bgColor,
        backgroundImage: `radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 20px),
                          radial-gradient(rgba(56, 189, 248, 0.8), rgba(56, 189, 248, .1) 1px, transparent 30px),
                          radial-gradient(rgba(245, 158, 11, 0.7), rgba(245, 158, 11, .1) 1px, transparent 25px)`,
        backgroundSize: "350px 350px, 200px 200px, 280px 280px",
        backgroundPosition: "0 0, 40px 60px, 130px 180px",
      };
    },
  },
  "div-gradient": {
    name: "Degradado Clásico DIV",
    description: "Resplandor radial central azulado con bordes oscuros",
    style: (cfg) => {
      const theme = THEME_PRESETS[cfg.themeId] || THEME_PRESETS["classic-div"];
      return {
        backgroundColor: theme.bgColor,
        backgroundImage: `radial-gradient(circle at center, ${theme.borderColor}25 0%, transparent 75%)`,
      };
    },
  },
  "carbon-weave": {
    name: "Fibra de Carbono",
    description: "Textura tejida mate de precisión",
    style: (cfg) => {
      const theme = THEME_PRESETS[cfg.themeId] || THEME_PRESETS["classic-div"];
      return {
        backgroundColor: theme.bgColor,
        backgroundImage: `linear-gradient(45deg, #111827 25%, transparent 25%), 
                          linear-gradient(-45deg, #111827 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #111827 75%), 
                          linear-gradient(-45deg, transparent 75%, #111827 75%)`,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      };
    },
  },
  "solid-custom": {
    name: "Color Sólido Personalizado",
    description: "Fondo limpio del color exacto que elijas",
    style: (cfg) => ({
      backgroundColor: cfg.customBgColor || "#050811",
    }),
  },
  "custom-url": {
    name: "Imagen de Fondo Personalizada",
    description: "Carga cualquier wallpaper mediante URL",
    style: (cfg) => ({
      backgroundColor: "#050811",
      backgroundImage: cfg.customBgUrl ? `url("${cfg.customBgUrl}")` : "none",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }),
  },
};

export const ACCENT_PRESETS: Record<
  IdeAccentId,
  { name: string; hex: string; ringClass: string; badgeClass: string }
> = {
  cyan: {
    name: "Cian DIV",
    hex: "#06b6d4",
    ringClass: "ring-cyan-500 border-cyan-500/80 shadow-cyan-950/50",
    badgeClass: "bg-cyan-950 text-cyan-400 border-cyan-700/50",
  },
  amber: {
    name: "Ámbar Retro",
    hex: "#f59e0b",
    ringClass: "ring-amber-500 border-amber-500/80 shadow-amber-950/50",
    badgeClass: "bg-amber-950 text-amber-400 border-amber-700/50",
  },
  emerald: {
    name: "Esmeralda Matrix",
    hex: "#10b981",
    ringClass: "ring-emerald-500 border-emerald-500/80 shadow-emerald-950/50",
    badgeClass: "bg-emerald-950 text-emerald-400 border-emerald-700/50",
  },
  purple: {
    name: "Púrpura Arcade",
    hex: "#a855f7",
    ringClass: "ring-purple-500 border-purple-500/80 shadow-purple-950/50",
    badgeClass: "bg-purple-950 text-purple-400 border-purple-700/50",
  },
  magenta: {
    name: "Magenta Neón",
    hex: "#ec4899",
    ringClass: "ring-pink-500 border-pink-500/80 shadow-pink-950/50",
    badgeClass: "bg-pink-950 text-pink-400 border-pink-700/50",
  },
  blue: {
    name: "Azul Cobalto",
    hex: "#3b82f6",
    ringClass: "ring-blue-500 border-blue-500/80 shadow-blue-950/50",
    badgeClass: "bg-blue-950 text-blue-400 border-blue-700/50",
  },
};

const STORAGE_KEY = "div_studio_ide_theme_v1";

export function loadIdeTheme(): IdeThemeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_IDE_THEME, ...parsed };
    }
  } catch (e) {
    console.warn("Could not load IDE theme from localStorage", e);
  }
  return DEFAULT_IDE_THEME;
}

export function saveIdeTheme(config: IdeThemeConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not save IDE theme to localStorage", e);
  }
}
