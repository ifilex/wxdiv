import React, { useState, useRef, useEffect } from "react";
import {
  Compass,
  DoorOpen,
  Eye,
  Flame,
  Grid,
  Key,
  Layers,
  Maximize2,
  Package,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  ToggleLeft,
  Trash2,
  Undo2,
  Wand2,
  FileCode,
  Crosshair,
  ShieldAlert,
  Save,
  Download,
} from "lucide-react";
import { DivGraphic, DivMode8Door, DivMode8Entity, DivMode8Trigger } from "../types";
import { DivRuntime } from "../engine/runtime";

interface Mode8LevelEditorProps {
  runtime: DivRuntime;
  fpg: DivGraphic[];
  onInsertCode: (snippet: string) => void;
  onApplyToRuntime?: () => void;
}

type Mode8Tool = "pencil" | "rect" | "bucket" | "eraser" | "select";
type Mode8Category = "walls" | "doors" | "triggers" | "entities" | "player";

interface TileDef {
  id: number;
  name: string;
  category: Mode8Category;
  color: string;
  border?: string;
  graphId?: number;
}

const PALETTE_TILES: TileDef[] = [
  // Walls
  { id: 25, name: "Ladrillo Rojo", category: "walls", color: "#b91c1c", graphId: 25 },
  { id: 26, name: "Piedra Musgosa", category: "walls", color: "#15803d", graphId: 26 },
  { id: 33, name: "Cyber Tech", category: "walls", color: "#4338ca", graphId: 33 },
  { id: 38, name: "Acero / Hierro", category: "walls", color: "#334155", graphId: 38 },
  // Doors
  { id: 31, name: "Puerta Deslizante", category: "doors", color: "#0284c7", graphId: 31 },
  // Triggers & Switches
  { id: 32, name: "Interruptor Pared", category: "triggers", color: "#d97706", graphId: 32 },
  { id: 37, name: "Sensor Suelo", category: "triggers", color: "#7c3aed", graphId: 37 },
  // Entities & Pickups
  { id: 34, name: "Llave de Oro", category: "entities", color: "#facc15", graphId: 34 },
  { id: 35, name: "Botiquín Médico", category: "entities", color: "#ef4444", graphId: 35 },
  { id: 36, name: "Caja Munición", category: "entities", color: "#3b82f6", graphId: 36 },
  { id: 28, name: "Antorcha Pared", category: "entities", color: "#f97316", graphId: 28 },
  { id: 29, name: "Barril Madera", category: "entities", color: "#78350f", graphId: 29 },
  { id: 27, name: "Demonio Slime", category: "entities", color: "#10b981", graphId: 27 },
  { id: 19, name: "Tesoro Sagrado", category: "entities", color: "#eab308", graphId: 19 },
];

