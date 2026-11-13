import * as THREE from "three";

export interface LumpEntry {
  name: string;
  filePos: number;
  size: number;
  index: number;
  buffer?: ArrayBuffer;
}

export interface DoomVertex {
  x: number;
  y: number;
}

export interface DoomSector {
  floorHeight: number;
  ceilingHeight: number;
  floorTexture: string;
  ceilingTexture: string;
  lightLevel: number;
  type: number;
  tag: number;
  id: number;
  lines?: DoomLinedef[];
  floorMesh?: THREE.Mesh;
  ceilingMesh?: THREE.Mesh;
  walls?: THREE.Mesh[];
  secretFound?: boolean;
  getHeightAt?: (x: number, y: number, isCeil: boolean) => number;
  // UDMF Slopes
  floorplane_a?: number;
  floorplane_b?: number;
  floorplane_c?: number;
  floorplane_d?: number;
  ceilplane_a?: number;
  ceilplane_b?: number;
  ceilplane_c?: number;
  ceilplane_d?: number;
}

export interface DoomSidedef {
  offsetX: number;
  offsetY: number;
  upperTexture: string;
  lowerTexture: string;
  middleTexture: string;
  sectorId: number;
}

export interface DoomLinedef {
  v1: DoomVertex;
  v2: DoomVertex;
  flags: number;
  specialType: number;
  sectorTag: number;
  sideFront?: DoomSidedef | null;
  sideBack?: DoomSidedef | null;
  frontSector?: DoomSector | null;
  backSector?: DoomSector | null;
  hasBeenUsed?: boolean;
  udmfArgs?: Record<string, any>;
}

export interface DoomThing {
  x: number;
  y: number;
  angle: number;
  type: number;
  flags: number;
  collected?: boolean;
  mesh?: THREE.Mesh | THREE.Group;
}

export interface DoomMapData {
  vertexes: DoomVertex[];
  sectors: DoomSector[];
  sidedefs: DoomSidedef[];
  linedefs: DoomLinedef[];
  things: DoomThing[];
}

export interface SectorAnimation {
  sector: DoomSector;
  property: "floorHeight" | "ceilingHeight";
  original: number;
  target: number;
  speed: number;
  waitTime?: number;
  timer?: number;
  phase: "moving" | "waiting" | "returning" | "moving_down" | "moving_up";
  type?: "crusher" | "door" | "lift" | "floor";
  damage?: number;
}

export interface ScriptStateFrame {
  sprite: string;
  frame: string;
  duration: number;
  action?: string | null;
  args?: any[];
}

export interface ScriptActorDef {
  name: string;
  parent?: string | null;
  doomEdNum?: number | null;
  properties: Record<string, any>;
  states: Record<string, ScriptStateFrame[]>;
}
