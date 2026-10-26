import { describe, expect, it } from "vitest";
import {
  validate7zStructure,
  validateContainerAttachmentStructure,
  validateGzipStructure,
  validateOleStructure,
  validateTarStructure,
} from "./attachment-container-validation";
import type { AttachmentRandomAccessSource } from "./attachment-zip-validation";

const text = (value: string) => new TextEncoder().encode(value);

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}
function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}
function u64(value: number): number[] {
  const result: number[] = [];
  let current = BigInt(value);
  for (let index = 0; index < 8; index += 1) {
    result.push(Number(current & 0xffn));
    current >>= 8n;
  }
  return result;
}
function concat(...parts: Array<Uint8Array | number[]>): Uint8Array {
  const arrays = parts.map((part) => part instanceof Uint8Array ? part : Uint8Array.from(part));
  const total = arrays.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of arrays) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc ^ byte) >>> 0;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = ((crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)) >>> 0;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function source(bytes: Uint8Array, reads?: Array<{ offset: number; length: number }>)
  : AttachmentRandomAccessSource {
  return {
    size: bytes.byteLength,
    async read(offset, length) {
      reads?.push({ offset, length });
      return bytes.slice(offset, offset + length);
    },
  };
}

function sevenZip(nextHeader: Uint8Array = Uint8Array.from([0x01, 0x00]), offset = 0): Uint8Array {
  const nextCrc = crc32(nextHeader);
  const start = Uint8Array.from([...u64(offset), ...u64(nextHeader.byteLength), ...u32(nextCrc)]);
  const startCrc = crc32(start);
  return concat(
    [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x04],
    u32(startCrc),
    start,
    new Uint8Array(offset),
    nextHeader,
  );
}

function gzip(flags = 0, optional = new Uint8Array()): Uint8Array {
  const fixed = Uint8Array.from([0x1f, 0x8b, 0x08, flags, 0, 0, 0, 0, 0, 0xff]);
  return concat(fixed, optional, [0x03], new Uint8Array(8));
}

function gzipWithNameAndHeaderCrc(name = "file.txt"): Uint8Array {
  const fixed = Uint8Array.from([0x1f, 0x8b, 0x08, 0x0a, 0, 0, 0, 0, 0, 0xff]);
  const named = concat(fixed, text(name), [0]);
  const headerCrc = crc32(named) & 0xffff;
  return concat(named, u16(headerCrc), [0x03], new Uint8Array(8));
}

function writeAscii(target: Uint8Array, offset: number, value: string): void {
  target.set(text(value), offset);
}
function writeOctal(target: Uint8Array, offset: number, length: number, value: number): void {
  const body = value.toString(8).padStart(length - 2, "0");
  writeAscii(target, offset, body);
  target[offset + length - 2] = 0;
  target[offset + length - 1] = 0x20;
}
function tarHeader(size: number, base256 = false): Uint8Array {
  const header = new Uint8Array(512);
  writeAscii(header, 0, "file.bin");
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  if (base256) {
    header[124] = 0x80;
    let value = BigInt(size);
    for (let index = 135; index >= 125; index -= 1) {
      header[index] = Number(value & 0xffn);
      value >>= 8n;
    }
  } else {
    writeOctal(header, 124, 12, size);
  }
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeAscii(header, 257, "ustar");
  header[262] = 0;
  writeAscii(header, 263, "00");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeOctal(header, 148, 8, checksum);
  return header;
}
function tar(data = Uint8Array.from([1]), includeEnd = true, base256 = false): Uint8Array {
  const header = tarHeader(data.byteLength, base256);
  const padding = new Uint8Array(Math.ceil(data.byteLength / 512) * 512 - data.byteLength);
  return concat(header, data, padding, includeEnd ? new Uint8Array(1024) : new Uint8Array());
}

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;
const FATSECT = 0xfffffffd;

function putU16(target: Uint8Array, offset: number, value: number): void {
  target.set(u16(value), offset);
}
function putU32(target: Uint8Array, offset: number, value: number): void {
  target.set(u32(value), offset);
}

function cfb(major: 3 | 4 = 3): Uint8Array {
  const sectorSize = major === 3 ? 512 : 4096;
  const headerSector = new Uint8Array(sectorSize);
  headerSector.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
  putU16(headerSector, 24, 0x003e);
  putU16(headerSector, 26, major);
  putU16(headerSector, 28, 0xfffe);
  putU16(headerSector, 30, major === 3 ? 9 : 12);
  putU16(headerSector, 32, 6);
  putU32(headerSector, 40, major === 3 ? 0 : 1);
  putU32(headerSector, 44, 1);
  putU32(headerSector, 48, 1);
  putU32(headerSector, 56, 0x1000);
  putU32(headerSector, 60, ENDOFCHAIN);
  putU32(headerSector, 64, 0);
  putU32(headerSector, 68, ENDOFCHAIN);
  putU32(headerSector, 72, 0);
  for (let index = 0; index < 109; index += 1) {
    putU32(headerSector, 76 + index * 4, index === 0 ? 0 : FREESECT);
  }

  const fat = new Uint8Array(sectorSize);
  for (let index = 0; index < sectorSize / 4; index += 1) putU32(fat, index * 4, FREESECT);
  putU32(fat, 0, FATSECT);
  putU32(fat, 4, ENDOFCHAIN);

  const directory = new Uint8Array(sectorSize);
  const root = "Root Entry\0";
  for (let index = 0; index < root.length; index += 1) {
    putU16(directory, index * 2, root.charCodeAt(index));
  }
  putU16(directory, 64, 22);
  directory[66] = 0x05;
  directory[67] = 0x01;
  putU32(directory, 68, FREESECT);
  putU32(directory, 72, FREESECT);
  putU32(directory, 76, FREESECT);
  putU32(directory, 116, ENDOFCHAIN);

  return concat(headerSector, fat, directory);
}

