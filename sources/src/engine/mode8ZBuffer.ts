/**
 * WXDIV 3.0 — Advanced 3D Z-Buffer & 5-Plane Frustum Clipping Engine
 * Provides precision depth buffering (1/Z linear screen-space interpolation),
 * Sutherland–Hodgman 5-plane camera-space frustum clipping (Near, Left, Right,
 * Top, Bottom), and column occlusion bounds to eliminate Z-fighting, overlaps,
 * wall bleeding, and near-plane perspective distortion.
 */

export interface ClipVertex3D {
  /** Camera-space X (right) */
  x: number;
  /** Camera-space Y (up) */
  y: number;
  /** Camera-space Z (forward depth > 0) */
  z: number;
  /** Texture U coordinate */
  u: number;
  /** Texture V coordinate */
  v: number;
  /** Shade/light scalar 0..1 */
  light?: number;
}

export interface FrustumParams {
  zNear: number;
  zFar: number;
  /** Horizontal tangent (halfWidth / focalLength) */
  tanHalfH: number;
  /** Vertical tangent (halfHeight / focalLength) */
  tanHalfV: number;
}

export class ZBufferManager {
  public width: number;
  public height: number;
  /** Stores 1/Z depth values (larger = closer). 0 means sky / infinitely far. */
  public invZ: Float32Array;
  /** Fast per-column minimum & maximum valid Y clipping window for Doom portals */
  public upperClip: Int16Array;
  public lowerClip: Int16Array;

  constructor(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.invZ = new Float32Array(this.width * this.height);
    this.upperClip = new Int16Array(this.width);
    this.lowerClip = new Int16Array(this.width);
    this.resetFrame();
  }

  public resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.invZ = new Float32Array(w * h);
    this.upperClip = new Int16Array(w);
    this.lowerClip = new Int16Array(w);
    this.resetFrame();
  }

  public resetFrame(): void {
    this.invZ.fill(0);
    this.upperClip.fill(0);
    this.lowerClip.fill(this.height - 1);
  }

  /**
   * Tests whether a fragment with inverse-depth `fragInvZ` passes depth test.
   * `bias` > 0 pushes the fragment slightly closer (prevents coplanar decal Z-fighting).
   */
  public testAndWrite(x: number, y: number, fragInvZ: number, bias: number = 0): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    if (!Number.isFinite(fragInvZ) || fragInvZ <= 0) return false;
    const idx = y * this.width + x;
    const effective = fragInvZ + bias;
    if (effective >= this.invZ[idx]) {
      this.invZ[idx] = fragInvZ;
      return true;
    }
    return false;
  }

  public testOnly(x: number, y: number, fragInvZ: number, bias: number = 0): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    if (!Number.isFinite(fragInvZ) || fragInvZ <= 0) return false;
    const idx = y * this.width + x;
    return fragInvZ + bias >= this.invZ[idx];
  }

  /**
   * Writes a uniform-Z span (e.g. an entire vertical wall column at distance `dist`)
   * without overdrawing pixels already covered by closer geometry.
   */
  public testColumnPixel(x: number, y: number, dist: number, bias: number = 0): boolean {
    if (dist <= 0.001) return false;
    return this.testAndWrite(x, y, 1 / dist, bias);
  }
}

/**
 * Computes signed distance to a camera-space frustum half-space (positive = inside).
 */
function clipAgainstPlane(
  poly: ClipVertex3D[],
  evalDist: (v: ClipVertex3D) => number
): ClipVertex3D[] {
  if (poly.length === 0) return [];
  const out: ClipVertex3D[] = [];
  let prev = poly[poly.length - 1];
  let prevDist = evalDist(prev);

  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const currDist = evalDist(curr);
    const prevIn = prevDist >= 0;
    const currIn = currDist >= 0;

    if (currIn !== prevIn) {
      const denom = prevDist - currDist;
      const t = Math.abs(denom) > 1e-8 ? prevDist / denom : 0.5;
      const clampedT = Math.max(0, Math.min(1, t));
      out.push({
        x: prev.x + (curr.x - prev.x) * clampedT,
        y: prev.y + (curr.y - prev.y) * clampedT,
        z: prev.z + (curr.z - prev.z) * clampedT,
        u: prev.u + (curr.u - prev.u) * clampedT,
        v: prev.v + (curr.v - prev.v) * clampedT,
        light:
          prev.light !== undefined || curr.light !== undefined
            ? (prev.light ?? 1) + ((curr.light ?? 1) - (prev.light ?? 1)) * clampedT
            : undefined,
      });
    }
    if (currIn) {
      out.push(curr);
    }

    prev = curr;
    prevDist = currDist;
  }

  return out;
}

