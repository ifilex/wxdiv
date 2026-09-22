import { create } from "zustand";

export type GameState = "menu" | "playing" | "paused" | "gameover" | "victory";
export type Difficulty = "easy" | "normal" | "hard";
export type WeaponType = "pistol" | "shotgun" | "chaingun";
export type DoomFaceState =
  | "normal"
  | "look_left"
  | "look_right"
  | "grin"
  | "hurt"
  | "rage"
  | "dead";

export interface GameAmmo {
  bullets: number;
  maxBullets: number;
  shells: number;
  maxShells: number;
  cells: number;
  maxCells: number;
}

export interface GameStateStore {
  // Game lifecycle
  gameState: GameState;
  difficulty: Difficulty;
  isPointerLocked: boolean;

  // Player Stats
  health: number;
  armor: number;
  ammo: GameAmmo;
  weapons: Record<WeaponType, boolean>;
  currentWeapon: WeaponType;
  keys: {
    red: boolean;
    blue: boolean;
    yellow: boolean;
  };

  // Doomguy Face
  faceState: DoomFaceState;
  faceTimer: number;

  // Level & Scoring
  score: number;
  highscore: number;
  kills: number;
  totalEnemies: number;
  secrets: number;
  totalSecrets: number;
  levelStartTime: number;
  levelElapsedTime: number;

  // UI & Settings
  showAutomap: boolean;
  statusMessage: string | null;
  statusMessageTime: number;
  sensitivity: number;
  soundVolume: number;
  crtFilter: boolean;

  // Actions
  setGameState: (state: GameState) => void;
  setDifficulty: (diff: Difficulty) => void;
  setIsPointerLocked: (locked: boolean) => void;
  startNewGame: (difficulty?: Difficulty) => void;
  takeDamage: (amount: number) => boolean; // returns true if dead
  heal: (amount: number) => void;
  addArmor: (amount: number) => void;
  addAmmo: (type: keyof GameAmmo, amount: number) => void;
  spendAmmo: (type: "bullets" | "shells" | "cells", amount: number) => boolean;
  unlockWeapon: (weapon: WeaponType) => void;
  selectWeapon: (weapon: WeaponType) => void;
  addKey: (key: "red" | "blue" | "yellow") => void;
  hasKey: (key: "red" | "blue" | "yellow") => boolean;
  toggleAutomap: (force?: boolean) => void;
  addScore: (pts: number) => void;
  recordKill: () => void;
  recordSecret: () => void;
  setTotalEnemies: (total: number) => void;
  setStatusMessage: (msg: string) => void;
  triggerFace: (face: DoomFaceState, durationMs?: number) => void;
  updateFaceTick: () => void;
  setOptions: (opts: Partial<{ sensitivity: number; soundVolume: number; crtFilter: boolean }>) => void;
  updateElapsedTime: () => void;
}

const STORAGE_HIGH_SCORE_KEY = "wxdiv_mode8_highscore";

