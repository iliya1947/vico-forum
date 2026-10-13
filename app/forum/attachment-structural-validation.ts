import type { AttachmentDetection } from "./attachment-validation";

export type StreamStructuralDetection = Extract<
  AttachmentDetection,
  "png" | "jpeg" | "gif" | "webp" | "pdf"
>;

export interface AttachmentStructuralValidator {
  push(chunk: Uint8Array): void;
  finish(): boolean;
}

function appendHead(current: Uint8Array, chunk: Uint8Array, limit: number): Uint8Array {
  if (current.byteLength >= limit || chunk.byteLength === 0) return current;
  const count = Math.min(limit - current.byteLength, chunk.byteLength);
  const next = new Uint8Array(current.byteLength + count);
  next.set(current);
  next.set(chunk.subarray(0, count), current.byteLength);
  return next;
}

function appendTail(current: Uint8Array, chunk: Uint8Array, limit: number): Uint8Array {
  if (chunk.byteLength >= limit) return chunk.slice(chunk.byteLength - limit);
  const keep = Math.min(current.byteLength, limit - chunk.byteLength);
  const next = new Uint8Array(keep + chunk.byteLength);
  if (keep) next.set(current.subarray(current.byteLength - keep));
  next.set(chunk, keep);
  return next;
}

function asciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  if (offset + expected.length > bytes.byteLength) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected.charCodeAt(index)) return false;
  }
  return true;
}

function readU32Be(bytes: ArrayLike<number>, offset: number): number {
  return (((bytes[offset]! << 24) >>> 0)
    | (bytes[offset + 1]! << 16)
    | (bytes[offset + 2]! << 8)
    | bytes[offset + 3]!) >>> 0;
}

function readU32Le(bytes: ArrayLike<number>, offset: number): number {
  return (bytes[offset]!
    | (bytes[offset + 1]! << 8)
    | (bytes[offset + 2]! << 16)
    | ((bytes[offset + 3]! << 24) >>> 0)) >>> 0;
}

abstract class HeadTailStructuralValidator implements AttachmentStructuralValidator {
  protected head: Uint8Array = new Uint8Array();
  protected tail: Uint8Array = new Uint8Array();
  protected bytesSeen = 0;

  constructor(
    protected readonly expectedSize: number,
    private readonly headLimit: number,
    private readonly tailLimit: number,
  ) {}

  push(chunk: Uint8Array): void {
    this.bytesSeen += chunk.byteLength;
    this.head = appendHead(this.head, chunk, this.headLimit);
    this.tail = appendTail(this.tail, chunk, this.tailLimit);
    this.onChunk(chunk);
  }

  protected onChunk(chunk: Uint8Array): void { void chunk; }

  protected exactLength(): boolean {
    return Number.isSafeInteger(this.expectedSize)
      && this.expectedSize > 0
      && this.bytesSeen === this.expectedSize;
  }

  abstract finish(): boolean;
}

class PngStructuralValidator implements AttachmentStructuralValidator {
  private stage: "signature" | "header" | "data" | "crc" | "done" = "signature";
  private scratch: number[] = [];
  private currentType = "";
  private remainingData = 0;
  private remainingCrc = 0;
  private ihdrData: number[] = [];
  private seenIHDR = false;
  private seenIDAT = false;
  private invalid = false;
  private bytesSeen = 0;

  constructor(private readonly expectedSize: number) {}

