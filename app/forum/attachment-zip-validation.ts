export type ZipAttachmentSemantic = "zip" | "docx" | "xlsx" | "pptx" | "odt" | "ods";

export interface AttachmentRandomAccessSource {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}

const EOCD_FIXED_BYTES = 22;
const MAX_ZIP_COMMENT_BYTES = 0xffff;
const CENTRAL_FILE_HEADER_BYTES = 46;
const LOCAL_FILE_HEADER_BYTES = 30;

const ZIP_SIGNATURE = {
  local: 0x04034b50,
  central: 0x02014b50,
  eocd: 0x06054b50,
  zip64Eocd: 0x06064b50,
  zip64Locator: 0x07064b50,
  archiveExtra: 0x08064b50,
  digitalSignature: 0x05054b50,
} as const;

type ZipDirectory = {
  entries: number;
  offset: number;
  size: number;
};

type CentralEntry = {
  name: Uint8Array;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

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

function hasSignature(bytes: Uint8Array, offset: number, signature: number): boolean {
  return offset + 4 <= bytes.byteLength && u32(bytes, offset) === signature;
}

function asciiBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((byte, index) => right[index] === byte);
}

function nameIs(name: Uint8Array, expected: string): boolean {
  return equalBytes(name, asciiBytes(expected));
}

async function readExact(
  source: AttachmentRandomAccessSource,
  offset: number,
  length: number,
): Promise<Uint8Array | null> {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)
    || offset < 0 || length < 0 || offset + length > source.size) return null;
  const result = await source.read(offset, length);
  return result.byteLength === length ? result : null;
}

async function findDirectory(source: AttachmentRandomAccessSource): Promise<ZipDirectory | null> {
  if (!Number.isSafeInteger(source.size) || source.size < EOCD_FIXED_BYTES) return null;
  const tailLength = Math.min(source.size, EOCD_FIXED_BYTES + MAX_ZIP_COMMENT_BYTES);
  const tailOffset = source.size - tailLength;
  const tail = await readExact(source, tailOffset, tailLength);
  if (!tail) return null;

  for (let index = tail.byteLength - EOCD_FIXED_BYTES; index >= 0; index -= 1) {
    if (!hasSignature(tail, index, ZIP_SIGNATURE.eocd)) continue;
    const commentLength = u16(tail, index + 20);
    if (index + EOCD_FIXED_BYTES + commentLength !== tail.byteLength) continue;

    const eocdOffset = tailOffset + index;
    const disk = u16(tail, index + 4);
    const directoryDisk = u16(tail, index + 6);
    const entriesOnDisk = u16(tail, index + 8);
    const entries = u16(tail, index + 10);
    const directorySize = u32(tail, index + 12);
    const directoryOffset = u32(tail, index + 16);
    if (disk !== 0 || directoryDisk !== 0) return null;

    const needsZip64 = entriesOnDisk === 0xffff || entries === 0xffff
      || directorySize === 0xffffffff || directoryOffset === 0xffffffff;
    if (!needsZip64) {
      const directoryEnd = directoryOffset + directorySize;
      if (!Number.isSafeInteger(directoryEnd)
        || entriesOnDisk !== entries || directoryEnd !== eocdOffset) return null;
      return { entries, offset: directoryOffset, size: directorySize };
    }

    const locatorOffset = eocdOffset - 20;
    const locator = await readExact(source, locatorOffset, 20);
    if (!locator || !hasSignature(locator, 0, ZIP_SIGNATURE.zip64Locator)
      || u32(locator, 4) !== 0 || u32(locator, 16) !== 1) return null;
    const zip64Offset = u64Safe(locator, 8);
    if (zip64Offset === null) return null;
    const zip64Fixed = await readExact(source, zip64Offset, 56);
    if (!zip64Fixed || !hasSignature(zip64Fixed, 0, ZIP_SIGNATURE.zip64Eocd)) return null;
    const recordPayloadSize = u64Safe(zip64Fixed, 4);
    const zip64RecordEnd = recordPayloadSize === null ? null : zip64Offset + 12 + recordPayloadSize;
    if (recordPayloadSize === null || recordPayloadSize < 44
      || zip64RecordEnd === null || !Number.isSafeInteger(zip64RecordEnd)
      || zip64RecordEnd !== locatorOffset
      || u32(zip64Fixed, 16) !== 0 || u32(zip64Fixed, 20) !== 0) return null;

    const entriesOnDisk64 = u64Safe(zip64Fixed, 24);
    const entries64 = u64Safe(zip64Fixed, 32);
    const directorySize64 = u64Safe(zip64Fixed, 40);
    const directoryOffset64 = u64Safe(zip64Fixed, 48);
    const directoryEnd64 = directoryOffset64 === null || directorySize64 === null
      ? null : directoryOffset64 + directorySize64;
    if (entriesOnDisk64 === null || entries64 === null || directorySize64 === null
      || directoryOffset64 === null || directoryEnd64 === null
      || !Number.isSafeInteger(directoryEnd64) || entriesOnDisk64 !== entries64
      || directoryEnd64 !== zip64Offset) return null;
    return { entries: entries64, offset: directoryOffset64, size: directorySize64 };
  }
  return null;
}