function loadHighScore(): number {
  try {
    const val = localStorage.getItem(STORAGE_HIGH_SCORE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(STORAGE_HIGH_SCORE_KEY, score.toString());
  } catch {}
}

export const useGameStore = create<GameStateStore>((set, get) => ({
  gameState: "menu",
  difficulty: "normal",
  isPointerLocked: false,

  health: 100,
  armor: 0,
  ammo: {
    bullets: 50,
    maxBullets: 200,
    shells: 0,
    maxShells: 50,
    cells: 0,
    maxCells: 300,
  },
  weapons: {
    pistol: true,
    shotgun: false,
    chaingun: false,
  },
  currentWeapon: "pistol",
  keys: {
    red: false,
    blue: false,
    yellow: false,
  },

  faceState: "normal",
  faceTimer: 0,

  score: 0,
  highscore: loadHighScore(),
  kills: 0,
  totalEnemies: 0,
  secrets: 0,
  totalSecrets: 2,
  levelStartTime: 0,
  levelElapsedTime: 0,

  showAutomap: false, // Strict: automap is only visible when toggled with TAB!
  statusMessage: null,
  statusMessageTime: 0,
  sensitivity: 1.5,
  soundVolume: 0.8,
  crtFilter: false,

  setGameState: (gameState) => set({ gameState }),

  setDifficulty: (difficulty) => set({ difficulty }),

  setIsPointerLocked: (isPointerLocked) => set({ isPointerLocked }),

  startNewGame: (difficulty) => {
    const diff = difficulty || get().difficulty;
    const startAmmo = diff === "easy" ? 80 : 50;

    set({
      gameState: "playing",
      difficulty: diff,
      health: 100,
      armor: 0,
      ammo: {
        bullets: startAmmo,
        maxBullets: 200,
        shells: 0,
        maxShells: 50,
        cells: 0,
        maxCells: 300,
      },
      weapons: {
        pistol: true,
        shotgun: false,
        chaingun: false,
      },
      currentWeapon: "pistol",
      keys: {
        red: false,
        blue: false,
        yellow: false,
      },
      faceState: "normal",
      faceTimer: 0,
      score: 0,
      kills: 0,
      secrets: 0,
      levelStartTime: Date.now(),
      levelElapsedTime: 0,
      showAutomap: false,
      statusMessage: "¡MODO 8 ACTIVADO! WASD / RATÓN - TAB: MAPA",
      statusMessageTime: Date.now() + 3500,
    });
  },

  takeDamage: (amount) => {
    const { health, armor, difficulty } = get();
    const multiplier = difficulty === "easy" ? 0.65 : difficulty === "hard" ? 1.35 : 1.0;
    const adjustedDamage = Math.round(amount * multiplier);

    // Armor absorbs 66% of damage
    let armorDamage = Math.min(armor, Math.floor(adjustedDamage * 0.66));
    let healthDamage = adjustedDamage - armorDamage;

    const newArmor = Math.max(0, armor - armorDamage);
    const newHealth = Math.max(0, health - healthDamage);

    if (newHealth <= 0) {
      set({
        health: 0,
        armor: newArmor,
        faceState: "dead",
        gameState: "gameover",
        statusMessage: "HAS MUERTO",
      });
      return true;
    }

    set({
      health: newHealth,
      armor: newArmor,
      faceState: "hurt",
      faceTimer: Date.now() + 600,
    });
    return false;
  },

  heal: (amount) => {
    const { health } = get();
    const newHealth = Math.min(100, health + amount);
    set({
      health: newHealth,
      faceState: "grin",
      faceTimer: Date.now() + 800,
    });
  },

  addArmor: (amount) => {
    const { armor } = get();
    set({ armor: Math.min(100, armor + amount) });
  },

  addAmmo: (type, amount) => {
    const { ammo, difficulty } = get();
    const bonus = difficulty === "easy" ? 1.5 : 1.0;
    const added = Math.round(amount * bonus);

    if (type === "bullets") {
      set({
        ammo: {
          ...ammo,
          bullets: Math.min(ammo.maxBullets, ammo.bullets + added),
        },
      });
    } else if (type === "shells") {
      set({
        ammo: {
          ...ammo,
          shells: Math.min(ammo.maxShells, ammo.shells + added),
        },
      });
    } else if (type === "cells") {
      set({
        ammo: {
          ...ammo,
          cells: Math.min(ammo.maxCells, ammo.cells + added),
        },
      });
    }
  },

  spendAmmo: (type, amount) => {
    const { ammo } = get();
    if (ammo[type] >= amount) {
      set({
        ammo: {
          ...ammo,
          [type]: ammo[type] - amount,
        },
      });
      return true;
    }
    return false;
  },

  unlockWeapon: (weapon) => {
    const { weapons } = get();
    set({
      weapons: { ...weapons, [weapon]: true },
      currentWeapon: weapon,
      faceState: "grin",
      faceTimer: Date.now() + 1000,
      statusMessage: `¡NUEVA ARMA ADQUIRIDA: ${weapon.toUpperCase()}!`,
      statusMessageTime: Date.now() + 3000,
    });
  },

  selectWeapon: (weapon) => {
    const { weapons } = get();
    if (weapons[weapon]) {
      set({ currentWeapon: weapon });
    }
  },

  addKey: (key) => {
    const { keys } = get();
    set({
      keys: { ...keys, [key]: true },
      statusMessage: `¡LLAVE ${key.toUpperCase()} RECOGIDA!`,
      statusMessageTime: Date.now() + 3500,
    });
  },

  hasKey: (key) => {
    return !!get().keys[key];
  },

  toggleAutomap: (force) => {
    set((state) => ({
      showAutomap: force !== undefined ? force : !state.showAutomap,
    }));
  },

  addScore: (pts) => {
    const { score, highscore } = get();
    const newScore = score + pts;
    const newHigh = Math.max(newScore, highscore);
    if (newHigh > highscore) {
      saveHighScore(newHigh);
    }
    set({ score: newScore, highscore: newHigh });
  },

  recordKill: () => {
    const { kills, score } = get();
    const newScore = score + 250;
    const newHigh = Math.max(newScore, get().highscore);
    if (newHigh > get().highscore) saveHighScore(newHigh);
    set({ kills: kills + 1, score: newScore, highscore: newHigh });
  },

  recordSecret: () => {
    const { secrets, score } = get();
    const newScore = score + 1000;
    const newHigh = Math.max(newScore, get().highscore);
    if (newHigh > get().highscore) saveHighScore(newHigh);
    set({
      secrets: secrets + 1,
      score: newScore,
      highscore: newHigh,
      statusMessage: "¡ÁREA SECRETA DESCUBIERTA! (+1000 PTS)",
      statusMessageTime: Date.now() + 4000,
    });
  },

  setTotalEnemies: (totalEnemies) => set({ totalEnemies }),

  setStatusMessage: (statusMessage) =>
    set({
      statusMessage,
      statusMessageTime: Date.now() + 3000,
    }),

  triggerFace: (faceState, durationMs = 800) => {
    set({
      faceState,
      faceTimer: Date.now() + durationMs,
    });
  },

  updateFaceTick: () => {
    const { faceState, faceTimer, health } = get();
    if (health <= 0) {
      if (faceState !== "dead") set({ faceState: "dead" });
      return;
    }

    if (Date.now() > faceTimer) {
      // Random idle face animation (looking left/right occasionally)
      const rand = Math.random();
      if (rand < 0.03) {
        set({
          faceState: "look_left",
          faceTimer: Date.now() + 900,
        });
      } else if (rand < 0.06) {
        set({
          faceState: "look_right",
          faceTimer: Date.now() + 900,
        });
      } else {
        set({ faceState: "normal" });
      }
    }
  },

  setOptions: (opts) => set(opts),

  updateElapsedTime: () => {
    const { levelStartTime, gameState } = get();
    if (gameState === "playing" && levelStartTime > 0) {
      set({ levelElapsedTime: Math.floor((Date.now() - levelStartTime) / 1000) });
    }
  },
}));
