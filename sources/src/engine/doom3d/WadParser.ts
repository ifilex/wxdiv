import JSZip from "jszip";
import { LumpEntry, DoomMapData, DoomVertex, DoomSector, DoomSidedef, DoomLinedef, DoomThing } from "./types";

export class WadParser {
  public data: DataView;
  public header: { type: string; numLumps: number; dirOffset: number };
  public directory: LumpEntry[];
  public lumpIndex: Map<string, LumpEntry>;
  public palette: number[][] | null = null;
  public pnames: string[] | null = null;
  public textures: Map<string, any> | null = null;
  public cache: {
    patches: Map<string, any>;
    composites: Map<string, any>;
    flats: Map<string, any>;
    sounds: Map<string, AudioBuffer>;
  };

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
    this.header = this.readHeader();
    this.directory = [];
    this.lumpIndex = new Map();
    this.cache = {
      patches: new Map(),
      composites: new Map(),
      flats: new Map(),
      sounds: new Map(),
    };
    this.readDirectory();
  }

  private readHeader() {
    const type = this.readString(0, 4);
    const numLumps = this.data.getInt32(4, true);
    const dirOffset = this.data.getInt32(8, true);
    return { type, numLumps, dirOffset };
  }

  private readDirectory() {
    this.directory = [];
    this.lumpIndex.clear();
    for (let i = 0; i < this.header.numLumps; i++) {
      const offset = this.header.dirOffset + i * 16;
      if (offset + 16 > this.data.byteLength) break;
      const filePos = this.data.getInt32(offset, true);
      const size = this.data.getInt32(offset + 4, true);
      const name = this.readString(offset + 8, 8);
      const lump: LumpEntry = { name, filePos, size, index: i };
      this.directory.push(lump);
      this.lumpIndex.set(name, lump);
    }
  }

  public readString(offset: number, length: number): string {
    const bytes = new Uint8Array(this.data.buffer, this.data.byteOffset + offset, length);
    let end = bytes.indexOf(0);
    if (end === -1) end = length;
    const str = new TextDecoder().decode(bytes.subarray(0, end));
    return str.toUpperCase().trim();
  }

  public readStringFromData(data: DataView, offset: number, length: number): string {
    const bytes = new Uint8Array(data.buffer, data.byteOffset + offset, length);
    let end = bytes.indexOf(0);
    if (end === -1) end = length;
    const str = new TextDecoder().decode(bytes.subarray(0, end));
    return str.toUpperCase().trim();
  }

  public getLump(name: string): LumpEntry | null {
    if (!name) return null;
    return this.lumpIndex.get(name.toUpperCase()) || null;
  }

  public getLumpData(lump: LumpEntry | null): DataView | null {
    if (!lump) return null;
    if (lump.buffer) return new DataView(lump.buffer);
    return new DataView(this.data.buffer, this.data.byteOffset + lump.filePos, lump.size);
  }

  public mergeWad(pwad: WadParser) {
    this.mergeLumps(
      pwad.directory.map((l) => ({
        ...l,
        buffer: pwad
          .getLumpData(l)!
          .buffer.slice(
            pwad.getLumpData(l)!.byteOffset,
            pwad.getLumpData(l)!.byteOffset + pwad.getLumpData(l)!.byteLength
          ),
      }))
    );
  }

  public mergeLumps(lumps: LumpEntry[]) {
    const mapLumpPattern = /^(E\dM\d|MAP\d\d|THINGS|LINEDEFS|SIDEDEFS|VERTEXES|SEGS|SSECTORS|NODES|SECTORS|REJECT|BLOCKMAP|TEXTMAP|ENDMAP|SCRIPTS)$/;
    const textureOverwriteWhitelist = new Set(["PNAMES", "TEXTURE1", "TEXTURE2", "PLAYPAL", "COLORMAP"]);

    lumps.forEach((l) => {
      const name = l.name.toUpperCase();
      if (this.lumpIndex.has(name) && !mapLumpPattern.test(name)) {
        if (!textureOverwriteWhitelist.has(name)) {
          return;
        } else {
          const existing = this.lumpIndex.get(name)!;
          const replaceIdx = existing.index;
          const lumpClone = { ...l, index: replaceIdx };
          this.directory[replaceIdx] = lumpClone;
          this.lumpIndex.set(name, lumpClone);
          if (this.cache.patches.has(name)) this.cache.patches.delete(name);
          if (this.cache.composites.has(name)) this.cache.composites.delete(name);
          if (this.cache.flats.has(name)) this.cache.flats.delete(name);
          return;
        }
      }

      const lumpClone = { ...l, index: this.directory.length };
      this.directory.push(lumpClone);
      this.lumpIndex.set(name, lumpClone);
    });

    this.pnames = null;
    this.textures = null;
    this.cache.patches.clear();
    this.cache.composites.clear();
    this.cache.flats.clear();
    this.cache.sounds.clear();
  }

  public getMapNames(): string[] {
    const mapNamesSet = new Set<string>();
    for (let i = 0; i < this.directory.length - 1; i++) {
      const l = this.directory[i];
      const next = this.directory[i + 1]?.name;
      if (
        /^E\dM\d$/.test(l.name) ||
        /^MAP\d\d$/.test(l.name) ||
        next === "THINGS" ||
        next === "TEXTMAP"
      ) {
        mapNamesSet.add(l.name);
      }
    }
    return Array.from(mapNamesSet).sort();
  }

  public getMapLumps(mapName: string): Record<string, LumpEntry> | null {
    const mapLump = this.getLump(mapName);
    if (!mapLump) return null;

    const mapLumps: Record<string, LumpEntry> = { header: mapLump };
    const binaryLumpNames = [
      "THINGS",
      "LINEDEFS",
      "SIDEDEFS",
      "VERTEXES",
      "SEGS",
      "SSECTORS",
      "NODES",
      "SECTORS",
      "REJECT",
      "BLOCKMAP",
      "BEHAVIOR",
    ];
    const udmfLumpNames = ["TEXTMAP", "ZNODES", "ENDMAP", "SCRIPTS", "DIALOGUE"];

    for (let i = 1; i <= 500; i++) {
      const idx = mapLump.index + i;
      if (idx >= this.directory.length) break;
      const lump = this.directory[idx];

      if (/^E\dM\d$/.test(lump.name) || /^MAP\d\d$/.test(lump.name)) break;

      if (binaryLumpNames.includes(lump.name) || udmfLumpNames.includes(lump.name)) {
        mapLumps[lump.name] = lump;
        if (lump.name === "ENDMAP") break;
      }
    }
    return mapLumps;
  }

  public parseMap(mapName: string): DoomMapData | null {
    const lumps = this.getMapLumps(mapName);
    if (!lumps) return null;

    let mapData: DoomMapData | null = null;
    if (lumps.TEXTMAP) {
      mapData = this.parseUDMF(lumps.TEXTMAP);
    } else {
      const vertexes = this.parseVertexes(lumps.VERTEXES);
      const sectors = this.parseSectors(lumps.SECTORS);
      const sidedefs = this.parseSidedefs(lumps.SIDEDEFS);
      const linedefs = this.parseLinedefs(lumps.LINEDEFS, vertexes, sidedefs, sectors);
      const things = this.parseThings(lumps.THINGS);
      mapData = { vertexes, sectors, sidedefs, linedefs, things };
    }

    if (mapData && mapData.sectors && mapData.linedefs) {
      mapData.sectors.forEach((s) => (s.lines = []));
      mapData.linedefs.forEach((l) => {
        if (l.frontSector) l.frontSector.lines?.push(l);
        if (l.backSector) l.backSector.lines?.push(l);
      });
    }

    return mapData;
  }

  public parseUDMF(lump: LumpEntry): DoomMapData | null {
    const data = this.getLumpData(lump);
    if (!data) return null;
    const text = new TextDecoder().decode(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    );
    const textNoComments = text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");

    const things: any[] = [];
    const vertexes: DoomVertex[] = [];
    const linedefs: any[] = [];
    const sidedefs: any[] = [];
    const sectors: any[] = [];

    const tokens = textNoComments.match(
      /"[^"]*"|'[^']*'|[a-zA-Z_][a-zA-Z0-9_]*|[-+]?[0-9]*\.?[0-9]+|[{}=;]/g
    );
    if (!tokens) return null;

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i++];
      if (tokens[i] === "{") {
        const blockType = token.toLowerCase();
        i++;
        const block: Record<string, any> = {};
        while (i < tokens.length && tokens[i] !== "}") {
          const key = tokens[i++].toLowerCase();
          if (tokens[i] === "=") {
            i++;
            let val: any = tokens[i++];
            if (val.startsWith('"') || val.startsWith("'")) {
              val = val.slice(1, -1);
            } else {
              if (val === "true") val = true;
              else if (val === "false") val = false;
              else if (!isNaN(Number(val))) val = Number(val);
            }
            block[key] = val;
            if (tokens[i] === ";") i++;
          } else if (tokens[i] === ";") {
            i++;
          }
        }
        i++;

        if (blockType === "thing") things.push(block);
        else if (blockType === "vertex") vertexes.push({ x: Number(block.x), y: Number(block.y) });
        else if (blockType === "linedef") linedefs.push(block);
        else if (blockType === "sidedef") sidedefs.push(block);
        else if (blockType === "sector") sectors.push(block);
      }
    }

    const parsedSectors: DoomSector[] = sectors.map((s, idx) => ({
      floorHeight: s.heightfloor || 0,
      ceilingHeight: s.heightceiling || 0,
      floorTexture: (s.texturefloor || "FLOOR0_1").toUpperCase(),
      ceilingTexture: (s.textureceiling || "CEIL1_1").toUpperCase(),
      lightLevel: s.lightlevel || 160,
      type: s.special || 0,
      tag: s.id !== undefined ? s.id : s.tag !== undefined ? s.tag : 0,
      id: idx,
      floorplane_a: s.floorplane_a || 0,
      floorplane_b: s.floorplane_b || 0,
      floorplane_c: s.floorplane_c || 0,
      floorplane_d: s.floorplane_d || 0,
      ceilplane_a: s.ceilplane_a || 0,
      ceilplane_b: s.ceilplane_b || 0,
      ceilplane_c: s.ceilplane_c || 0,
      ceilplane_d: s.ceilplane_d || 0,
    }));

    const parsedSidedefs: DoomSidedef[] = sidedefs.map((s) => ({
      offsetX: s.offsetx || 0,
      offsetY: s.offsety || 0,
      upperTexture: (s.texturetop || "-").toUpperCase(),
      lowerTexture: (s.texturebottom || "-").toUpperCase(),
      middleTexture: (s.texturemiddle || "-").toUpperCase(),
      sectorId: s.sector,
    }));

    const parsedLinedefs: DoomLinedef[] = linedefs.map((l) => {
      const sideFront = parsedSidedefs[l.sidefront];
      const sideBack = l.sideback !== undefined ? parsedSidedefs[l.sideback] : null;
      const specialVal = l.special !== undefined ? l.special : l.specialtype !== undefined ? l.specialtype : 0;
      const tagVal = l.tag !== undefined ? l.tag : l.arg0 !== undefined ? l.arg0 : 0;

      return {
        v1: vertexes[l.v1],
        v2: vertexes[l.v2],
        flags: (l.blocking ? 1 : 0) | (l.twosided ? 4 : 0),
        specialType: specialVal,
        sectorTag: tagVal,
        udmfArgs: {
          arg0: l.arg0,
          arg1: l.arg1,
          arg2: l.arg2,
          arg3: l.arg3,
          arg4: l.arg4,
          tag: l.tag,
        },
        sideFront,
        sideBack,
        frontSector: sideFront ? parsedSectors[sideFront.sectorId] : null,
        backSector: sideBack ? parsedSectors[sideBack.sectorId] : null,
      };
    });

    const parsedThings: DoomThing[] = things.map((t) => ({
      x: t.x,
      y: t.y,
      angle: t.angle || 0,
      type: t.type || 0,
      flags: 7,
    }));

    return {
      vertexes,
      sectors: parsedSectors,
      sidedefs: parsedSidedefs,
      linedefs: parsedLinedefs,
      things: parsedThings,
    };
  }

  public parseVertexes(lump?: LumpEntry): DoomVertex[] {
    if (!lump) return [];
    const data = this.getLumpData(lump);
    if (!data) return [];
    const count = lump.size / 4;
    const vertexes: DoomVertex[] = [];
    for (let i = 0; i < count; i++) {
      vertexes.push({
        x: data.getInt16(i * 4, true),
        y: data.getInt16(i * 4 + 2, true),
      });
    }
    return vertexes;
  }

  public parseSectors(lump?: LumpEntry): DoomSector[] {
    if (!lump) return [];
    const data = this.getLumpData(lump);
    if (!data) return [];
    const count = Math.floor(lump.size / 26);
    const sectors: DoomSector[] = [];
    for (let i = 0; i < count; i++) {
      const off = i * 26;
      sectors.push({
        floorHeight: data.getInt16(off, true),
        ceilingHeight: data.getInt16(off + 2, true),
        floorTexture: this.readStringFromData(data, off + 4, 8),
        ceilingTexture: this.readStringFromData(data, off + 12, 8),
        lightLevel: data.getInt16(off + 20, true),
        type: data.getInt16(off + 22, true),
        tag: data.getInt16(off + 24, true),
        id: i,
      });
    }
    return sectors;
  }

  public parseSidedefs(lump?: LumpEntry): DoomSidedef[] {
    if (!lump) return [];
    const data = this.getLumpData(lump);
    if (!data) return [];
    const count = Math.floor(lump.size / 30);
    const sidedefs: DoomSidedef[] = [];
    for (let i = 0; i < count; i++) {
      const off = i * 30;
      sidedefs.push({
        offsetX: data.getInt16(off, true),
        offsetY: data.getInt16(off + 2, true),
        upperTexture: this.readStringFromData(data, off + 4, 8),
        lowerTexture: this.readStringFromData(data, off + 12, 8),
        middleTexture: this.readStringFromData(data, off + 20, 8),
        sectorId: data.getInt16(off + 28, true),
      });
    }
    return sidedefs;
  }

  public parseLinedefs(
    lump?: LumpEntry,
    vertexes: DoomVertex[] = [],
    sidedefs: DoomSidedef[] = [],
    sectors: DoomSector[] = []
  ): DoomLinedef[] {
    if (!lump) return [];
    const data = this.getLumpData(lump);
    if (!data) return [];
    const count = lump.size / 14;
    const linedefs: DoomLinedef[] = [];
    for (let i = 0; i < count; i++) {
      const off = i * 14;
      const v1Idx = data.getUint16(off, true);
      const v2Idx = data.getUint16(off + 2, true);
      const flags = data.getUint16(off + 4, true);
      const specialType = data.getUint16(off + 6, true);
      const sectorTag = data.getUint16(off + 8, true);
      const sideFrontIdx = data.getUint16(off + 10, true);
      const sideBackIdx = data.getUint16(off + 12, true);

      const sideFront = sideFrontIdx !== 0xffff ? sidedefs[sideFrontIdx] : null;
      const sideBack = sideBackIdx !== 0xffff ? sidedefs[sideBackIdx] : null;

      linedefs.push({
        v1: vertexes[v1Idx],
        v2: vertexes[v2Idx],
        flags,
        specialType,
        sectorTag,
        sideFront,
        sideBack,
        frontSector: sideFront ? sectors[sideFront.sectorId] : null,
        backSector: sideBack ? sectors[sideBack.sectorId] : null,
      });
    }
    return linedefs;
  }

  public parseThings(lump?: LumpEntry): DoomThing[] {
    if (!lump) return [];
    const data = this.getLumpData(lump);
    if (!data) return [];
    const count = lump.size / 10;
    const things: DoomThing[] = [];
    for (let i = 0; i < count; i++) {
      const off = i * 10;
      things.push({
        x: data.getInt16(off, true),
        y: data.getInt16(off + 2, true),
        angle: data.getInt16(off + 4, true),
        type: data.getInt16(off + 6, true),
        flags: data.getInt16(off + 8, true),
      });
    }
    return things;
  }

  public getPalette(): number[][] {
    if (this.palette) return this.palette;
    const lump = this.getLump("PLAYPAL");
    if (!lump) {
      // Default Doom palette generator if PLAYPAL missing
      const defPal: number[][] = [];
      for (let i = 0; i < 256; i++) {
        defPal.push([i, i, i]);
      }
      this.palette = defPal;
      return defPal;
    }
    const data = this.getLumpData(lump)!;
    const palette: number[][] = [];
    for (let i = 0; i < 256; i++) {
      palette.push([
        data.getUint8(i * 3),
        data.getUint8(i * 3 + 1),
        data.getUint8(i * 3 + 2),
      ]);
    }
    this.palette = palette;
    return palette;
  }

  public getFlat(name: string, palette: number[][]): { data: Uint8ClampedArray; width: number; height: number } | null {
    const cacheKey = `${name}_${palette.length}`;
    if (this.cache.flats.has(cacheKey)) return this.cache.flats.get(cacheKey)!;

    const lump = this.getLump(name);
    if (!lump) return null;

    const dv = this.getLumpData(lump);
    if (!dv) return null;
    const data = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);

    let w = 64;
    let h = 64;
    if (data.length === 1024) {
      w = 32;
      h = 32;
    } else if (data.length === 16384) {
      w = 128;
      h = 128;
    } else if (data.length === 65536) {
      w = 256;
      h = 256;
    } else if (data.length !== 4096) {
      const side = Math.sqrt(data.length);
      if (Number.isInteger(side)) {
        w = h = side;
      }
    }

    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length && i < w * h; i++) {
      const color = palette[data[i]];
      if (!color) continue;
      rgba[i * 4] = color[0];
      rgba[i * 4 + 1] = color[1];
      rgba[i * 4 + 2] = color[2];
      rgba[i * 4 + 3] = 255;
    }
    const result = { data: rgba, width: w, height: h };
    this.cache.flats.set(cacheKey, result);
    return result;
  }

  public loadPNames() {
    const lump = this.getLump("PNAMES");
    if (!lump) return;
    const data = this.getLumpData(lump);
    if (!data) return;
    const count = data.getInt32(0, true);
    this.pnames = [];
    for (let i = 0; i < count; i++) {
      this.pnames.push(this.readStringFromData(data, 4 + i * 8, 8));
    }
  }

  public loadTextures() {
    this.textures = new Map();
    ["TEXTURE1", "TEXTURE2"].forEach((lumpName) => {
      const lump = this.getLump(lumpName);
      if (!lump) return;
      const data = this.getLumpData(lump);
      if (!data) return;
      const numTex = data.getInt32(0, true);
      const offsets: number[] = [];
      for (let i = 0; i < numTex; i++) {
        offsets.push(data.getInt32(4 + i * 4, true));
      }

      offsets.forEach((offset) => {
        const name = this.readStringFromData(data, offset, 8);
        const width = data.getInt16(offset + 12, true);
        const height = data.getInt16(offset + 14, true);
        const patchCount = data.getInt16(offset + 20, true);
        const patches: any[] = [];
        for (let p = 0; p < patchCount; p++) {
          const pOff = offset + 22 + p * 10;
          patches.push({
            originX: data.getInt16(pOff, true),
            originY: data.getInt16(pOff + 2, true),
            patchIdx: data.getInt16(pOff + 4, true),
          });
        }
        this.textures!.set(name, { name, width, height, patches });
      });
    });
  }

  public getCompositeTexture(name: string, palette: number[][]): { data: Uint8ClampedArray; width: number; height: number } | null {
    const cacheKey = `${name}_${palette.length}`;
    if (this.cache.composites.has(cacheKey)) return this.cache.composites.get(cacheKey)!;

    if (!this.pnames) this.loadPNames();
    if (!this.textures) this.loadTextures();

    const texDef = this.textures ? this.textures.get(name) : null;
    if (!texDef) return null;

    const rgba = new Uint8ClampedArray(texDef.width * texDef.height * 4);
    texDef.patches.forEach((p: any) => {
      const patchName = this.pnames![p.patchIdx];
      const patch = this.getPatch(patchName, palette);
      if (!patch) return;

      for (let py = 0; py < patch.height; py++) {
        const destY = p.originY + py;
        if (destY < 0 || destY >= texDef.height) continue;
        for (let px = 0; px < patch.width; px++) {
          const destX = p.originX + px;
          if (destX < 0 || destX >= texDef.width) continue;

          const srcIdx = (py * patch.width + px) * 4;
          if (patch.data[srcIdx + 3] === 0) continue;

          const destIdx = (destY * texDef.width + destX) * 4;
          rgba[destIdx] = patch.data[srcIdx];
          rgba[destIdx + 1] = patch.data[srcIdx + 1];
          rgba[destIdx + 2] = patch.data[srcIdx + 2];
          rgba[destIdx + 3] = 255;
        }
      }
    });
    const result = { data: rgba, width: texDef.width, height: texDef.height };
    this.cache.composites.set(cacheKey, result);
    return result;
  }

  public getPatch(name: string, palette: number[][]): { data: Uint8ClampedArray; width: number; height: number } | null {
    const cacheKey = `${name}_${palette.length}`;
    if (this.cache.patches.has(cacheKey)) return this.cache.patches.get(cacheKey)!;

    const lump = this.getLump(name);
    if (!lump) return null;
    const data = this.getLumpData(lump);
    if (!data || data.byteLength < 8) return null;

    try {
      const width = data.getUint16(0, true);
      const height = data.getUint16(2, true);
      if (width <= 0 || height <= 0 || width > 2048 || height > 2048) return null;

      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = 0;

      const columnOffsets: number[] = [];
      for (let i = 0; i < width; i++) {
        columnOffsets.push(data.getUint32(8 + i * 4, true));
      }

      for (let x = 0; x < width; x++) {
        let offset = columnOffsets[x];
        while (offset < data.byteLength) {
          const rowStart = data.getUint8(offset);
          if (rowStart === 255) break;

          const pixelCount = data.getUint8(offset + 1);
          offset += 3;

          for (let i = 0; i < pixelCount; i++) {
            if (offset + i >= data.byteLength) break;
            const colorIdx = data.getUint8(offset + i);
            const color = palette[colorIdx];
            const y = rowStart + i;
            if (y < height && color) {
              const idx = (y * width + x) * 4;
              rgba[idx] = color[0];
              rgba[idx + 1] = color[1];
              rgba[idx + 2] = color[2];
              rgba[idx + 3] = 255;
            }
          }
          offset += pixelCount + 1;
        }
      }
      const result = { data: rgba, width, height };
      this.cache.patches.set(cacheKey, result);
      return result;
    } catch (_) {
      return null;
    }
  }

  public getSound(name: string, audioCtx: AudioContext): AudioBuffer | null {
    const cacheKey = name.toUpperCase();
    if (this.cache.sounds.has(cacheKey)) return this.cache.sounds.get(cacheKey)!;

    const lump = this.getLump("DS" + cacheKey);
    if (!lump) return null;
    const data = this.getLumpData(lump);
    if (!data || data.byteLength < 8) return null;

    const signature = data.getUint16(0, true);
    if (signature === 3) {
      const sampleRate = data.getUint16(2, true);
      const sampleCount = data.getUint32(4, true);
      const samples = new Uint8Array(
        data.buffer,
        data.byteOffset + 8,
        Math.min(sampleCount, data.byteLength - 8)
      );

      const buffer = audioCtx.createBuffer(1, samples.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = (samples[i] - 128) / 128;
      }
      this.cache.sounds.set(cacheKey, buffer);
      return buffer;
    }
    return null;
  }

  public getAllLumpsWithName(name: string): LumpEntry[] {
    return this.directory.filter((l) => l.name === name.toUpperCase());
  }
}