type Zip64CentralValues = {
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  disk: number;
};

function resolveZip64Central(
  extra: Uint8Array,
  compressed32: number,
  uncompressed32: number,
  localOffset32: number,
  disk16: number,
): Zip64CentralValues | null {
  let compressedSize = compressed32;
  let uncompressedSize = uncompressed32;
  let localOffset = localOffset32;
  let disk = disk16;
  const needs = compressed32 === 0xffffffff || uncompressed32 === 0xffffffff
    || localOffset32 === 0xffffffff || disk16 === 0xffff;
  if (!needs) return { compressedSize, uncompressedSize, localOffset, disk };

  let cursor = 0;
  while (cursor + 4 <= extra.byteLength) {
    const id = u16(extra, cursor);
    const size = u16(extra, cursor + 2);
    const dataStart = cursor + 4;
    const dataEnd = dataStart + size;
    if (dataEnd > extra.byteLength) return null;
    if (id === 0x0001) {
      let position = dataStart;
      const take64 = (): number | null => {
        if (position + 8 > dataEnd) return null;
        const value = u64Safe(extra, position);
        if (value === null) return null;
        position += 8;
        return value;
      };
      if (uncompressed32 === 0xffffffff) {
        const value = take64();
        if (value === null) return null;
        uncompressedSize = value;
      }
      if (compressed32 === 0xffffffff) {
        const value = take64();
        if (value === null) return null;
        compressedSize = value;
      }
      if (localOffset32 === 0xffffffff) {
        const value = take64();
        if (value === null) return null;
        localOffset = value;
      }
      if (disk16 === 0xffff) {
        if (position + 4 > dataEnd) return null;
        disk = u32(extra, position);
      }
      return { compressedSize, uncompressedSize, localOffset, disk };
    }
    cursor = dataEnd;
  }
  return null;
}

async function readCentralEntry(
  source: AttachmentRandomAccessSource,
  offset: number,
  directoryEnd: number,
): Promise<{ entry: CentralEntry; next: number } | null> {
  const fixed = await readExact(source, offset, CENTRAL_FILE_HEADER_BYTES);
  if (!fixed || !hasSignature(fixed, 0, ZIP_SIGNATURE.central)) return null;
  const nameLength = u16(fixed, 28);
  const extraLength = u16(fixed, 30);
  const commentLength = u16(fixed, 32);
  const variableLength = nameLength + extraLength + commentLength;
  const next = offset + CENTRAL_FILE_HEADER_BYTES + variableLength;
  if (next > directoryEnd) return null;

  const variable = await readExact(source, offset + CENTRAL_FILE_HEADER_BYTES, variableLength);
  if (!variable) return null;
  const name = variable.subarray(0, nameLength);
  const extra = variable.subarray(nameLength, nameLength + extraLength);
  const resolved = resolveZip64Central(
    extra,
    u32(fixed, 20),
    u32(fixed, 24),
    u32(fixed, 42),
    u16(fixed, 34),
  );
  if (!resolved || resolved.disk !== 0) return null;
  return {
    entry: {
      name,
      flags: u16(fixed, 8),
      method: u16(fixed, 10),
      compressedSize: resolved.compressedSize,
      uncompressedSize: resolved.uncompressedSize,
      localOffset: resolved.localOffset,
    },
    next,
  };
}

async function localHeaderMatches(
  source: AttachmentRandomAccessSource,
  entry: CentralEntry,
  directoryOffset: number,
): Promise<{ dataOffset: number; extraLength: number } | null> {
  const fixed = await readExact(source, entry.localOffset, LOCAL_FILE_HEADER_BYTES);
  if (!fixed || !hasSignature(fixed, 0, ZIP_SIGNATURE.local)) return null;
  const nameLength = u16(fixed, 26);
  const extraLength = u16(fixed, 28);
  const end = entry.localOffset + LOCAL_FILE_HEADER_BYTES + nameLength + extraLength;
  if (end > directoryOffset || u16(fixed, 6) !== entry.flags || u16(fixed, 8) !== entry.method) {
    return null;
  }
  const name = await readExact(source, entry.localOffset + LOCAL_FILE_HEADER_BYTES, nameLength);
  if (!name || !equalBytes(name, entry.name)) return null;
  return { dataOffset: end, extraLength };
}

function requiredPackageName(semantic: ZipAttachmentSemantic, name: Uint8Array): boolean {
  if (semantic === "zip") return false;
  if (nameIs(name, "[Content_Types].xml") || nameIs(name, "_rels/.rels")) return true;
  if (semantic === "docx" && nameIs(name, "word/document.xml")) return true;
  if (semantic === "xlsx" && nameIs(name, "xl/workbook.xml")) return true;
  if (semantic === "pptx" && nameIs(name, "ppt/presentation.xml")) return true;
  if ((semantic === "odt" || semantic === "ods")
    && (nameIs(name, "mimetype") || nameIs(name, "META-INF/manifest.xml")
      || nameIs(name, "content.xml") || nameIs(name, "styles.xml"))) return true;
  return false;
}

