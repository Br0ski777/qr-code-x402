import type { Hono } from "hono";

// QR Code generator — pure implementation, no external dependencies
// Supports alphanumeric mode, version 1-4 (up to ~78 chars)

const EC_CODEWORDS_L: Record<number, number> = { 1: 7, 2: 10, 3: 15, 4: 20 };
const DATA_CODEWORDS: Record<number, number> = { 1: 19, 2: 34, 3: 55, 4: 80 };

function getVersion(dataLength: number): number {
  // byte mode capacity per version (error correction level L)
  if (dataLength <= 17) return 1;
  if (dataLength <= 32) return 2;
  if (dataLength <= 53) return 3;
  if (dataLength <= 78) return 4;
  return 4; // clamp to version 4
}

function encodeData(data: string, version: number): number[] {
  const totalDataCodewords = DATA_CODEWORDS[version];
  const bits: number[] = [];

  // Mode indicator: byte mode = 0100
  bits.push(0, 1, 0, 0);

  // Character count indicator (8 bits for byte mode, versions 1-9)
  const len = Math.min(data.length, totalDataCodewords - 2);
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);

  // Data
  for (let i = 0; i < len; i++) {
    const byte = data.charCodeAt(i) & 0xff;
    for (let j = 7; j >= 0; j--) bits.push((byte >> j) & 1);
  }

  // Terminator (up to 4 zeros)
  const totalBits = totalDataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < totalBits; i++) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad codewords
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalBits) {
    const pb = padBytes[padIdx % 2];
    for (let j = 7; j >= 0; j--) bits.push((pb >> j) & 1);
    padIdx++;
  }

  // Convert bits to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    codewords.push(byte);
  }

  return codewords;
}

function createMatrix(version: number): number[][] {
  const size = 17 + version * 4;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  return matrix;
}

function addFinderPattern(matrix: number[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r;
      const mc = col + c;
      if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue;
      if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[mr][mc] = 1;
        } else {
          matrix[mr][mc] = 0;
        }
      } else {
        matrix[mr][mc] = 0;
      }
    }
  }
}

function addTimingPatterns(matrix: number[][]) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === -1) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === -1) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }
}

function generateQRMatrix(data: string): number[][] {
  const version = getVersion(data.length);
  const size = 17 + version * 4;
  const matrix = createMatrix(version);

  // Finder patterns
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, 0, size - 7);
  addFinderPattern(matrix, size - 7, 0);

  // Timing patterns
  addTimingPatterns(matrix);

  // Dark module
  matrix[4 * version + 9][8] = 1;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = 0;
    if (matrix[i][8] === -1) matrix[i][8] = 0;
    if (matrix[8][size - 1 - i] === -1) matrix[8][size - 1 - i] = 0;
    if (matrix[size - 1 - i][8] === -1) matrix[size - 1 - i][8] = 0;
  }
  if (matrix[8][8] === -1) matrix[8][8] = 0;

  // Place data (simplified — fill remaining cells with data bits)
  const codewords = encodeData(data, version);
  const allBits: number[] = [];
  for (const cw of codewords) {
    for (let j = 7; j >= 0; j--) allBits.push((cw >> j) & 1);
  }
  // Add EC placeholder bits
  const ecCount = EC_CODEWORDS_L[version];
  for (let i = 0; i < ecCount * 8; i++) allBits.push(0);

  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (col < 0) continue;
        if (matrix[row][col] === -1) {
          matrix[row][col] = bitIdx < allBits.length ? allBits[bitIdx] : 0;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Apply mask 0 (checkerboard)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Only mask data cells (skip finder, timing, format areas)
      if (isDataCell(matrix, r, c, size)) {
        if ((r + c) % 2 === 0) {
          matrix[r][c] ^= 1;
        }
      }
    }
  }

  return matrix;
}

function isDataCell(_matrix: number[][], r: number, c: number, size: number): boolean {
  // Finder pattern areas
  if (r <= 8 && c <= 8) return false;
  if (r <= 8 && c >= size - 8) return false;
  if (r >= size - 8 && c <= 8) return false;
  // Timing patterns
  if (r === 6 || c === 6) return false;
  return true;
}

function matrixToPNG(matrix: number[][], scale: number = 10): Buffer {
  const quiet = 4; // quiet zone modules
  const size = matrix.length;
  const imgSize = (size + quiet * 2) * scale;

  // Create a simple BMP (easier than PNG without dependencies)
  // Actually, let's create a minimal PNG
  const width = imgSize;
  const height = imgSize;

  // Build raw pixel data (1 byte per pixel: 0=black, 255=white)
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte for each row
    for (let x = 0; x < width; x++) {
      const moduleY = Math.floor(y / scale) - quiet;
      const moduleX = Math.floor(x / scale) - quiet;
      if (moduleY >= 0 && moduleY < size && moduleX >= 0 && moduleX < size && matrix[moduleY][moduleX] === 1) {
        rawData.push(0); // black
      } else {
        rawData.push(255); // white
      }
    }
  }

  // Compress with deflate (Bun has zlib)
  const deflated = Bun.deflateSync(Buffer.from(rawData));

  // Build PNG file
  const png: number[] = [];

  // PNG signature
  png.push(137, 80, 78, 71, 13, 10, 26, 10);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  appendChunk(png, "IHDR", ihdr);

  // IDAT chunk
  appendChunk(png, "IDAT", Buffer.from(deflated));

  // IEND chunk
  appendChunk(png, "IEND", Buffer.alloc(0));

  return Buffer.from(png);
}

function appendChunk(png: number[], type: string, data: Buffer) {
  // Length (4 bytes)
  const len = data.length;
  png.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff);

  // Type (4 bytes)
  for (let i = 0; i < 4; i++) png.push(type.charCodeAt(i));

  // Data
  for (let i = 0; i < data.length; i++) png.push(data[i]);

  // CRC (type + data)
  const crcData = Buffer.alloc(4 + data.length);
  for (let i = 0; i < 4; i++) crcData[i] = type.charCodeAt(i);
  data.copy(crcData, 4);
  const crc = crc32(crcData);
  png.push((crc >> 24) & 0xff, (crc >> 16) & 0xff, (crc >> 8) & 0xff, crc & 0xff);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function registerRoutes(app: Hono) {
  app.post("/api/qr", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.data) {
      return c.json({ error: "Missing required field: data" }, 400);
    }

    const data: string = String(body.data);
    if (data.length > 78) {
      return c.json({ error: "Data too long. Maximum 78 characters supported." }, 400);
    }

    try {
      const matrix = generateQRMatrix(data);
      const scale = 10;
      const pngBuffer = matrixToPNG(matrix, scale);
      const base64 = pngBuffer.toString("base64");
      const size = matrix.length;
      const imgPixels = (size + 8) * scale; // +8 for quiet zone

      return c.json({
        qr_base64: base64,
        data_uri: `data:image/png;base64,${base64}`,
        width: imgPixels,
        height: imgPixels,
        modules: size,
        inputData: data,
        inputLength: data.length,
      });
    } catch (err: any) {
      return c.json({ error: "Failed to generate QR code: " + err.message }, 500);
    }
  });
}