export class Pk3Parser {
  public zip: JSZip | null = null;
  public files: Map<string, ArrayBuffer> = new Map();

  async load(buffer: ArrayBuffer) {
    this.zip = await JSZip.loadAsync(buffer);
    const promises: Promise<void>[] = [];
    this.zip.forEach((relativePath, file) => {
      if (!file.dir) {
        promises.push(
          file.async("arraybuffer").then((data) => {
            this.files.set(relativePath.toUpperCase(), data);
          })
        );
      }
    });
    await Promise.all(promises);
  }

  getEmbeddedWads(): WadParser[] {
    const wads: WadParser[] = [];
    for (const [path, buffer] of this.files.entries()) {
      if (path.endsWith(".WAD")) {
        wads.push(new WadParser(buffer));
      }
    }
    return wads;
  }

  getVirtualLumps(): LumpEntry[] {
    const lumps: LumpEntry[] = [];
    for (const [path, buffer] of this.files.entries()) {
      const parts = path.split("/");
      const filename = parts[parts.length - 1];
      const name = filename.split(".")[0].toUpperCase().substring(0, 8);
      if (name && !path.endsWith(".WAD")) {
        lumps.push({ name, buffer, size: buffer.byteLength, filePos: 0, index: 0 });
      }
    }
    return lumps;
  }
}
