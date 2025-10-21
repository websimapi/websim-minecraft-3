import { CHUNK_SIZE, WORLD_HEIGHT } from './config.js';

let seed = 0;

export function setSeed(newSeed) {
    seed = newSeed;
}

export function hash(x, z) {
    let h = (x * 374761393 + z * 668265263 + seed) & 0x7fffffff;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) / 0x7fffffff;
}

export function hash3D(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed) & 0x7fffffff;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) / 0x7fffffff) * 2 - 1;
}

export function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerp(t, a, b) {
    return a + t * (b - a);
}

export function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

export function noise2D(x, z) {
    const X = Math.floor(x);
    const Z = Math.floor(z);

    const xf = x - X;
    const zf = z - Z;

    const u = fade(xf);
    const v = fade(zf);

    const a = hash(X & 255, Z & 255);
    const b = hash((X + 1) & 255, Z & 255);
    const c = hash(X & 255, (Z + 1) & 255);
    const d = hash((X + 1) & 255, (Z + 1) & 255);

    return lerp(v, lerp(u, a, b), lerp(u, c, d));
}

export function noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    
    const aaa = hash3D(X, Y, Z);
    const aba = hash3D(X, Y + 1, Z);
    const aab = hash3D(X, Y, Z + 1);
    const abb = hash3D(X, Y + 1, Z + 1);
    const baa = hash3D(X + 1, Y, Z);
    const bba = hash3D(X + 1, Y + 1, Z);
    const bab = hash3D(X + 1, Y, Z + 1);
    const bbb = hash3D(X + 1, Y + 1, Z + 1);
    
    const x1 = lerp(u, aaa, baa);
    const x2 = lerp(u, aba, bba);
    const y1 = lerp(v, x1, x2);
    
    const x3 = lerp(u, aab, bab);
    const x4 = lerp(u, abb, bbb);
    const y2 = lerp(v, x3, x4);
    
    return lerp(w, y1, y2);
}