export const Mode8LevelEditor: React.FC<Mode8LevelEditorProps> = ({
  runtime,
  fpg,
  onInsertCode,
}) => {
  const [mapWidth, setMapWidth] = useState<number>(16);
  const [mapHeight, setMapHeight] = useState<number>(16);
  const [activeTool, setActiveTool] = useState<Mode8Tool>("pencil");
  const [selectedTile, setSelectedTile] = useState<TileDef>(PALETTE_TILES[0]);
  const [activeCategory, setActiveCategory] = useState<Mode8Category>("walls");

  // Level grid data
  const [map, setMap] = useState<number[][]>(() => {
    const initial = runtime.m8[0]?.map;
    if (initial && initial.length > 0) {
      return initial.map((row) => [...row]);
    }
    const defaultGrid: number[][] = [];
    for (let y = 0; y < 16; y++) {
      const row: number[] = [];
      for (let x = 0; x < 16; x++) {
        row.push(x === 0 || x === 15 || y === 0 || y === 15 ? 25 : 0);
      }
      defaultGrid.push(row);
    }
    return defaultGrid;
  });

  // Doors, Triggers, Entities
  const [doors, setDoors] = useState<DivMode8Door[]>(() => {
    return (
      runtime.m8[0]?.doors?.map((d) => ({ ...d })) || [
        { id: 1, x: 8, y: 5, state: "closed", openAmount: 0, autoCloseTimer: 0, texture: 31 },
      ]
    );
  });

  const [triggers, setTriggers] = useState<DivMode8Trigger[]>(() => {
    return (
      runtime.m8[0]?.triggers?.map((t) => ({ ...t })) || [
        { id: 1, x: 7, y: 5, type: "sensor", targetDoorId: 1, activated: false },
        { id: 2, x: 8, y: 7, type: "switch", targetDoorId: 1, activated: false },
      ]
    );
  });

  const [entities, setEntities] = useState<DivMode8Entity[]>(() => {
    return (
      runtime.m8[0]?.entities?.map((e) => ({ ...e })) || [
        { id: 1, x: 4 * 64, y: 4 * 64, graph: 34, type: "key" },
        { id: 2, x: 10 * 64, y: 10 * 64, graph: 35, type: "medikit" },
        { id: 3, x: 12 * 64, y: 4 * 64, graph: 36, type: "ammo" },
      ]
    );
  });

  // Player start pose
  const [playerStart, setPlayerStart] = useState<{ x: number; y: number; angle: number }>({
    x: runtime.m8[0]?.x || 3.5,
    y: runtime.m8[0]?.y || 3.5,
    angle: runtime.m8[0]?.angle || 0,
  });

  // Selection & drag state
  const [isPainting, setIsPainting] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState<number>(28); // Cell size in px
  const [showPreview3D, setShowPreview3D] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preview3dRef = useRef<HTMLCanvasElement>(null);

  // Sync back to live runtime whenever user edits the level
  const syncToRuntime = () => {
    runtime.setMode8Map(
      map.map((r) => [...r]),
      doors.map((d) => ({ ...d })),
      triggers.map((t) => ({ ...t })),
      entities.map((e) => ({ ...e }))
    );
  };

  // Render 2D Grid Canvas
  useEffect(() => {
    renderCanvas();
    syncToRuntime();
  }, [map, doors, triggers, entities, playerStart, zoom, selectedCell, hoverCell]);

  // Mini 3D Raycaster preview loop
  useEffect(() => {
    if (!showPreview3D) return;
    let animId: number;

    const renderMini3D = () => {
      const canvas = preview3dRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const halfH = Math.floor(h / 2);

      // Sky & Floor
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, halfH);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, halfH, w, halfH);

      // Camera coordinates (from player start or live camera)
      const posX = playerStart.x;
      const posY = playerStart.y;
      const dirRad = ((playerStart.angle || 0) * Math.PI) / 180;
      const dirX = Math.cos(dirRad);
      const dirY = Math.sin(dirRad);
      const planeLength = 0.66;
      const planeX = -dirY * planeLength;
      const planeY = dirX * planeLength;

      const colW = 2;
      const numCols = Math.ceil(w / colW);
      const zBuf = new Float32Array(numCols);

      for (let c = 0; c < numCols; c++) {
        const camX = (2 * c) / numCols - 1;
        const rayDirX = dirX + planeX * camX;
        const rayDirY = dirY + planeY * camX;

        let mapX = Math.floor(posX);
        let mapY = Math.floor(posY);

        const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
        const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

        let stepX = rayDirX < 0 ? -1 : 1;
        let sideDistX = rayDirX < 0 ? (posX - mapX) * deltaDistX : (mapX + 1.0 - posX) * deltaDistX;
        let stepY = rayDirY < 0 ? -1 : 1;
        let sideDistY = rayDirY < 0 ? (posY - mapY) * deltaDistY : (mapY + 1.0 - posY) * deltaDistY;

        let hit = 0;
        let side = 0;
        let wallType = 25;
        let steps = 0;
        let perpDist = 0;
        let wallX = 0;

        while (hit === 0 && steps < 24) {
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

          if (mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
            hit = 1;
            perpDist = side === 0 ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6) : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
            break;
          }

          // Door check
          const door = doors.find((d) => d.x === mapX && d.y === mapY);
          if (door) {
            const halfDist = side === 0 ? sideDistX - deltaDistX * 0.5 : sideDistY - deltaDistY * 0.5;
            const hitC = side === 0 ? posY + halfDist * rayDirY : posX + halfDist * rayDirX;
            const cellFrac = hitC - Math.floor(hitC);
            if (cellFrac < 1.0 - door.openAmount) {
              hit = 1;
              perpDist = halfDist;
              wallX = cellFrac + door.openAmount;
              wallType = door.texture || 31;
              break;
            }
          }

          if (map[mapY]?.[mapX] > 0) {
            hit = 1;
            wallType = map[mapY][mapX];
            perpDist = side === 0 ? (mapX - posX + (1 - stepX) / 2) / (rayDirX || 1e-6) : (mapY - posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
            wallX = side === 0 ? posY + perpDist * rayDirY : posX + perpDist * rayDirX;
            wallX -= Math.floor(wallX);
            break;
          }
        }

        perpDist = Math.max(0.1, perpDist);
        zBuf[c] = perpDist;
        const lineH = Math.floor((h / perpDist) * 1.05);
        const dStart = Math.max(0, Math.floor(-lineH / 2 + halfH));
        const dEnd = Math.min(h - 1, Math.floor(lineH / 2 + halfH));

        // Draw textured wall column
        const g = runtime.getGraphic(wallType);
        if (g && g.canvas) {
          const tx = Math.floor(wallX * g.width);
          ctx.drawImage(g.canvas, tx, 0, 1, g.height, c * colW, dStart, colW, dEnd - dStart);
          const fog = Math.min(0.85, perpDist / 10);
          const shade = side === 1 ? 0.25 + fog * 0.75 : fog;
          if (shade > 0.05) {
            ctx.fillStyle = `rgba(2, 6, 23, ${shade})`;
            ctx.fillRect(c * colW, dStart, colW, dEnd - dStart);
          }
        } else {
          ctx.fillStyle = side === 1 ? "#991b1b" : "#dc2626";
          ctx.fillRect(c * colW, dStart, colW, dEnd - dStart);
        }
      }

      // Compass indicator
      ctx.fillStyle = "#38bdf8";
      ctx.font = "10px monospace";
      ctx.fillText(`${Math.round(playerStart.angle)}°`, 10, 18);

      animId = requestAnimationFrame(renderMini3D);
    };

    animId = requestAnimationFrame(renderMini3D);
    return () => cancelAnimationFrame(animId);
  }, [map, doors, triggers, entities, playerStart, showPreview3D]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = mapWidth * zoom;
    canvas.height = mapHeight * zoom;

    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Grid background cells
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const px = x * zoom;
        const py = y * zoom;

        // Floor checkerboard
        ctx.fillStyle = (x + y) % 2 === 0 ? "#111a2e" : "#0d1527";
        ctx.fillRect(px, py, zoom, zoom);

        const val = map[y]?.[x] || 0;
        if (val > 0) {
          // Draw wall texture preview
          const g = runtime.getGraphic(val);
          if (g && g.canvas) {
            ctx.drawImage(g.canvas, px, py, zoom, zoom);
          } else {
            ctx.fillStyle = val === 26 ? "#15803d" : "#b91c1c";
            ctx.fillRect(px, py, zoom, zoom);
          }
          // Border outline
          ctx.strokeStyle = "#00000044";
          ctx.strokeRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1);
        }
      }
    }

    // 2. Doors layer
    for (const d of doors) {
      const px = d.x * zoom;
      const py = d.y * zoom;
      ctx.fillStyle = "#0284c7bb";
      ctx.fillRect(px + 2, py + 2, zoom - 4, zoom - 4);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, zoom - 4, zoom - 4);

      // Door Icon / ID
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`D${d.id}`, px + zoom / 2, py + zoom / 2);
    }

    // 3. Triggers & Sensors layer
    for (const tr of triggers) {
      const px = tr.x * zoom;
      const py = tr.y * zoom;
      const isSensor = tr.type === "sensor";
      ctx.fillStyle = isSensor ? "#7c3aed99" : "#d9770699";
      ctx.beginPath();
      ctx.arc(px + zoom / 2, py + zoom / 2, zoom * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSensor ? "#a855f7" : "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Connector line to linked door
      if (tr.targetDoorId) {
        const linkedDoor = doors.find((d) => d.id === tr.targetDoorId);
        if (linkedDoor) {
          ctx.strokeStyle = isSensor ? "#c084fc66" : "#fbbf2466";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px + zoom / 2, py + zoom / 2);
          ctx.lineTo(linkedDoor.x * zoom + zoom / 2, linkedDoor.y * zoom + zoom / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.fillText(isSensor ? "S" : "SW", px + zoom / 2, py + zoom / 2);
    }

    // 4. Placed entities layer (keys, medikits, ammo, barrels, monsters)
    for (const ent of entities) {
      const gx = (ent.x / 64) * zoom;
      const gy = (ent.y / 64) * zoom;
      const g = runtime.getGraphic(ent.graph);
      const iconSize = zoom * 0.75;
      if (g && g.canvas) {
        ctx.drawImage(g.canvas, gx - iconSize / 2, gy - iconSize / 2, iconSize, iconSize);
      } else {
        ctx.fillStyle = ent.type === "key" ? "#facc15" : ent.type === "medikit" ? "#ef4444" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(gx, gy, zoom * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Player start position & direction cone
    const ppx = playerStart.x * zoom;
    const ppy = playerStart.y * zoom;
    const pDirRad = ((playerStart.angle || 0) * Math.PI) / 180;

    // Vision cone
    ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.arc(ppx, ppy, zoom * 2.2, pDirRad - 0.58, pDirRad + 0.58);
    ctx.closePath();
    ctx.fill();

    // Direction line
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(ppx + Math.cos(pDirRad) * (zoom * 0.9), ppy + Math.sin(pDirRad) * (zoom * 0.9));
    ctx.stroke();

    // Player marker
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(ppx, ppy, zoom * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Grid overlay
    ctx.strokeStyle = "#1e293b66";
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom, 0);
      ctx.lineTo(x * zoom, mapHeight * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= mapHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom);
      ctx.lineTo(mapWidth * zoom, y * zoom);
      ctx.stroke();
    }

    // 7. Hover cell cursor
    if (hoverCell) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(hoverCell.x * zoom, hoverCell.y * zoom, zoom, zoom);
    }

    // 8. Selected cell highlight
    if (selectedCell) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(selectedCell.x * zoom, selectedCell.y * zoom, zoom, zoom);
    }
  };

  // Mouse handler for drawing and placing elements
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    applyToolAtMouse(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / zoom);
    const cy = Math.floor((e.clientY - rect.top) / zoom);

    if (cx >= 0 && cx < mapWidth && cy >= 0 && cy < mapHeight) {
      setHoverCell({ x: cx, y: cy });
    } else {
      setHoverCell(null);
    }

    if (isPainting) {
      applyToolAtMouse(e);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPainting(false);
  };

  const applyToolAtMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / zoom);
    const cy = Math.floor((e.clientY - rect.top) / zoom);

    if (cx < 0 || cx >= mapWidth || cy < 0 || cy >= mapHeight) return;

    setSelectedCell({ x: cx, y: cy });

    if (activeTool === "select") {
      return;
    }

    if (activeTool === "eraser") {
      // Clear wall and any door/trigger/entity at this cell
      setMap((prev) => {
        const next = prev.map((r) => [...r]);
        next[cy][cx] = 0;
        return next;
      });
      setDoors((prev) => prev.filter((d) => d.x !== cx || d.y !== cy));
      setTriggers((prev) => prev.filter((t) => t.x !== cx || t.y !== cy));
      setEntities((prev) => prev.filter((ent) => Math.floor(ent.x / 64) !== cx || Math.floor(ent.y / 64) !== cy));
      return;
    }

    if (activeCategory === "walls") {
      setMap((prev) => {
        const next = prev.map((r) => [...r]);
        next[cy][cx] = selectedTile.id;
        return next;
      });
      // Remove door if wall replaces it
      setDoors((prev) => prev.filter((d) => d.x !== cx || d.y !== cy));
    } else if (activeCategory === "doors") {
      // Place door
      setMap((prev) => {
        const next = prev.map((r) => [...r]);
        next[cy][cx] = 0; // Doors have empty wall space behind them
        return next;
      });
      const newId = (doors.length > 0 ? Math.max(...doors.map((d) => d.id)) : 0) + 1;
      setDoors((prev) => {
        const filtered = prev.filter((d) => d.x !== cx || d.y !== cy);
        return [
          ...filtered,
          { id: newId, x: cx, y: cy, state: "closed", openAmount: 0, autoCloseTimer: 0, texture: selectedTile.id },
        ];
      });
    } else if (activeCategory === "triggers") {
      const isSensor = selectedTile.id === 37;
      const targetDoorId = doors[0]?.id || 1;
      const newTrigId = (triggers.length > 0 ? Math.max(...triggers.map((t) => t.id)) : 0) + 1;
      setTriggers((prev) => {
        const filtered = prev.filter((t) => t.x !== cx || t.y !== cy);
        return [
          ...filtered,
          {
            id: newTrigId,
            x: cx,
            y: cy,
            type: isSensor ? "sensor" : "switch",
            targetDoorId,
            activated: false,
          },
        ];
      });
    } else if (activeCategory === "entities") {
      const typeStr =
        selectedTile.id === 34 ? "key" : selectedTile.id === 35 ? "medikit" : selectedTile.id === 36 ? "ammo" : "prop";
      const newEntId = (entities.length > 0 ? Math.max(...entities.map((e) => e.id)) : 0) + 1;
      setEntities((prev) => [
        ...prev,
        {
          id: newEntId,
          x: cx * 64 + 32,
          y: cy * 64 + 32,
          graph: selectedTile.graphId || 34,
          type: typeStr as any,
        },
      ]);
    } else if (activeCategory === "player") {
      setPlayerStart((prev) => ({
        ...prev,
        x: cx + 0.5,
        y: cy + 0.5,
      }));
    }
  };

  // Pre-configured room layouts
  const applyPresetLayout = (type: "arena" | "doom" | "boss") => {
    const newMap: number[][] = [];
    for (let y = 0; y < 16; y++) {
      const row: number[] = [];
      for (let x = 0; x < 16; x++) {
        // Outer boundary walls
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          row.push(type === "doom" ? 33 : 25);
        } else if (type === "arena" && (x === 5 || x === 10) && y >= 4 && y <= 11) {
          row.push(26);
        } else if (type === "doom" && (y === 7 || y === 8) && x >= 3 && x <= 12 && x !== 7 && x !== 8) {
          row.push(38);
        } else if (type === "boss" && ((x === 4 && y === 4) || (x === 11 && y === 4) || (x === 4 && y === 11) || (x === 11 && y === 11))) {
          row.push(26);
        } else {
          row.push(0);
        }
      }
      newMap.push(row);
    }
    setMap(newMap);

    // Setup corresponding doors and entities
    if (type === "doom") {
      setDoors([{ id: 1, x: 7, y: 7, state: "closed", openAmount: 0, autoCloseTimer: 0, texture: 31 }]);
      setTriggers([{ id: 1, x: 6, y: 7, type: "sensor", targetDoorId: 1, activated: false }]);
      setEntities([
        { id: 1, x: 2 * 64, y: 2 * 64, graph: 34, type: "key" },
        { id: 2, x: 8 * 64, y: 12 * 64, graph: 35, type: "medikit" },
        { id: 3, x: 12 * 64, y: 12 * 64, graph: 36, type: "ammo" },
      ]);
    }
  };

  // Generate DIV Code from this level
  const generateDivCode = () => {
    const mapStr = map.map((row) => "    [" + row.join(", ") + "]").join(",\n");
    const snippet = `// ==========================================
// MAPA 3D MODO 8 GENERADO CON EL EDITOR
// ==========================================
GLOBAL
  m8_map[${mapHeight}][${mapWidth}] = [
${mapStr}
  ];

PROCESS cargar_nivel_modo8()
BEGIN
  // Inicializar motor Raycaster Modo 8
  start_mode8(0, 0, 25, 0, 0, 0);

  // Cargar puertas interactivas
${doors.map((d) => `  // Puerta #${d.id} en (${d.x}, ${d.y})\n  // Usar: open_mode8_door(${d.id})`).join("\n")}

  // Posicionar jugador
  m8[0].x = ${playerStart.x.toFixed(1)};
  m8[0].y = ${playerStart.y.toFixed(1)};
  m8[0].angle = ${Math.round(playerStart.angle)};
END;`;

    onInsertCode(snippet);
  };

  // Selected cell data
  const selectedDoor = selectedCell ? doors.find((d) => d.x === selectedCell.x && d.y === selectedCell.y) : null;
  const selectedTrigger = selectedCell ? triggers.find((t) => t.x === selectedCell.x && t.y === selectedCell.y) : null;
  const selectedWall = selectedCell ? map[selectedCell.y]?.[selectedCell.x] : 0;

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-200 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-[#0b1222] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
              <span>EDITOR DE NIVELES MODO 8</span>
              <span className="text-[10px] text-cyan-400 font-normal px-1 rounded bg-cyan-950/60 border border-cyan-800/40">
                DOOM & DIV 2
              </span>
            </h2>
            <span className="text-[10px] text-slate-400">
              Laberinto 3D con puertas deslizantes, sensores, interruptores y sprites
            </span>
          </div>
        </div>

        {/* Preset layouts & Quick actions */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Plantilla:</span>
          <button
            onClick={() => applyPresetLayout("doom")}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded text-[11px] font-mono"
            title="Estructura estilo Doom con puertas y sensores"
          >
            Base Doom
          </button>
          <button
            onClick={() => applyPresetLayout("arena")}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[11px] font-mono"
            title="Arena de combate con pilares"
          >
            Arena
          </button>
          <button
            onClick={() => applyPresetLayout("boss")}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded text-[11px] font-mono"
            title="Cámara de jefe"
          >
            Jefe
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Insert into DIV Code */}
          <button
            onClick={generateDivCode}
            className="px-2.5 py-1 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-600/60 text-cyan-200 rounded font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
            title="Generar e insertar el mapa en el código del juego"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Insertar en Código</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Palette & Categories */}
        <div className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col p-2 gap-3 overflow-y-auto">
          {/* Tool Selector */}
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-1.5 block">
              Herramienta
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTool("pencil")}
                className={`p-1.5 rounded text-xs flex items-center justify-center gap-1 border transition-all ${
                  activeTool === "pencil"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Pintar elemento seleccionado"
              >
                <span>Pincel</span>
              </button>
              <button
                onClick={() => setActiveTool("eraser")}
                className={`p-1.5 rounded text-xs flex items-center justify-center gap-1 border transition-all ${
                  activeTool === "eraser"
                    ? "bg-rose-950 border-rose-500 text-rose-300 font-semibold"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Borrar elemento"
              >
                <span>Borrar</span>
              </button>
              <button
                onClick={() => setActiveTool("select")}
                className={`p-1.5 rounded text-xs flex items-center justify-center gap-1 border transition-all ${
                  activeTool === "select"
                    ? "bg-amber-950 border-amber-500 text-amber-300 font-semibold"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Inspeccionar celda"
              >
                <span>Seleccionar</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-1.5 block">
              Categoría
            </span>
            <div className="flex flex-wrap gap-1">
              {(["walls", "doors", "triggers", "entities", "player"] as Mode8Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition-all border ${
                    activeCategory === cat
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-medium"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat === "walls"
                    ? "Paredes"
                    : cat === "doors"
                    ? "Puertas"
                    : cat === "triggers"
                    ? "Dispositivos"
                    : cat === "entities"
                    ? "Pickups/Props"
                    : "Jugador"}
                </button>
              ))}
            </div>
          </div>

          {/* Category Palette Tiles */}
          <div className="flex-1">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono mb-1.5 block">
              Elementos Disponibles
            </span>
            <div className="space-y-1">
              {PALETTE_TILES.filter((t) => t.category === activeCategory).map((tile) => {
                const isSelected = selectedTile.id === tile.id && activeCategory === tile.category;
                return (
                  <button
                    key={tile.id}
                    onClick={() => {
                      setSelectedTile(tile);
                      setActiveTool("pencil");
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center gap-2 border transition-all text-left ${
                      isSelected
                        ? "bg-cyan-950/90 border-cyan-500 text-white font-medium"
                        : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-sm border border-black/40 flex-shrink-0"
                      style={{ backgroundColor: tile.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{tile.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">ID: {tile.id}</div>
                    </div>
                  </button>
                );
              })}

              {activeCategory === "player" && (
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800 space-y-2">
                  <div className="text-xs text-cyan-300 font-medium">Orientación del Jugador</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Ángulo:</span>
                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={playerStart.angle}
                      onChange={(e) =>
                        setPlayerStart((prev) => ({ ...prev, angle: Number(e.target.value) }))
                      }
                      className="flex-1 accent-cyan-500 h-1 bg-slate-800 rounded"
                    />
                    <span className="text-xs font-mono text-slate-200">{playerStart.angle}°</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Haz clic en el mapa para situar la posición inicial del jugador.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inspector Panel */}
          {selectedCell && (
            <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-1.5">
              <div className="font-mono text-cyan-300 font-semibold text-[11px] flex justify-between">
                <span>CELDA ({selectedCell.x}, {selectedCell.y})</span>
                <span className="text-slate-400 text-[10px]">
                  {selectedWall > 0 ? `Pared #${selectedWall}` : "Suelo libre"}
                </span>
              </div>

              {selectedDoor && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="text-amber-300 text-[10px] font-bold font-mono">PUERTA #{selectedDoor.id}</div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Estado:</span>
                    <span className="font-mono text-cyan-300">{selectedDoor.state}</span>
                  </div>
                  <button
                    onClick={() => runtime.toggleMode8Door(selectedDoor.id)}
                    className="w-full py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded text-[10px] font-mono"
                  >
                    Probar Abrir/Cerrar
                  </button>
                </div>
              )}

              {selectedTrigger && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="text-purple-300 text-[10px] font-bold font-mono">
                    DISPOSITIVO ({selectedTrigger.type.toUpperCase()})
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Abre Puerta ID:</span>
                    <input
                      type="number"
                      value={selectedTrigger.targetDoorId || 1}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTriggers((prev) =>
                          prev.map((t) => (t.id === selectedTrigger.id ? { ...t, targetDoorId: val } : t))
                        );
                      }}
                      className="w-12 px-1 bg-slate-950 border border-slate-700 rounded text-right font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: 2D Level Grid */}
        <div className="flex-1 flex flex-col bg-[#050811] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-800/80 bg-[#070b16] flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span>Cuadrícula: {mapWidth}x{mapHeight}</span>
              {hoverCell && (
                <span className="text-cyan-400">
                  Cursor: ({hoverCell.x}, {hoverCell.y})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Zoom:</span>
              <button
                onClick={() => setZoom(Math.max(16, zoom - 4))}
                className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-white"
              >
                -
              </button>
              <span className="w-8 text-center">{zoom}px</span>
              <button
                onClick={() => setZoom(Math.min(48, zoom + 4))}
                className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-white"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div className="relative shadow-2xl rounded border border-slate-800">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="cursor-crosshair block"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Live Mini 3D Preview (Raycaster) */}
        <div className="w-72 bg-[#090e1c] border-l border-slate-800/80 flex flex-col p-2 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>VISTA PREVIA 3D EN VIVO</span>
            </span>
            <button
              onClick={() => setShowPreview3D(!showPreview3D)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              {showPreview3D ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {showPreview3D && (
            <div className="space-y-2">
              <div className="relative rounded overflow-hidden border border-slate-800 aspect-[4/3] bg-black shadow-inner">
                <canvas
                  ref={preview3dRef}
                  width={280}
                  height={210}
                  className="w-full h-full object-cover block"
                />
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-cyan-400 border border-cyan-800/40 text-[9px] font-mono">
                  DDA RAYCASTER
                </div>
              </div>

              <div className="p-2 bg-slate-900/60 rounded border border-slate-800 text-[11px] space-y-1">
                <div className="text-slate-300 font-semibold">Controles en Modo 8:</div>
                <div className="text-slate-400 text-[10px] space-y-0.5 font-mono">
                  <div>• [W, A, S, D] o Flechas: Moverse</div>
                  <div>• [E]: Abrir Puertas / Interruptor</div>
                  <div>• [Espacio] / Ratón: Disparo Plasma</div>
                  <div>• Acércate a llaves y botiquines para recogerlos</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="p-2 bg-slate-900/40 rounded border border-slate-800/60 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Puertas totales:</span>
                  <span className="text-cyan-400 font-bold">{doors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sensores e interruptores:</span>
                  <span className="text-purple-400 font-bold">{triggers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items colocados:</span>
                  <span className="text-amber-400 font-bold">{entities.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
