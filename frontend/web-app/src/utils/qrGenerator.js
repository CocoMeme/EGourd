/**
 * Minimal QR Code generator (Model 2, up to version 10).
 * Generates a QR data matrix that can be rendered on a <canvas>.
 * No external dependencies required.
 */

// ── Galois Field GF(256) helpers ──
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
  EXP[255] = EXP[0];
})();

function gfMul(a, b) {
  return a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255];
}

// ── Reed-Solomon error-correction codewords ──
function rsGenPoly(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data, ecLen) {
  const gen = rsGenPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// ── QR version / EC tables (versions 1-10, level L) ──
const VERSION_INFO = [
  null,
  { total: 26, ec: 7, groups: [[1, 19]] },
  { total: 44, ec: 10, groups: [[1, 34]] },
  { total: 70, ec: 15, groups: [[1, 55]] },
  { total: 100, ec: 20, groups: [[1, 80]] },
  { total: 134, ec: 26, groups: [[1, 108]] },
  { total: 172, ec: 18, groups: [[2, 68]] },
  { total: 196, ec: 20, groups: [[2, 78]] },
  { total: 242, ec: 24, groups: [[2, 97]] },
  { total: 292, ec: 30, groups: [[2, 116]] },
  { total: 346, ec: 18, groups: [[2, 68], [2, 69]] },
];

const ALIGNMENT_PATTERNS = [
  null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

function chooseVersion(byteLen) {
  for (let v = 1; v <= 10; v++) {
    const info = VERSION_INFO[v];
    let dataCap = 0;
    for (const [cnt, dcw] of info.groups) dataCap += cnt * dcw;
    // byte mode: 4-bit mode + (v<=9 ? 8 : 16)-bit count + data + 4-bit terminator
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    const availBits = dataCap * 8;
    if (headerBits + byteLen * 8 + 4 <= availBits || headerBits + byteLen * 8 <= availBits) {
      return v;
    }
  }
  throw new Error('Data too long for QR versions 1-10');
}

// ── Encode data into codewords (byte mode) ──
function encodeData(text, version) {
  const info = VERSION_INFO[version];
  let dataCap = 0;
  for (const [cnt, dcw] of info.groups) dataCap += cnt * dcw;

  const bytes = new TextEncoder().encode(text);
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  // Mode indicator: 0100 (byte)
  push(0b0100, 4);
  // Character count
  push(bytes.length, version <= 9 ? 8 : 16);
  // Data
  for (const b of bytes) push(b, 8);
  // Terminator (up to 4 bits)
  const termLen = Math.min(4, dataCap * 8 - bits.length);
  push(0, termLen);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad codewords
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.length < dataCap * 8) {
    push(pads[pi % 2], 8);
    pi++;
  }

  // Split into groups/blocks
  const dataBytes = [];
  let idx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    dataBytes.push(v);
  }

  const blocks = [];
  idx = 0;
  for (const [cnt, dcw] of info.groups) {
    for (let i = 0; i < cnt; i++) {
      blocks.push(new Uint8Array(dataBytes.slice(idx, idx + dcw)));
      idx += dcw;
    }
  }

  // Generate EC for each block
  const ecBlocks = blocks.map((b) => rsEncode(b, info.ec));

  // Interleave data codewords
  const result = [];
  const maxDataLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of blocks) {
      if (i < b.length) result.push(b[i]);
    }
  }
  // Interleave EC codewords
  for (let i = 0; i < info.ec; i++) {
    for (const e of ecBlocks) {
      if (i < e.length) result.push(e[i]);
    }
  }

  return result;
}

// ── Matrix construction ──
function createMatrix(version) {
  const size = 17 + version * 4;
  const matrix = Array.from({ length: size }, () => new Int8Array(size)); // 0=empty
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));
  return { matrix, reserved, size };
}

function placeFinderPattern(mat, row, col) {
  const { matrix, reserved, size } = mat;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const inOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
      matrix[rr][cc] = (inOuter || inInner) && !isBorder ? 1 : -1;
      reserved[rr][cc] = 1;
    }
  }
}

function placeAlignmentPattern(mat, row, col) {
  const { matrix, reserved } = mat;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const abs = Math.max(Math.abs(r), Math.abs(c));
      matrix[row + r][col + c] = abs === 1 ? -1 : 1;
      reserved[row + r][col + c] = 1;
    }
  }
}

function placeTimingPatterns(mat) {
  const { matrix, reserved, size } = mat;
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : -1;
      reserved[6][i] = 1;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : -1;
      reserved[i][6] = 1;
    }
  }
}