/**
 * 5-Plane Sutherland–Hodgman Camera-Space Frustum Clipper
 * Clips a 3D polygon cleanly against Near, Left, Right, Bottom, Top, and Far planes
 * BEFORE perspective divide so vertices behind the camera never invert or warp walls/floors.
 */
export function clipPolygonToFrustum(
  vertices: ClipVertex3D[],
  frustum: FrustumParams
): ClipVertex3D[] {
  if (vertices.length < 3) return [];
  const { zNear, zFar, tanHalfH, tanHalfV } = frustum;

  let poly = vertices;
  // 1. Near plane: z >= zNear
  poly = clipAgainstPlane(poly, (v) => v.z - zNear);
  if (poly.length < 3) return [];

  // 2. Far plane: z <= zFar
  poly = clipAgainstPlane(poly, (v) => zFar - v.z);
  if (poly.length < 3) return [];

  // 3. Left plane: x >= -z * tanHalfH
  poly = clipAgainstPlane(poly, (v) => v.x + v.z * tanHalfH);
  if (poly.length < 3) return [];

  // 4. Right plane: x <= z * tanHalfH
  poly = clipAgainstPlane(poly, (v) => v.z * tanHalfH - v.x);
  if (poly.length < 3) return [];

  // 5. Bottom plane: y >= -z * tanHalfV
  poly = clipAgainstPlane(poly, (v) => v.y + v.z * tanHalfV);
  if (poly.length < 3) return [];

  // 6. Top plane: y <= z * tanHalfV
  poly = clipAgainstPlane(poly, (v) => v.z * tanHalfV - v.y);
  return poly.length >= 3 ? poly : [];
}

/**
 * Clips a 2D/3D wall segment in camera space (x = horizontal, z = forward depth)
 * against Near plane and Left/Right FOV cone before projecting columns.
 * Returns clipped endpoints + interpolated U fraction [0..1] along the wall.
 */
export function clipSegmentToFrustum(
  a: { x: number; z: number; u: number },
  b: { x: number; z: number; u: number },
  zNear: number,
  tanHalfH: number
): { a: { x: number; z: number; u: number }; b: { x: number; z: number; u: number } } | null {
  let x1 = a.x, z1 = a.z, u1 = a.u;
  let x2 = b.x, z2 = b.z, u2 = b.u;

  const clipLinePlane = (evalFn: (x: number, z: number) => number): boolean => {
    const d1 = evalFn(x1, z1);
    const d2 = evalFn(x2, z2);
    if (d1 < 0 && d2 < 0) return false;
    if (d1 >= 0 && d2 >= 0) return true;
    const t = d1 / (d1 - d2);
    const nx = x1 + (x2 - x1) * t;
    const nz = z1 + (z2 - z1) * t;
    const nu = u1 + (u2 - u1) * t;
    if (d1 < 0) {
      x1 = nx; z1 = nz; u1 = nu;
    } else {
      x2 = nx; z2 = nz; u2 = nu;
    }
    return true;
  };

  // Near plane
  if (!clipLinePlane((_x, z) => z - zNear)) return null;
  // Left frustum boundary (with slight 1% pad to avoid 1px seam gaps)
  const k = tanHalfH * 1.01;
  if (!clipLinePlane((x, z) => x + z * k)) return null;
  // Right frustum boundary
  if (!clipLinePlane((x, z) => z * k - x)) return null;

  return {
    a: { x: x1, z: z1, u: u1 },
    b: { x: x2, z: z2, u: u2 },
  };
}

/**
 * Projects a camera-space point (already clipped so z >= zNear) into screen space.
 */
