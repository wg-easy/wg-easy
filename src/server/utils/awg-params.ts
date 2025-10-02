/**
 * AmneziaWG Obfuscation Parameter Generator
 *
 * Generates random obfuscation parameters that conform to amneziawg-go constraints.
 * Based on: https://github.com/amnezia-vpn/amneziawg-go/blob/master/device/device.go
 */

export interface AwgObfuscationParams {
  jc: number;   // Junk packet count
  jmin: number; // Junk packet minimum size
  jmax: number; // Junk packet maximum size
  s1: number;   // Init header junk size
  s2: number;   // Response header junk size
  h1: number;   // Init magic header
  h2: number;   // Response magic header
  h3: number;   // Cookie magic header
  h4: number;   // Transport magic header
}

// Constants from amneziawg-go
const MAX_SEGMENT_SIZE = 65535; // Default for Linux (1 << 16) - 1
const MESSAGE_INITIATION_SIZE = 148;
const MESSAGE_RESPONSE_SIZE = 92;
const MESSAGE_COOKIE_SIZE = 64;
const MESSAGE_TRANSPORT_SIZE = 32;

// Amnezia documentation constraints (assuming MTU = 1280)
const MTU = 1280;
const S1_MAX_MTU = MTU - MESSAGE_INITIATION_SIZE; // 1132
const S2_MAX_MTU = MTU - MESSAGE_RESPONSE_SIZE;   // 1188

// Recommended ranges from Amnezia documentation for random generation
const JC_MIN = 4;
const JC_MAX = 12;
const JMIN_MIN = 8;
const JMIN_MAX = 80;  // Random between recommended 8 and upper bounds
const JMAX_MIN = 80;
const JMAX_MAX = 1280;
const S_MIN = 15;
const S_MAX = 150;

// Magic header ranges (must be > 4 and non-overlapping)
const MAGIC_HEADER_MIN = 5;
const MAGIC_HEADER_MAX = 0xFFFFFFFF; // uint32 max

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate non-overlapping magic header values
 * Each header must be > 4 and all must be distinct
 * Recommended range: 5 to 2147483647 (max signed 32-bit int)
 */
function generateMagicHeaders(): [number, number, number, number] {
  const headers = new Set<number>();

  // Generate 4 distinct random values in recommended range (5 to 2^31-1)
  while (headers.size < 4) {
    const value = randomInt(MAGIC_HEADER_MIN, 2147483647);
    headers.add(value);
  }

  return Array.from(headers) as [number, number, number, number];
}

/**
 * Generate random AmneziaWG obfuscation parameters
 *
 * Parameters are chosen to:
 * - Provide good obfuscation without excessive overhead
 * - Conform to amneziawg-go validation rules
 * - Be random for each installation
 *
 * @returns Random obfuscation parameters
 */
export function generateAwgObfuscationParams(): AwgObfuscationParams {
  const jc = randomInt(JC_MIN, JC_MAX);
  const jmin = randomInt(JMIN_MIN, JMIN_MAX);
  const jmax = randomInt(Math.max(jmin + 1, JMAX_MIN), JMAX_MAX);

  // S1-S4: Header junk sizes
  const s1 = randomInt(S_MIN, Math.min(S_MAX, S1_MAX_MTU));
  const s2 = randomInt(S_MIN, Math.min(S_MAX, S2_MAX_MTU));

  // Generate non-overlapping magic headers
  const [h1, h2, h3, h4] = generateMagicHeaders();

  return {
    jc,
    jmin,
    jmax,
    s1,
    s2,
    h1,
    h2,
    h3,
    h4,
  };
}

/**
 * Validate AWG parameters against amneziawg-go constraints
 *
 * @param params Parameters to validate
 * @returns true if valid, throws error otherwise
 */
export function validateAwgParams(params: Partial<AwgObfuscationParams>): boolean {
  // Jc: 1 ≤ Jc ≤ 128 (recommended 4-12)
  if (params.jc !== undefined && (params.jc < 1 || params.jc > 128)) {
    throw new Error('Jc (junk packet count) must be between 1 and 128');
  }

  // Jmin: Jmax > Jmin < 1280 (recommended 8)
  if (params.jmin !== undefined && (params.jmin < 0 || params.jmin >= MTU)) {
    throw new Error(`Jmin (junk packet min size) must be between 0 and ${MTU - 1}`);
  }

  // Jmax: Jmin < Jmax ≤ 1280 (recommended 80)
  if (params.jmax !== undefined) {
    if (params.jmax < 1 || params.jmax > MTU) {
      throw new Error(`Jmax must be between 1 and ${MTU}`);
    }

    if (params.jmin !== undefined && params.jmax <= params.jmin) {
      throw new Error('Jmax must be > Jmin');
    }
  }

  // S1: S1 ≤ 1132 (MTU - 148), S1 + 56 ≠ S2 (recommended 15-150)
  if (params.s1 !== undefined) {
    if (params.s1 < 0 || params.s1 > S1_MAX_MTU) {
      throw new Error(`S1 must be between 0 and ${S1_MAX_MTU} (MTU - MessageInitiationSize)`);
    }
  }

  // S2: S2 ≤ 1188 (MTU - 92) (recommended 15-150)
  if (params.s2 !== undefined) {
    if (params.s2 < 0 || params.s2 > S2_MAX_MTU) {
      throw new Error(`S2 must be between 0 and ${S2_MAX_MTU} (MTU - MessageResponseSize)`);
    }
  }

  // S1 + 56 ≠ S2
  if (params.s1 !== undefined && params.s2 !== undefined) {
    if (params.s1 + 56 === params.s2) {
      throw new Error('S1 + 56 must not equal S2');
    }
  }

  // Validate magic headers: must be > 4 and unique (recommended 5 to 2147483647)
  if (params.h1 !== undefined || params.h2 !== undefined ||
      params.h3 !== undefined || params.h4 !== undefined) {
    const headers = [params.h1, params.h2, params.h3, params.h4].filter(h => h !== undefined);

    // Check all are > 4 (to enable obfuscation)
    for (const h of headers) {
      if (h! <= 4) {
        throw new Error('Magic headers must be > 4 to enable obfuscation');
      }
    }

    // Check for duplicates if all 4 are provided
    if (headers.length === 4) {
      const uniqueHeaders = new Set(headers);
      if (uniqueHeaders.size !== 4) {
        throw new Error('All magic headers (H1-H4) must be distinct');
      }
    }
  }

  return true;
}