function reserveFormatArea(mat) {
  const { reserved, size } = mat;
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    reserved[8][i] = 1;
    reserved[i][8] = 1;
  }
  // Around top-right finder
  for (let i = 0; i <= 7; i++) {
    reserved[8][size - 1 - i] = 1;
  }
  // Around bottom-left finder
  for (let i = 0; i <= 7; i++) {
    reserved[size - 1 - i][8] = 1;
  }
  // Dark module
  mat.matrix[size - 8][8] = 1;
  reserved[size - 8][8] = 1;
}

function placeData(mat, data) {
  const { matrix, reserved, size } = mat;
  const bits = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }

  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // Skip timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (!reserved[row][c]) {
          matrix[row][c] = bitIdx < bits.length && bits[bitIdx] ? 1 : -1;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
}

// ── Masking ──
const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(mat, maskIdx) {
  const { matrix, reserved, size } = mat;
  const fn = MASK_FNS[maskIdx];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && fn(r, c)) {
        matrix[r][c] = matrix[r][c] === 1 ? -1 : 1;
      }
    }
  }
}

// ── Format information (EC level L = 01) ──
const FORMAT_BITS = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
];

function placeFormatInfo(mat, maskIdx) {
  const { matrix, size } = mat;
  const bits = FORMAT_BITS[maskIdx];

  // Place around top-left
  const positions1 = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
    [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions1[i];
    matrix[r][c] = (bits >> (14 - i)) & 1 ? 1 : -1;
  }

  // Place around top-right and bottom-left
  const positions2 = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7], [8, size - 8],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
    [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions2[i];
    matrix[r][c] = (bits >> (14 - i)) & 1 ? 1 : -1;
  }
}

// ── Penalty scoring ──
function penalty(mat) {
  const { matrix, size } = mat;
  let score = 0;

  // Rule 1: runs of 5+ same-color modules
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if ((matrix[r][c] > 0) === (matrix[r][c - 1] > 0)) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if ((matrix[r][c] > 0) === (matrix[r - 1][c] > 0)) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const a = matrix[r][c] > 0;
      if (
        a === (matrix[r][c + 1] > 0) &&
        a === (matrix[r + 1][c] > 0) &&
        a === (matrix[r + 1][c + 1] > 0)
      ) {
        score += 3;
      }
    }
  }

  return score;
}

// ── Main generator ──
export function generateQR(text) {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const data = encodeData(text, version);

  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestMatrix = null;

  for (let m = 0; m < 8; m++) {
    const mat = createMatrix(version);

    // Place finder patterns
    placeFinderPattern(mat, 0, 0);
    placeFinderPattern(mat, 0, mat.size - 7);
    placeFinderPattern(mat, mat.size - 7, 0);

    // Place alignment patterns
    const ap = ALIGNMENT_PATTERNS[version];
    if (ap && ap.length > 0) {
      for (const r of ap) {
        for (const c of ap) {
          // Skip if overlapping with finder patterns
          if (mat.reserved[r] && mat.reserved[r][c]) continue;
          placeAlignmentPattern(mat, r, c);
        }
      }
    }

    placeTimingPatterns(mat);
    reserveFormatArea(mat);
    placeData(mat, data);
    applyMask(mat, m);
    placeFormatInfo(mat, m);

    const p = penalty(mat);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = m;
      bestMatrix = mat;
    }
  }

  // Convert to boolean grid (true = dark)
  const grid = [];
  for (let r = 0; r < bestMatrix.size; r++) {
    const row = [];
    for (let c = 0; c < bestMatrix.size; c++) {
      row.push(bestMatrix.matrix[r][c] > 0);
    }
    grid.push(row);
  }

  return { grid, size: bestMatrix.size, version };
}

/**
 * Renders a QR code onto a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {string} text - The text/URL to encode
 * @param {object} options
 * @param {number} options.moduleSize - Size of each module in px (default 8)
 * @param {number} options.margin - Quiet zone in modules (default 4)
 * @param {string} options.darkColor - Color for dark modules
 * @param {string} options.lightColor - Color for light modules
 */
export function renderQRToCanvas(canvas, text, options = {}) {
  const {
    moduleSize = 8,
    margin = 4,
    darkColor = '#1c444b',
    lightColor = '#ffffff',
  } = options;

  const { grid, size } = generateQR(text);
  const totalSize = (size + margin * 2) * moduleSize;

  canvas.width = totalSize;
  canvas.height = totalSize;

  const ctx = canvas.getContext('2d');

  // Light background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Draw modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        ctx.fillRect(
          (c + margin) * moduleSize,
          (r + margin) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
}