  push(chunk: Uint8Array): void {
    this.bytesSeen += chunk.byteLength;
    let offset = 0;
    while (offset < chunk.byteLength && !this.invalid) {
      if (this.stage === "done") {
        this.invalid = true;
        return;
      }

      if (this.stage === "signature") {
        const needed = 8 - this.scratch.length;
        const take = Math.min(needed, chunk.byteLength - offset);
        for (let index = 0; index < take; index += 1) this.scratch.push(chunk[offset + index]!);
        offset += take;
        if (this.scratch.length < 8) continue;
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        this.invalid = signature.some((value, index) => this.scratch[index] !== value);
        this.scratch = [];
        this.stage = "header";
        continue;
      }

      if (this.stage === "header") {
        const needed = 8 - this.scratch.length;
        const take = Math.min(needed, chunk.byteLength - offset);
        for (let index = 0; index < take; index += 1) this.scratch.push(chunk[offset + index]!);
        offset += take;
        if (this.scratch.length < 8) continue;

        const length = readU32Be(this.scratch, 0);
        if (length > 0x7fffffff) {
          this.invalid = true;
          return;
        }
        this.currentType = String.fromCharCode(
          this.scratch[4]!, this.scratch[5]!, this.scratch[6]!, this.scratch[7]!,
        );
        this.scratch = [];

        if (!this.seenIHDR && this.currentType !== "IHDR") {
          this.invalid = true;
          return;
        }
        if (this.currentType === "IHDR") {
          if (this.seenIHDR || length !== 13) {
            this.invalid = true;
            return;
          }
          this.ihdrData = [];
        }
        if (this.currentType === "IEND" && length !== 0) {
          this.invalid = true;
          return;
        }

        this.remainingData = length;
        this.stage = length === 0 ? "crc" : "data";
        this.remainingCrc = length === 0 ? 4 : 0;
        continue;
      }

      if (this.stage === "data") {
        const take = Math.min(this.remainingData, chunk.byteLength - offset);
        if (this.currentType === "IHDR") {
          for (let index = 0; index < take; index += 1) this.ihdrData.push(chunk[offset + index]!);
        }
        offset += take;
        this.remainingData -= take;
        if (this.remainingData === 0) {
          this.remainingCrc = 4;
          this.stage = "crc";
        }
        continue;
      }

      const take = Math.min(this.remainingCrc, chunk.byteLength - offset);
      offset += take;
      this.remainingCrc -= take;
      if (this.remainingCrc !== 0) continue;

      if (this.currentType === "IHDR") {
        this.seenIHDR = this.validIHDR();
        if (!this.seenIHDR) {
          this.invalid = true;
          return;
        }
      } else if (this.currentType === "IDAT") {
        this.seenIDAT = true;
      } else if (this.currentType === "IEND") {
        if (!this.seenIDAT) {
          this.invalid = true;
          return;
        }
        this.stage = "done";
        continue;
      }
      this.stage = "header";
    }
  }

  private validIHDR(): boolean {
    if (this.ihdrData.length !== 13) return false;
    const width = readU32Be(this.ihdrData, 0);
    const height = readU32Be(this.ihdrData, 4);
    if (width === 0 || height === 0) return false;
    const bitDepth = this.ihdrData[8]!;
    const colorType = this.ihdrData[9]!;
    const allowed = new Map<number, readonly number[]>([
      [0, [1, 2, 4, 8, 16]],
      [2, [8, 16]],
      [3, [1, 2, 4, 8]],
      [4, [8, 16]],
      [6, [8, 16]],
    ]);
    return allowed.get(colorType)?.includes(bitDepth) === true
      && this.ihdrData[10] === 0
      && this.ihdrData[11] === 0
      && (this.ihdrData[12] === 0 || this.ihdrData[12] === 1);
  }

  finish(): boolean {
    return !this.invalid
      && this.bytesSeen === this.expectedSize
      && this.stage === "done"
      && this.seenIHDR
      && this.seenIDAT;
  }
}

class JpegStructuralValidator extends HeadTailStructuralValidator {
  private previousWasFF = false;
  private seenFrame = false;
  private seenScan = false;
  private seenEnd = false;

  constructor(expectedSize: number) {
    super(expectedSize, 3, 2);
  }

