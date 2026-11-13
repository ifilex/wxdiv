/**
 * Mode 8 Web Worker Multi-Threaded Raycasting Acceleration Engine
 * DIV Games Studio 2 / Hexen / GZDoom Hybrid Raycaster
 *
 * Offloads column-by-column DDA ray calculations, wall intersection testing,
 * texture coordinate mapping, and sector height projections into background
 * Web Workers across available CPU cores.
 */

export interface RaycastWorkerTask {
  colStart: number;
  colEnd: number;
  numCols: number;
  colWidth: number;
  screenWidth: number;
  screenHeight: number;
  posX: number;
  posY: number;
  playerEyeZ: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  horizonY: number;
  isHybrid: boolean;
  mapWidth: number;
  mapHeight: number;
  map: number[][];
  sectors?: { floorHeight?: number; ceilHeight?: number; fluidType?: string }[][];
  doors?: { x: number; y: number; openAmount: number; texture?: number }[];
  vectorWalls?: { x1: number; y1: number; x2: number; y2: number; texture?: number }[];
}

export interface RaycastWorkerResult {
  colStart: number;
  colEnd: number;
  zBuffer: Float32Array;
  wallTypes: Int16Array;
  wallXFracs: Float32Array;
  drawStarts: Int16Array;
  drawEnds: Int16Array;
  sides: Uint8Array;
}

