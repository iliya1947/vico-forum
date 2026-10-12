import type { AttachmentRandomAccessSource } from "./attachment-zip-validation";

export type ContainerStructuralDetection = "7z" | "gzip" | "tar" | "ole";

const READ_CHUNK_BYTES = 64 * 1024;
const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;
const FATSECT = 0xfffffffd;
const DIFSECT = 0xfffffffc;

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]!
    | (bytes[offset + 1]! << 8)
    | (bytes[offset + 2]! << 16)
    | ((bytes[offset + 3]! << 24) >>> 0)) >>> 0;
}

function u64Safe(bytes: Uint8Array, offset: number): number | null {
  if (offset + 8 > bytes.byteLength) return null;
  let value = 0n;
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << 8n) | BigInt(bytes[offset + index]!);
  }
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
}

function has(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  return offset + signature.length <= bytes.byteLength
    && signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, value: string): boolean {
  return [...value].every((character, index) =>
    bytes[offset + index] === character.charCodeAt(0));
}

async function readExact(
  source: AttachmentRandomAccessSource,
  offset: number,
  length: number,
): Promise<Uint8Array | null> {
  if (!Number.isSafeInteger(source.size) || !Number.isSafeInteger(offset)
    || !Number.isSafeInteger(length) || source.size < 0 || offset < 0 || length < 0
    || offset + length > source.size) return null;
  const bytes = await source.read(offset, length);
  return bytes.byteLength === length ? bytes : null;
}

class Crc32 {
  private value = 0xffffffff;

  update(bytes: Uint8Array): void {
    for (const byte of bytes) {
      let current = (this.value ^ byte) >>> 0;
      for (let bit = 0; bit < 8; bit += 1) {
        current = ((current >>> 1) ^ ((current & 1) ? 0xedb88320 : 0)) >>> 0;
      }
      this.value = current;
    }
  }

  digest(): number {
    return (this.value ^ 0xffffffff) >>> 0;
  }
}

function crc32(bytes: Uint8Array): number {
  const crc = new Crc32();
  crc.update(bytes);
  return crc.digest();
}

async function crc32Range(
  source: AttachmentRandomAccessSource,
  offset: number,
  length: number,
): Promise<number | null> {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)
    || offset < 0 || length < 0 || offset + length > source.size) return null;
  const crc = new Crc32();
  let cursor = offset;
  const end = offset + length;
  while (cursor < end) {
    const count = Math.min(READ_CHUNK_BYTES, end - cursor);
    const bytes = await readExact(source, cursor, count);
    if (!bytes) return null;
    crc.update(bytes);
    cursor += count;
  }
  return crc.digest();
}

export async function validate7zStructure(
  source: AttachmentRandomAccessSource,
): Promise<boolean> {
  const header = await readExact(source, 0, 32);
  if (!header || !has(header, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return false;
  if (header[6] !== 0) return false;

  const startHeader = header.subarray(12, 32);
  if (crc32(startHeader) !== u32(header, 8)) return false;
  const nextOffset = u64Safe(header, 12);
  const nextSize = u64Safe(header, 20);
  if (nextOffset === null || nextSize === null || nextSize <= 0) return false;

  const nextStart = 32 + nextOffset;
  const nextEnd = nextStart + nextSize;
  if (!Number.isSafeInteger(nextStart) || !Number.isSafeInteger(nextEnd)
    || nextStart < 32 || nextEnd > source.size) return false;

  const first = await readExact(source, nextStart, 1);
  if (!first || (first[0] !== 0x01 && first[0] !== 0x17)) return false;
  const actualCrc = await crc32Range(source, nextStart, nextSize);
  return actualCrc !== null && actualCrc === u32(header, 28);
}

async function updateCrcRange(
  source: AttachmentRandomAccessSource,
  crc: Crc32,
  offset: number,
  length: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)
    || offset < 0 || length < 0 || offset + length > source.size) return false;
  let cursor = offset;
  const end = offset + length;
  while (cursor < end) {
    const count = Math.min(READ_CHUNK_BYTES, end - cursor);
    const bytes = await readExact(source, cursor, count);
    if (!bytes) return false;
    crc.update(bytes);
    cursor += count;
  }
  return true;
}

async function consumeGzipZeroTerminated(
  source: AttachmentRandomAccessSource,
  crc: Crc32,
  offset: number,
  limit: number,
): Promise<number | null> {
  let cursor = offset;
  while (cursor < limit) {
    const count = Math.min(4096, limit - cursor);
    const bytes = await readExact(source, cursor, count);
    if (!bytes) return null;
    const zero = bytes.indexOf(0);
    const consumed = zero < 0 ? bytes.byteLength : zero + 1;
    crc.update(bytes.subarray(0, consumed));
    cursor += consumed;
    if (zero >= 0) return cursor;
  }
  return null;
}