export function projectCameraPoint(
  vx: number,
  vy: number,
  vz: number,
  screenW: number,
  screenH: number,
  focalX: number,
  focalY: number,
  pitchOffsetPx: number = 0
): { sx: number; sy: number; invZ: number } {
  const safeZ = Math.max(0.05, vz);
  const invZ = 1 / safeZ;
  return {
    sx: screenW * 0.5 + vx * focalX * invZ,
    sy: screenH * 0.5 - vy * focalY * invZ + pitchOffsetPx,
    invZ,
  };
}

/**
 * Draws a filled polygon using exact 1/Z Z-buffer testing & per-pixel depth write
 * into an ImageData buffer (for fast software mode/standalone fallbacks).
 */
export function rasterizeClippedPolygonToImageData(
  poly: ClipVertex3D[],
  zbuf: ZBufferManager,
  imgData: ImageData,
  focalX: number,
  focalY: number,
  pitchOffsetPx: number,
  colorSampler: (u: number, v: number, light: number, depth: number) => [number, number, number, number],
  depthBias: number = 0
): void {
  if (poly.length < 3) return;
  const w = zbuf.width;
  const h = zbuf.height;
  const data = imgData.data;

  const proj = poly.map((v) => {
    const p = projectCameraPoint(v.x, v.y, v.z, w, h, focalX, focalY, pitchOffsetPx);
    return {
      sx: p.sx,
      sy: p.sy,
      invZ: p.invZ,
      uOverZ: v.u * p.invZ,
      vOverZ: v.v * p.invZ,
      lOverZ: (v.light ?? 1) * p.invZ,
    };
  });

  // Fan triangulation of convex clipped polygon
  for (let i = 1; i < proj.length - 1; i++) {
    const v0 = proj[0];
    const v1 = proj[i];
    const v2 = proj[i + 1];

    // Backface cull or degenerate check
    const area =
      (v1.sx - v0.sx) * (v2.sy - v0.sy) - (v2.sx - v0.sx) * (v1.sy - v0.sy);
    if (Math.abs(area) < 0.25) continue;

    const minX = Math.max(0, Math.floor(Math.min(v0.sx, v1.sx, v2.sx)));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.sx, v1.sx, v2.sx)));
    const minY = Math.max(0, Math.floor(Math.min(v0.sy, v1.sy, v2.sy)));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.sy, v1.sy, v2.sy)));
    if (minX > maxX || minY > maxY) continue;

    const invArea = 1 / area;
    const edge01X = v1.sx - v0.sx, edge01Y = v1.sy - v0.sy;
    const edge12X = v2.sx - v1.sx, edge12Y = v2.sy - v1.sy;
    const edge20X = v0.sx - v2.sx, edge20Y = v0.sy - v2.sy;

    for (let py = minY; py <= maxY; py++) {
      const cy = py + 0.5;
      for (let px = minX; px <= maxX; px++) {
        const cx = px + 0.5;
        const w0 = ((cx - v1.sx) * edge12Y - (cy - v1.sy) * edge12X) * invArea;
        const w1 = ((cx - v2.sx) * edge20Y - (cy - v2.sy) * edge20X) * invArea;
        const w2 = ((cx - v0.sx) * edge01Y - (cy - v0.sy) * edge01X) * invArea;
        if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;

        const invZ = w0 * v0.invZ + w1 * v1.invZ + w2 * v2.invZ;
        if (!zbuf.testAndWrite(px, py, invZ, depthBias)) continue;

        const z = 1 / Math.max(1e-6, invZ);
        const u = (w0 * v0.uOverZ + w1 * v1.uOverZ + w2 * v2.uOverZ) * z;
        const v = (w0 * v0.vOverZ + w1 * v1.vOverZ + w2 * v2.vOverZ) * z;
        const light = Math.max(
          0,
          Math.min(1, (w0 * v0.lOverZ + w1 * v1.lOverZ + w2 * v2.lOverZ) * z)
        );
        const [r, g, b, a] = colorSampler(u, v, light, z);
        if (a <= 0) continue;
        const pIdx = (py * w + px) * 4;
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = a;
      }
    }
  }
}