describe("remaining archive/container structural validation", () => {
  it("validates 7z start-header and next-header CRCs using bounded reads", async () => {
    const archive = sevenZip();
    expect(await validate7zStructure(source(archive))).toBe(true);
    expect(await validate7zStructure(source(archive.subarray(0, 31)))).toBe(false);

    const badStart = archive.slice();
    badStart[8] ^= 1;
    expect(await validate7zStructure(source(badStart))).toBe(false);

    const badNext = archive.slice();
    badNext[32] ^= 1;
    expect(await validate7zStructure(source(badNext))).toBe(false);

    const largeHeader = sevenZip(concat([0x01], new Uint8Array(70_000)));
    const reads: Array<{ offset: number; length: number }> = [];
    expect(await validate7zStructure(source(largeHeader, reads))).toBe(true);
    expect(Math.max(...reads.map((read) => read.length))).toBeLessThanOrEqual(65_536);
  });

  it("checks gzip header flags, optional fields and header CRC without decompressing payload", async () => {
    expect(await validateGzipStructure(source(gzip()))).toBe(true);
    expect(await validateGzipStructure(source(gzipWithNameAndHeaderCrc()))).toBe(true);
    expect(await validateGzipStructure(source(gzip(0x20)))).toBe(false);

    const badCrc = gzipWithNameAndHeaderCrc();
    badCrc[badCrc.indexOf(0) + 1] ^= 1;
    expect(await validateGzipStructure(source(badCrc))).toBe(false);

    const unterminated = gzip(0x08, text("name-without-null"));
    expect(await validateGzipStructure(source(unterminated))).toBe(false);
    expect(await validateGzipStructure(source(gzip().subarray(0, 10)))).toBe(false);
  });

  it("walks tar records by declared size and validates ustar checksum", async () => {
    const archive = tar();
    expect(await validateTarStructure(source(archive))).toBe(true);
    expect(await validateTarStructure(source(tar(Uint8Array.from([1]), false)))).toBe(true);
    expect(await validateTarStructure(source(tar(Uint8Array.from([1]), true, true)))).toBe(true);

    const badChecksum = archive.slice();
    badChecksum[0] ^= 1;
    expect(await validateTarStructure(source(badChecksum))).toBe(false);

    const truncated = concat(tarHeader(1024), new Uint8Array(512));
    expect(await validateTarStructure(source(truncated))).toBe(false);
  });

  it("accepts empty TAR zero end blocks but rejects nonzero trailing data", async () => {
    expect(await validateTarStructure(source(new Uint8Array(1024)))).toBe(true);
    expect(await validateTarStructure(source(new Uint8Array(10_240)))).toBe(true);
    expect(await validateTarStructure(source(new Uint8Array(512)))).toBe(false);

    const malformed = new Uint8Array(1536);
    malformed[1024] = 1;
    expect(await validateTarStructure(source(malformed))).toBe(false);

    const padded = new Uint8Array(1024 + 65_536 + 512);
    padded[padded.length - 1] = 1;
    const reads: Array<{ offset: number; length: number }> = [];
    expect(await validateTarStructure(source(padded, reads))).toBe(false);
    expect(Math.max(...reads.map(({ length }) => length))).toBeLessThanOrEqual(65_536);
  });

  it("validates CFB header, FAT directory chain and root entry for legacy Office containers", async () => {
    expect(await validateOleStructure(source(cfb(3)))).toBe(true);
    expect(await validateOleStructure(source(cfb(4)))).toBe(true);

    const badShift = cfb(3);
    putU16(badShift, 30, 8);
    expect(await validateOleStructure(source(badShift))).toBe(false);

    const badDirectory = cfb(3);
    putU32(badDirectory, 48, 9);
    expect(await validateOleStructure(source(badDirectory))).toBe(false);

    const extraFat = cfb(3);
    putU32(extraFat, 80, 1);
    expect(await validateOleStructure(source(extraFat))).toBe(false);

    const brokenChain = cfb(3);
    putU32(brokenChain, 512 + 4, FREESECT);
    expect(await validateOleStructure(source(brokenChain))).toBe(false);

    const badRoot = cfb(3);
    badRoot[1024 + 66] = 0x02;
    expect(await validateOleStructure(source(badRoot))).toBe(false);

    const badV4Padding = cfb(4);
    badV4Padding[700] = 1;
    expect(await validateOleStructure(source(badV4Padding))).toBe(false);
  });

  it("dispatches all remaining supported container families and propagates read failures", async () => {
    expect(await validateContainerAttachmentStructure(source(sevenZip()), "7z")).toBe(true);
    expect(await validateContainerAttachmentStructure(source(gzip()), "gzip")).toBe(true);
    expect(await validateContainerAttachmentStructure(source(tar()), "tar")).toBe(true);
    expect(await validateContainerAttachmentStructure(source(cfb()), "ole")).toBe(true);

    await expect(validateContainerAttachmentStructure({
      size: 64,
      async read() { throw new Error("storage unavailable"); },
    }, "7z")).rejects.toThrow("storage unavailable");
  });
});