export async function validateGzipStructure(
  source: AttachmentRandomAccessSource,
): Promise<boolean> {
  if (!Number.isSafeInteger(source.size) || source.size < 19) return false;
  const fixed = await readExact(source, 0, 10);
  if (!fixed || fixed[0] !== 0x1f || fixed[1] !== 0x8b || fixed[2] !== 8) return false;
  const flags = fixed[3]!;
  if ((flags & 0xe0) !== 0) return false;

  const crc = new Crc32();
  crc.update(fixed);
  let cursor = 10;
  const trailerOffset = source.size - 8;

  if ((flags & 0x04) !== 0) {
    const lengthBytes = await readExact(source, cursor, 2);
    if (!lengthBytes) return false;
    crc.update(lengthBytes);
    cursor += 2;
    const extraLength = u16(lengthBytes, 0);
    if (cursor + extraLength > trailerOffset
      || !await updateCrcRange(source, crc, cursor, extraLength)) return false;
    cursor += extraLength;
  }
  if ((flags & 0x08) !== 0) {
    const next = await consumeGzipZeroTerminated(source, crc, cursor, trailerOffset);
    if (next === null) return false;
    cursor = next;
  }
  if ((flags & 0x10) !== 0) {
    const next = await consumeGzipZeroTerminated(source, crc, cursor, trailerOffset);
    if (next === null) return false;
    cursor = next;
  }
  if ((flags & 0x02) !== 0) {
    const expected = await readExact(source, cursor, 2);
    if (!expected || u16(expected, 0) !== (crc.digest() & 0xffff)) return false;
    cursor += 2;
  }

  // Structural sanity only: payload is deliberately not decompressed here.
  if (cursor >= trailerOffset) return false;
  return await readExact(source, trailerOffset, 8) !== null;
}

function parseTarOctal(field: Uint8Array): number | null {
  let start = 0;
  while (start < field.byteLength && (field[start] === 0 || field[start] === 0x20)) start += 1;
  let end = field.byteLength;
  while (end > start && (field[end - 1] === 0 || field[end - 1] === 0x20)) end -= 1;
  if (start === end) return 0;
  let value = 0;
  for (let index = start; index < end; index += 1) {
    const byte = field[index]!;
    if (byte < 0x30 || byte > 0x37) return null;
    value = value * 8 + (byte - 0x30);
    if (!Number.isSafeInteger(value)) return null;
  }
  return value;
}

function parseTarNumber(field: Uint8Array): number | null {
  if (field.byteLength === 0) return null;
  if ((field[0]! & 0x80) === 0) return parseTarOctal(field);
  if (field[0] !== 0x80) return null;
  let value = 0n;
  for (let index = 1; index < field.byteLength; index += 1) {
    value = (value << 8n) | BigInt(field[index]!);
  }
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
}

function tarChecksum(header: Uint8Array): number {
  let sum = 0;
  for (let index = 0; index < header.byteLength; index += 1) {
    sum += index >= 148 && index < 156 ? 0x20 : header[index]!;
  }
  return sum;
}

function allZero(bytes: Uint8Array): boolean {
  return bytes.every((byte) => byte === 0);
}

export async function validateTarStructure(
  source: AttachmentRandomAccessSource,
): Promise<boolean> {
  if (!Number.isSafeInteger(source.size) || source.size < 512 || source.size % 512 !== 0) {
    return false;
  }

  let offset = 0;
  let entries = 0;
  while (offset + 512 <= source.size) {
    const header = await readExact(source, offset, 512);
    if (!header) return false;
    if (allZero(header)) {
      if (offset + 1024 > source.size) return false;
      const second = await readExact(source, offset + 512, 512);
      return second !== null && allZero(second);
    }

    if (!ascii(header, 257, "ustar")) return false;
    const storedChecksum = parseTarOctal(header.subarray(148, 156));
    if (storedChecksum === null || storedChecksum !== tarChecksum(header)) return false;
    const size = parseTarNumber(header.subarray(124, 136));
    if (size === null) return false;

    const dataStart = offset + 512;
    const blocks = Math.ceil(size / 512);
    const next = dataStart + blocks * 512;
    if (!Number.isSafeInteger(next) || next > source.size) return false;
    entries += 1;
    offset = next;
  }

  // GNU readers accept an archive that ends cleanly without the conventional two zero blocks.
  return entries > 0 && offset === source.size;
}

function validCfbSectorId(sector: number, totalSectors: number): boolean {
  return Number.isInteger(sector) && sector >= 0 && sector < totalSectors;
}

function sectorOffset(sector: number, sectorSize: number): number {
  return (sector + 1) * sectorSize;
}

async function validateCfbRootDirectory(
  source: AttachmentRandomAccessSource,
  directorySector: number,
  sectorSize: number,
): Promise<boolean> {
  const entry = await readExact(source, sectorOffset(directorySector, sectorSize), 128);
  if (!entry) return false;
  const rootName = new TextEncoder().encode("Root Entry");
  if (u16(entry, 64) !== 22 || entry[66] !== 0x05) return false;
  for (let index = 0; index < rootName.byteLength; index += 1) {
    const at = index * 2;
    if (entry[at] !== rootName[index] || entry[at + 1] !== 0) return false;
  }
  return entry[20] === 0 && entry[21] === 0;
}