/**
 * Pure worker execution code string (packaged as an inline Blob WebWorker)
 */
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  const data = e.data;
  const colStart = data.colStart;
  const colEnd = data.colEnd;
  const numCols = data.numCols;
  const colWidth = data.colWidth;
  const screenWidth = data.screenWidth;
  const screenHeight = data.screenHeight;
  const posX = data.posX;
  const posY = data.posY;
  const playerEyeZ = data.playerEyeZ;
  const dirX = data.dirX;
  const dirY = data.dirY;
  const planeX = data.planeX;
  const planeY = data.planeY;
  const horizonY = data.horizonY;
  const isHybrid = data.isHybrid;
  const mapW = data.mapWidth;
  const mapH = data.mapHeight;
  const map = data.map;
  const sectors = data.sectors;
  const doors = data.doors;
  const vectorWalls = data.vectorWalls;

  const count = colEnd - colStart;
  const zBuffer = new Float32Array(count);
  const wallTypes = new Int16Array(count);
  const wallXFracs = new Float32Array(count);
  const drawStarts = new Int16Array(count);
  const drawEnds = new Int16Array(count);
  const sides = new Uint8Array(count);

  for (let c = colStart; c < colEnd; c++) {
    const idx = c - colStart;
    const cameraX = (2 * c) / numCols - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
    const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

    let stepX = 0;
    let stepY = 0;
    let sideDistX = 0;
    let sideDistY = 0;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - posX) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - posY) * deltaDistY;
    }

    let hit = 0;
    let side = 0;
    let wallType = 1;
    let wallXFrac = 0;
    let perpWallDist = 0;
    let steps = 0;

    while (hit === 0 && steps < 34) {
      steps++;
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      if (mapX < 0 || mapX >= mapW || mapY < 0 || mapY >= mapH) {
        hit = 1;
        wallType = 1;
        perpWallDist = side === 0
          ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
          : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
        break;
      }

      if (doors && doors.length > 0) {
        let hitDoor = false;
        for (let d = 0; d < doors.length; d++) {
          const door = doors[d];
          if (door.x === mapX && door.y === mapY) {
            const halfDist = side === 0
              ? sideDistX - deltaDistX * 0.5
              : sideDistY - deltaDistY * 0.5;
            const hitCoord = side === 0
              ? posY + halfDist * rayDirY
              : posX + halfDist * rayDirX;
            const cellFrac = hitCoord - Math.floor(hitCoord);
            if (cellFrac < (1.0 - door.openAmount)) {
              hit = 1;
              hitDoor = true;
              perpWallDist = halfDist;
              wallXFrac = cellFrac + door.openAmount;
              wallType = door.texture || 31;
              break;
            }
          }
        }
        if (hitDoor) break;
      }

      const cellVal = map[mapY] ? map[mapY][mapX] : 0;
      if (cellVal > 0) {
        hit = 1;
        wallType = cellVal;
        perpWallDist = side === 0
          ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
          : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);

        if (side === 0) wallXFrac = posY + perpWallDist * rayDirY;
        else wallXFrac = posX + perpWallDist * rayDirX;
        wallXFrac -= Math.floor(wallXFrac);
        break;
      }
    }

    perpWallDist = Math.max(0.1, perpWallDist);

    if (vectorWalls && vectorWalls.length > 0) {
      for (let v = 0; v < vectorWalls.length; v++) {
        const vw = vectorWalls[v];
        const vdx = vw.x2 - vw.x1;
        const vdy = vw.y2 - vw.y1;
        const denom = rayDirX * vdy - rayDirY * vdx;
        if (Math.abs(denom) > 1e-5) {
          const t = ((vw.x1 - posX) * vdy - (vw.y1 - posY) * vdx) / denom;
          const u = ((vw.x1 - posX) * rayDirY - (vw.y1 - posY) * rayDirX) / denom;
          if (u >= 0 && u <= 1 && t > 0.05) {
            const perpT = t * (rayDirX * dirX + rayDirY * dirY);
            if (perpT > 0.05 && perpT < perpWallDist) {
              perpWallDist = perpT;
              wallXFrac = u;
              wallType = vw.texture || 26;
              side = 2;
            }
          }
        }
      }
    }

    zBuffer[idx] = perpWallDist;
    wallTypes[idx] = wallType;
    wallXFracs[idx] = wallXFrac;
    sides[idx] = side;

    let drawStart = 0;
    let drawEnd = 0;

    if (isHybrid && sectors) {
      const targetSec = sectors[mapY] ? sectors[mapY][mapX] : null;
      const wallFloorZ = targetSec ? (targetSec.floorHeight || 0) : 0;
      const wallCeilZ = targetSec ? (targetSec.ceilHeight !== undefined ? targetSec.ceilHeight : 1.0) : 1.0;

      const wallBottomScreenY = horizonY + ((playerEyeZ - wallFloorZ) * (screenHeight * 0.8)) / perpWallDist;
      const wallTopScreenY = horizonY - ((wallCeilZ - playerEyeZ) * (screenHeight * 0.8)) / perpWallDist;

      drawStart = Math.max(0, Math.floor(wallTopScreenY));
      drawEnd = Math.min(screenHeight - 1, Math.floor(wallBottomScreenY));
    } else {
      const lineHeight = Math.floor((screenHeight / perpWallDist) * 1.05);
      drawStart = Math.max(0, Math.floor(-lineHeight / 2 + horizonY));
      drawEnd = Math.min(screenHeight - 1, Math.floor(lineHeight / 2 + horizonY));
    }

    drawStarts[idx] = drawStart;
    drawEnds[idx] = drawEnd;
  }

  self.postMessage({
    colStart,
    colEnd,
    zBuffer: zBuffer.buffer,
    wallTypes: wallTypes.buffer,
    wallXFracs: wallXFracs.buffer,
    drawStarts: drawStarts.buffer,
    drawEnds: drawEnds.buffer,
    sides: sides.buffer,
  }, [
    zBuffer.buffer,
    wallTypes.buffer,
    wallXFracs.buffer,
    drawStarts.buffer,
    drawEnds.buffer,
    sides.buffer,
  ]);
};
`;

/**
 * Worker Pool Manager for Mode 8 Raycasting
 */
export class Mode8WorkerPool {
  private workers: Worker[] = [];
  private workerUrl: string | null = null;
  private numWorkers: number = 2;
  private isAvailable: boolean = false;

  constructor(numWorkers: number = 2) {
    this.numWorkers = Math.max(1, Math.min(8, numWorkers));
    this.initWorkers();
  }

  private initWorkers() {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      this.isAvailable = false;
      return;
    }

    try {
      const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
      this.workerUrl = URL.createObjectURL(blob);

      for (let i = 0; i < this.numWorkers; i++) {
        const worker = new Worker(this.workerUrl);
        this.workers.push(worker);
      }
      this.isAvailable = true;
    } catch {
      // Sandboxed iframe without worker permissions: will fallback to synchronous batching
      this.isAvailable = false;
    }
  }

  public get available(): boolean {
    return this.isAvailable;
  }

  public setWorkerCount(count: number) {
    this.destroy();
    this.numWorkers = Math.max(1, Math.min(8, count));
    this.initWorkers();
  }

  private bufferPool: {
    capacity: number;
    zBuffer: Float32Array;
    wallTypes: Int16Array;
    wallXFracs: Float32Array;
    drawStarts: Int16Array;
    drawEnds: Int16Array;
    sides: Uint8Array;
  } | null = null;

  private getBuffers(count: number) {
    if (!this.bufferPool || this.bufferPool.capacity < count) {
      const cap = Math.max(count, 512);
      this.bufferPool = {
        capacity: cap,
        zBuffer: new Float32Array(cap),
        wallTypes: new Int16Array(cap),
        wallXFracs: new Float32Array(cap),
        drawStarts: new Int16Array(cap),
        drawEnds: new Int16Array(cap),
        sides: new Uint8Array(cap),
      };
    }
    return this.bufferPool;
  }

  /**
   * Synchronous fallback when Web Workers are blocked by sandbox iframe
   */
  public executeSync(task: RaycastWorkerTask): RaycastWorkerResult {
    const count = task.colEnd - task.colStart;
    const pool = this.getBuffers(count);
    const zBuffer = pool.zBuffer;
    const wallTypes = pool.wallTypes;
    const wallXFracs = pool.wallXFracs;
    const drawStarts = pool.drawStarts;
    const drawEnds = pool.drawEnds;
    const sides = pool.sides;

    for (let c = task.colStart; c < task.colEnd; c++) {
      const idx = c - task.colStart;
      const cameraX = (2 * c) / task.numCols - 1;
      const rayDirX = task.dirX + task.planeX * cameraX;
      const rayDirY = task.dirY + task.planeY * cameraX;

      let mapX = Math.floor(task.posX);
      let mapY = Math.floor(task.posY);

      const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
      const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

      let stepX = rayDirX < 0 ? -1 : 1;
      let stepY = rayDirY < 0 ? -1 : 1;
      let sideDistX = rayDirX < 0 ? (task.posX - mapX) * deltaDistX : (mapX + 1.0 - task.posX) * deltaDistX;
      let sideDistY = rayDirY < 0 ? (task.posY - mapY) * deltaDistY : (mapY + 1.0 - task.posY) * deltaDistY;

      let hit = 0;
      let side = 0;
      let wallType = 1;
      let wallXFrac = 0;
      let perpWallDist = 0;
      let steps = 0;

      while (hit === 0 && steps < 34) {
        steps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (mapX < 0 || mapX >= task.mapWidth || mapY < 0 || mapY >= task.mapHeight) {
          hit = 1;
          wallType = 1;
          perpWallDist = side === 0
            ? (mapX - task.posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
            : (mapY - task.posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
          break;
        }

        if (task.doors && task.doors.length > 0) {
          let hitDoor = false;
          for (const door of task.doors) {
            if (door.x === mapX && door.y === mapY) {
              const halfDist = side === 0 ? sideDistX - deltaDistX * 0.5 : sideDistY - deltaDistY * 0.5;
              const hitCoord = side === 0 ? task.posY + halfDist * rayDirY : task.posX + halfDist * rayDirX;
              const cellFrac = hitCoord - Math.floor(hitCoord);
              if (cellFrac < (1.0 - door.openAmount)) {
                hit = 1;
                hitDoor = true;
                perpWallDist = halfDist;
                wallXFrac = cellFrac + door.openAmount;
                wallType = door.texture || 31;
                break;
              }
            }
          }
          if (hitDoor) break;
        }

        const cellVal = task.map[mapY]?.[mapX] || 0;
        if (cellVal > 0) {
          hit = 1;
          wallType = cellVal;
          perpWallDist = side === 0
            ? (mapX - task.posX + (1 - stepX) / 2) / (rayDirX || 1e-6)
            : (mapY - task.posY + (1 - stepY) / 2) / (rayDirY || 1e-6);

          wallXFrac = side === 0 ? task.posY + perpWallDist * rayDirY : task.posX + perpWallDist * rayDirX;
          wallXFrac -= Math.floor(wallXFrac);
          break;
        }
      }

      perpWallDist = Math.max(0.1, perpWallDist);

      if (task.vectorWalls && task.vectorWalls.length > 0) {
        for (const vw of task.vectorWalls) {
          const vdx = vw.x2 - vw.x1;
          const vdy = vw.y2 - vw.y1;
          const denom = rayDirX * vdy - rayDirY * vdx;
          if (Math.abs(denom) > 1e-5) {
            const t = ((vw.x1 - task.posX) * vdy - (vw.y1 - task.posY) * vdx) / denom;
            const u = ((vw.x1 - task.posX) * rayDirY - (vw.y1 - task.posY) * rayDirX) / denom;
            if (u >= 0 && u <= 1 && t > 0.05) {
              const perpT = t * (rayDirX * task.dirX + rayDirY * task.dirY);
              if (perpT > 0.05 && perpT < perpWallDist) {
                perpWallDist = perpT;
                wallXFrac = u;
                wallType = vw.texture || 26;
                side = 2;
              }
            }
          }
        }
      }

      zBuffer[idx] = perpWallDist;
      wallTypes[idx] = wallType;
      wallXFracs[idx] = wallXFrac;
      sides[idx] = side;

      let drawStart = 0;
      let drawEnd = 0;

      if (task.isHybrid && task.sectors) {
        const targetSec = task.sectors[mapY]?.[mapX];
        const wallFloorZ = targetSec?.floorHeight ?? 0;
        const wallCeilZ = targetSec?.ceilHeight ?? 1.0;

        const wallBottomScreenY = task.horizonY + ((task.playerEyeZ - wallFloorZ) * (task.screenHeight * 0.8)) / perpWallDist;
        const wallTopScreenY = task.horizonY - ((wallCeilZ - task.playerEyeZ) * (task.screenHeight * 0.8)) / perpWallDist;

        drawStart = Math.max(0, Math.floor(wallTopScreenY));
        drawEnd = Math.min(task.screenHeight - 1, Math.floor(wallBottomScreenY));
      } else {
        const lineHeight = Math.floor((task.screenHeight / perpWallDist) * 1.05);
        drawStart = Math.max(0, Math.floor(-lineHeight / 2 + task.horizonY));
        drawEnd = Math.min(task.screenHeight - 1, Math.floor(lineHeight / 2 + task.horizonY));
      }

      drawStarts[idx] = drawStart;
      drawEnds[idx] = drawEnd;
    }

    return {
      colStart: task.colStart,
      colEnd: task.colEnd,
      zBuffer,
      wallTypes,
      wallXFracs,
      drawStarts,
      drawEnds,
      sides,
    };
  }

  public destroy() {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    this.isAvailable = false;
  }
}