  protected override onChunk(chunk: Uint8Array): void {
    for (const byte of chunk) {
      if (!this.previousWasFF) {
        this.previousWasFF = byte === 0xff;
        continue;
      }
      if (byte === 0xff) continue;
      this.previousWasFF = false;
      if (byte === 0x00) continue;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
        .includes(byte)) this.seenFrame = true;
      if (byte === 0xda) this.seenScan = true;
      if (byte === 0xd9 && this.seenScan) this.seenEnd = true;
    }
  }

  finish(): boolean {
    return this.exactLength()
      && this.head[0] === 0xff
      && this.head[1] === 0xd8
      && this.tail[0] === 0xff
      && this.tail[1] === 0xd9
      && this.seenFrame
      && this.seenScan
      && this.seenEnd;
  }
}

class GifStructuralValidator extends HeadTailStructuralValidator {
  constructor(expectedSize: number) {
    super(expectedSize, 13, 1);
  }

  finish(): boolean {
    if (!this.exactLength() || this.head.byteLength < 13 || this.tail[0] !== 0x3b) return false;
    if (!asciiAt(this.head, 0, "GIF87a") && !asciiAt(this.head, 0, "GIF89a")) return false;
    const packed = this.head[10]!;
    const hasGlobalColorTable = (packed & 0x80) !== 0;
    if (!hasGlobalColorTable) return this.expectedSize >= 14;
    const tableBytes = 3 * (2 ** ((packed & 0x07) + 1));
    return this.expectedSize >= 13 + tableBytes + 1;
  }
}

class WebpStructuralValidator extends HeadTailStructuralValidator {
  constructor(expectedSize: number) {
    super(expectedSize, 32, 0);
  }

  finish(): boolean {
    if (!this.exactLength() || this.head.byteLength < 20) return false;
    if (!asciiAt(this.head, 0, "RIFF") || !asciiAt(this.head, 8, "WEBP")) return false;
    const riffSize = readU32Le(this.head, 4);
    if (riffSize + 8 !== this.expectedSize) return false;

    const firstChunk = String.fromCharCode(
      this.head[12]!, this.head[13]!, this.head[14]!, this.head[15]!,
    );
    if (!["VP8 ", "VP8L", "VP8X"].includes(firstChunk)) return false;
    const firstChunkSize = readU32Le(this.head, 16);
    const paddedSize = firstChunkSize + (firstChunkSize & 1);
    if (20 + paddedSize > this.expectedSize) return false;
    if (firstChunk === "VP8X" && firstChunkSize !== 10) return false;
    if (firstChunk === "VP8L" && (firstChunkSize < 5 || this.head[20] !== 0x2f)) return false;
    return firstChunkSize > 0;
  }
}

class PdfStructuralValidator extends HeadTailStructuralValidator {
  constructor(expectedSize: number) {
    super(expectedSize, 8, 8192);
  }

  finish(): boolean {
    if (!this.exactLength() || !asciiAt(this.head, 0, "%PDF-")) return false;
    const tailText = String.fromCharCode(...this.tail);
    const eof = tailText.lastIndexOf("%%EOF");
    if (eof < 0) return false;
    const trailing = tailText.slice(eof + 5);
    if ([...trailing].some((character) =>
      ![0, 9, 10, 12, 13, 32].includes(character.charCodeAt(0)))) return false;
    const beforeEof = tailText.slice(0, eof);
    const matches = [...beforeEof.matchAll(/startxref\s+(\d+)/gu)];
    const latest = matches.at(-1);
    if (!latest) return false;
    const offset = Number(latest[1]);
    return Number.isSafeInteger(offset) && offset >= 0 && offset < this.expectedSize;
  }
}

export function createAttachmentStructuralValidator(
  detected: AttachmentDetection,
  expectedSize: number,
): AttachmentStructuralValidator | null {
  switch (detected) {
    case "png": return new PngStructuralValidator(expectedSize);
    case "jpeg": return new JpegStructuralValidator(expectedSize);
    case "gif": return new GifStructuralValidator(expectedSize);
    case "webp": return new WebpStructuralValidator(expectedSize);
    case "pdf": return new PdfStructuralValidator(expectedSize);
    default: return null;
  }
}