function expectedOdfMime(semantic: ZipAttachmentSemantic): string | null {
  if (semantic === "odt") return "application/vnd.oasis.opendocument.text";
  if (semantic === "ods") return "application/vnd.oasis.opendocument.spreadsheet";
  return null;
}

async function validateOdfMime(
  source: AttachmentRandomAccessSource,
  entry: CentralEntry,
  local: { dataOffset: number; extraLength: number },
  semantic: ZipAttachmentSemantic,
): Promise<boolean> {
  const expected = expectedOdfMime(semantic);
  if (!expected) return true;
  const bytes = asciiBytes(expected);
  if (!nameIs(entry.name, "mimetype") || entry.localOffset !== 0 || entry.method !== 0
    || local.extraLength !== 0 || (entry.flags & 1) !== 0
    || entry.compressedSize !== bytes.byteLength || entry.uncompressedSize !== bytes.byteLength) {
    return false;
  }
  const actual = await readExact(source, local.dataOffset, bytes.byteLength);
  return actual !== null && equalBytes(actual, bytes);
}

function packageRequirementsSatisfied(
  semantic: ZipAttachmentSemantic,
  seen: ReadonlyMap<string, number>,
): boolean {
  if (semantic === "zip") return true;
  const one = (name: string) => seen.get(name) === 1;
  if (semantic === "docx") {
    return one("[Content_Types].xml") && one("_rels/.rels") && one("word/document.xml");
  }
  if (semantic === "xlsx") {
    return one("[Content_Types].xml") && one("_rels/.rels") && one("xl/workbook.xml");
  }
  if (semantic === "pptx") {
    return one("[Content_Types].xml") && one("_rels/.rels") && one("ppt/presentation.xml");
  }
  return one("mimetype") && one("META-INF/manifest.xml")
    && ((seen.get("content.xml") ?? 0) + (seen.get("styles.xml") ?? 0) >= 1);
}

/**
 * Final structural sanity for ZIP-backed attachments.
 *
 * ZIP is trailer-directed: EOCD is authoritative for locating the central directory.
 * A random-access source keeps validation bounded without buffering the whole archive.
 * Storage integration supplies this boundary only after the private object is written.
 */
export async function validateZipAttachmentStructure(
  source: AttachmentRandomAccessSource,
  semantic: ZipAttachmentSemantic,
): Promise<boolean> {
  const directory = await findDirectory(source);
  if (!directory) return false;
  if (directory.entries === 0) {
    return semantic === "zip" && directory.offset === 0 && directory.size === 0;
  }
  const directoryEnd = directory.offset + directory.size;
  if (!Number.isSafeInteger(directoryEnd) || directory.offset < 0
    || directoryEnd > source.size || directory.size <= 0
    || directory.entries > Math.floor(directory.size / CENTRAL_FILE_HEADER_BYTES)) return false;

  let cursor = directory.offset;
  const archiveExtra = await readExact(source, cursor, Math.min(8, directory.size));
  if (archiveExtra?.byteLength === 8 && hasSignature(archiveExtra, 0, ZIP_SIGNATURE.archiveExtra)) {
    const recordSize = u32(archiveExtra, 4);
    cursor += 8 + recordSize;
    if (cursor > directoryEnd) return false;
  }

  const seen = new Map<string, number>();
  for (let index = 0; index < directory.entries; index += 1) {
    const parsed = await readCentralEntry(source, cursor, directoryEnd);
    if (!parsed || parsed.entry.localOffset >= directory.offset) return false;
    const entry = parsed.entry;
    const trackedNames = [
      "[Content_Types].xml", "_rels/.rels", "word/document.xml", "xl/workbook.xml",
      "ppt/presentation.xml", "mimetype", "META-INF/manifest.xml", "content.xml", "styles.xml",
    ];
    for (const tracked of trackedNames) {
      if (nameIs(entry.name, tracked)) seen.set(tracked, (seen.get(tracked) ?? 0) + 1);
    }

    if ((semantic === "odt" || semantic === "ods") && entry.method !== 0 && entry.method !== 8) {
      return false;
    }

    const local = await localHeaderMatches(source, entry, directory.offset);
    if (!local) return false;
    if (requiredPackageName(semantic, entry.name) && (entry.flags & 1) !== 0) return false;
    if ((semantic === "odt" || semantic === "ods") && nameIs(entry.name, "mimetype")
      && !await validateOdfMime(source, entry, local, semantic)) return false;
    cursor = parsed.next;
  }

  if (cursor < directoryEnd) {
    const signature = await readExact(source, cursor, 6);
    if (!signature || !hasSignature(signature, 0, ZIP_SIGNATURE.digitalSignature)) return false;
    cursor += 6 + u16(signature, 4);
  }
  return cursor === directoryEnd && packageRequirementsSatisfied(semantic, seen);
}