export async function validateOleStructure(
  source: AttachmentRandomAccessSource,
): Promise<boolean> {
  const header = await readExact(source, 0, 512);
  if (!header || !has(header, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return false;
  }
  if (!allZero(header.subarray(8, 24)) || !allZero(header.subarray(34, 40))) return false;

  const major = u16(header, 26);
  const sectorShift = u16(header, 30);
  const sectorSize = 2 ** sectorShift;
  if (u16(header, 28) !== 0xfffe || u16(header, 32) !== 6
    || !((major === 3 && sectorShift === 9) || (major === 4 && sectorShift === 12))
    || u32(header, 56) !== 0x1000) return false;
  if (major === 3 && u32(header, 40) !== 0) return false;
  if (!Number.isSafeInteger(source.size) || source.size < sectorSize * 3
    || source.size % sectorSize !== 0) return false;

  if (major === 4) {
    const padding = await readExact(source, 512, sectorSize - 512);
    if (!padding || !allZero(padding)) return false;
  }

  const totalSectors = source.size / sectorSize - 1;
  const fatCount = u32(header, 44);
  const firstDirectory = u32(header, 48);
  const firstDifat = u32(header, 68);
  const difatCount = u32(header, 72);
  if (fatCount === 0 || fatCount > totalSectors
    || !validCfbSectorId(firstDirectory, totalSectors)) return false;

  const fatSectors: number[] = [];
  const fatSet = new Set<number>();
  const addFat = (sector: number): boolean => {
    if (!validCfbSectorId(sector, totalSectors) || fatSet.has(sector)) return false;
    fatSet.add(sector);
    fatSectors.push(sector);
    return true;
  };

  for (let index = 0; index < 109 && fatSectors.length < fatCount; index += 1) {
    const sector = u32(header, 76 + index * 4);
    if (sector === FREESECT) continue;
    if (!addFat(sector)) return false;
  }

  const difatSectors: number[] = [];
  const difatSet = new Set<number>();
  const difatEntries = sectorSize / 4 - 1;
  let difat = firstDifat;
  for (let index = 0; index < difatCount; index += 1) {
    if (!validCfbSectorId(difat, totalSectors) || difatSet.has(difat)
      || fatSet.has(difat)) return false;
    difatSet.add(difat);
    difatSectors.push(difat);
    const sector = await readExact(source, sectorOffset(difat, sectorSize), sectorSize);
    if (!sector) return false;
    for (let at = 0; at < difatEntries && fatSectors.length < fatCount; at += 1) {
      const fat = u32(sector, at * 4);
      if (fat === FREESECT) continue;
      if (!addFat(fat)) return false;
    }
    difat = u32(sector, difatEntries * 4);
  }
  if ((difatCount === 0 && firstDifat !== ENDOFCHAIN)
    || (difatCount > 0 && difat !== ENDOFCHAIN)
    || fatSectors.length !== fatCount) return false;

  const entriesPerFat = sectorSize / 4;
  const fatNext = async (sector: number): Promise<number | null> => {
    if (!validCfbSectorId(sector, totalSectors)) return null;
    const fatIndex = Math.floor(sector / entriesPerFat);
    if (fatIndex >= fatSectors.length) return null;
    const within = sector % entriesPerFat;
    const bytes = await readExact(
      source,
      sectorOffset(fatSectors[fatIndex]!, sectorSize) + within * 4,
      4,
    );
    return bytes ? u32(bytes, 0) : null;
  };

  for (const fat of fatSectors) {
    if (await fatNext(fat) !== FATSECT) return false;
  }
  for (const sector of difatSectors) {
    if (await fatNext(sector) !== DIFSECT) return false;
  }

  const directorySeen = new Set<number>();
  let directory = firstDirectory;
  let first = true;
  while (directory !== ENDOFCHAIN) {
    if (!validCfbSectorId(directory, totalSectors) || directorySeen.has(directory)
      || fatSet.has(directory) || difatSet.has(directory)) return false;
    directorySeen.add(directory);
    if (first && !await validateCfbRootDirectory(source, directory, sectorSize)) return false;
    first = false;
    const next = await fatNext(directory);
    if (next === null || next === FREESECT || next === FATSECT || next === DIFSECT) return false;
    directory = next;
    if (directorySeen.size > totalSectors) return false;
  }

  if (directorySeen.size === 0) return false;
  return major === 3 || u32(header, 40) === directorySeen.size;
}

export async function validateContainerAttachmentStructure(
  source: AttachmentRandomAccessSource,
  detected: ContainerStructuralDetection,
): Promise<boolean> {
  switch (detected) {
    case "7z": return validate7zStructure(source);
    case "gzip": return validateGzipStructure(source);
    case "tar": return validateTarStructure(source);
    case "ole": return validateOleStructure(source);
  }
}
