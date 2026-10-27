import { describe, expect, it } from "vitest";
import { inflateRawSync } from "node:zlib";
import { classicManyEntryZip, descriptorOverlapZip } from "./attachment-zip.test-fixtures";
import {
  validateZipAttachmentStructure,
  type AttachmentRandomAccessSource,
  type ZipAttachmentSemantic,
} from "./attachment-zip-validation";

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

type Entry = { name: string; data?: Uint8Array; method?: number; descriptor?: "signed" | "unsigned" | "missing"; zip64?: boolean; crc?: number; comment?: Uint8Array };
function buildZip(entries: Entry[], zip64 = false): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const item of entries) {
    const name = text(item.name);
    const data = item.data ?? text("x");
    const method = item.method ?? 0;
    const flags = item.descriptor ? 8 : 0;
    const crc = item.crc ?? 0;
    const comment = item.comment ?? new Uint8Array();
    const extra = item.zip64 ? concat(u16(1), u16(16), u64(data.length), u64(data.length)) : new Uint8Array();
    const size = item.zip64 ? 0xffffffff : data.length;
    const descriptor = item.descriptor && item.descriptor !== "missing"
      ? concat(item.descriptor === "signed" ? u32(0x08074b50) : [], u32(crc),
        item.zip64 ? u64(data.length) : u32(data.length), item.zip64 ? u64(data.length) : u32(data.length))
      : new Uint8Array();
    const local = concat(
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0), u16(0),
      u32(flags ? 0 : crc), u32(flags && !item.zip64 ? 0 : size), u32(flags && !item.zip64 ? 0 : size),
      u16(name.byteLength), u16(extra.length), name, extra, data, descriptor,
    );
    localParts.push(local);
    centralParts.push(concat(
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(0), u16(0),
      u32(crc), u32(size), u32(size),
      u16(name.byteLength), u16(extra.length), u16(comment.length), u16(0), u16(0), u32(0), u32(offset), name, extra, comment,
    ));
    offset += local.byteLength;
  }
  const locals = concat(...localParts);
  const central = concat(...centralParts);
  if (!zip64) {
    return concat(
      locals, central,
      u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(central.byteLength), u32(locals.byteLength), u16(0),
    );
  }
  const zip64Offset = locals.byteLength + central.byteLength;
  const zip64Eocd = concat(
    u32(0x06064b50), u64(44), u16(45), u16(45), u32(0), u32(0),
    u64(entries.length), u64(entries.length), u64(central.byteLength), u64(locals.byteLength),
  );
  const locator = concat(u32(0x07064b50), u32(0), u64(zip64Offset), u32(1));
  const eocd = concat(
    u32(0x06054b50), u16(0), u16(0), u16(0xffff), u16(0xffff),
    u32(0xffffffff), u32(0xffffffff), u16(0),
  );
  return concat(locals, central, zip64Eocd, locator, eocd);
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

async function valid(bytes: Uint8Array, semantic: ZipAttachmentSemantic): Promise<boolean> {
  return validateZipAttachmentStructure(source(bytes), semantic);
}

describe("ZIP attachment structural validation", () => {
  it("rejects a missing descriptor aliased by the next real local header", async () => {
    const malformed = descriptorOverlapZip("missing");
    expect(malformed.length).toBe(201);
    expect([...inflateRawSync(malformed.subarray(31, 51))]).toEqual([65, 66, 67, 68, 213, 112, 45, 223]);
    expect(await valid(malformed, "zip")).toBe(false);
    expect(await valid(descriptorOverlapZip("unsigned"), "zip")).toBe(true);
    expect(await valid(descriptorOverlapZip("signed"), "zip")).toBe(true);
  });

  it("checks physical boundaries independently of central directory order", async () => {
    expect(await valid(classicManyEntryZip(8, true), "zip")).toBe(true);
  });

  it("accepts exactly 65,535 classic entries without requiring a ZIP64 locator", async () => {
    expect(await valid(buildZip(Array.from({ length: 65535 }, (_, i) => ({ name: String(i), data: new Uint8Array() }))), "zip")).toBe(true);
    const missingZip64 = buildZip([{ name: "a" }], true);
    // Saturated 32-bit fields cannot be interpreted as a classic directory.
    missingZip64[missingZip64.length - 42] = 0;
    expect(await valid(missingZip64, "zip")).toBe(false);
  }, 30_000);

  it("does not interpret a classic central comment as a ZIP64 locator", async () => {
    const comment = concat(u32(0x07064b50), new Uint8Array(16));
    expect(await valid(buildZip([{ name: "a", comment }]), "zip")).toBe(true);
  });

  it.each([14, 18, 22, 6])("rejects inconsistent local CRC/size/flags at offset %i", async (offset) => {
    const bytes = buildZip([{ name: "a" }]);
    bytes[offset] = bytes[offset]! ^ 1;
    expect(await valid(bytes, "zip")).toBe(false);
  });

  it.each(["signed", "unsigned"] as const)("requires a consistent %s data descriptor", async (descriptor) => {
    const bytes = buildZip([{ name: "a", descriptor }]);
    expect(await valid(bytes, "zip")).toBe(true);
    const descriptorOffset = 32;
    for (const relative of [0, 4, 8]) {
      const broken = bytes.slice();
      broken[descriptorOffset + (descriptor === "signed" ? 4 : 0) + relative] ^= 1;
      expect(await valid(broken, "zip")).toBe(false);
    }
    expect(await valid(buildZip([{ name: "a", descriptor: "missing" }]), "zip")).toBe(false);
  });

  it.each(["signed", "unsigned"] as const)("validates ZIP64 %s descriptors and CRC/signature ambiguity", async (descriptor) => {
    const zip = buildZip([{ name: "a", descriptor, zip64: true, crc: 0x08074b50 }]);
    expect(await valid(zip, "zip")).toBe(true);
    const descriptorOffset = 52;
    for (const relative of [0, 4, 12]) {
      const broken = zip.slice();
      broken[descriptorOffset + (descriptor === "signed" ? 4 : 0) + relative] ^= 1;
      expect(await valid(broken, "zip")).toBe(false);
    }
    expect(await valid(buildZip([{ name: "a", zip64: true, descriptor: "missing" }]), "zip")).toBe(false);
    expect(await valid(buildZip([{ name: "a", zip64: true, crc: 42 }]), "zip")).toBe(true);
  });

  it("accepts an ordinary ZIP and rejects truncated or inconsistent central metadata", async () => {
    const zip = buildZip([{ name: "a.txt" }, { name: "b.txt" }]);
    expect(await valid(zip, "zip")).toBe(true);
    expect(await valid(buildZip([]), "zip")).toBe(true);
    expect(await valid(zip.subarray(0, zip.byteLength - 1), "zip")).toBe(false);

    const badCount = zip.slice();
    badCount[badCount.byteLength - 12] = 3;
    expect(await valid(badCount, "zip")).toBe(false);

    const badOffset = zip.slice();
    const central = badOffset.indexOf(0x50, 60);
    badOffset[central + 42] = 0xff;
    badOffset[central + 43] = 0xff;
    badOffset[central + 44] = 0xff;
    badOffset[central + 45] = 0x7f;
    expect(await valid(badOffset, "zip")).toBe(false);

    const secondLocalMismatch = zip.slice();
    const secondCentral = secondLocalMismatch.lastIndexOf(0x50, secondLocalMismatch.byteLength - 23);
    expect(secondCentral).toBeGreaterThan(central);
    secondLocalMismatch[secondCentral + 42] = 0;
    secondLocalMismatch[secondCentral + 43] = 0;
    secondLocalMismatch[secondCentral + 44] = 0;
    secondLocalMismatch[secondCentral + 45] = 0;
    expect(await valid(secondLocalMismatch, "zip")).toBe(false);

    const overlappingData = zip.slice();
    overlappingData[central + 20] = 0xff;
    overlappingData[central + 21] = 0xff;
    overlappingData[central + 22] = 0xff;
    overlappingData[central + 23] = 0x7f;
    expect(await valid(overlappingData, "zip")).toBe(false);
  });

  it("accepts a structurally consistent ZIP64 directory without an arbitrary classic-entry limit", async () => {
    expect(await valid(buildZip([{ name: "a.txt" }], true), "zip")).toBe(true);
  });

  it("distinguishes DOCX, XLSX and PPTX by package parts beyond the initial prefix", async () => {
    const filler = new Uint8Array(7000);
    const docx = buildZip([
      { name: "filler.bin", data: filler },
      { name: "[Content_Types].xml" },
      { name: "_rels/.rels" },
      { name: "word/document.xml" },
    ]);
    expect(await valid(docx, "docx")).toBe(true);
    expect(await valid(docx, "xlsx")).toBe(false);
    expect(await valid(docx, "pptx")).toBe(false);

    const xlsx = buildZip([
      { name: "[Content_Types].xml" }, { name: "_rels/.rels" }, { name: "xl/workbook.xml" },
    ]);
    const pptx = buildZip([
      { name: "[Content_Types].xml" }, { name: "_rels/.rels" }, { name: "ppt/presentation.xml" },
    ]);
    expect(await valid(xlsx, "xlsx")).toBe(true);
    expect(await valid(pptx, "pptx")).toBe(true);
  });

  it("rejects an OOXML package when a required central entry does not match its local header", async () => {
    const docx = buildZip([
      { name: "[Content_Types].xml" }, { name: "_rels/.rels" }, { name: "word/document.xml" },
    ]);
    const broken = docx.slice();
    const word = text("word/document.xml");
    let wordOffset = -1;
    for (let index = 0; index <= broken.byteLength - word.byteLength; index += 1) {
      if (word.every((byte, at) => broken[index + at] === byte)) {
        wordOffset = index;
        break;
      }
    }
    expect(wordOffset).toBeGreaterThan(0);
    broken[wordOffset] = "x".charCodeAt(0);
    expect(await valid(broken, "docx")).toBe(false);
  });

  it("validates ODT/ODS mimetype as the first stored local entry and requires the manifest", async () => {
    const odt = buildZip([
      { name: "mimetype", data: text("application/vnd.oasis.opendocument.text") },
      { name: "META-INF/manifest.xml" },
      { name: "content.xml" },
    ]);
    const ods = buildZip([
      { name: "mimetype", data: text("application/vnd.oasis.opendocument.spreadsheet") },
      { name: "META-INF/manifest.xml" },
      { name: "styles.xml" },
    ]);
    expect(await valid(odt, "odt")).toBe(true);
    expect(await valid(ods, "ods")).toBe(true);
    expect(await valid(odt, "ods")).toBe(false);

    const missingManifest = buildZip([
      { name: "mimetype", data: text("application/vnd.oasis.opendocument.text") },
      { name: "content.xml" },
    ]);
    expect(await valid(missingManifest, "odt")).toBe(false);

    const wrongFirst = buildZip([
      { name: "content.xml" },
      { name: "mimetype", data: text("application/vnd.oasis.opendocument.text") },
      { name: "META-INF/manifest.xml" },
    ]);
    expect(await valid(wrongFirst, "odt")).toBe(false);
  });

  it("rejects unsupported ODF compression methods instead of claiming package conformance", async () => {
    const odt = buildZip([
      { name: "mimetype", data: text("application/vnd.oasis.opendocument.text") },
      { name: "META-INF/manifest.xml", method: 12 },
      { name: "content.xml" },
    ]);
    expect(await valid(odt, "odt")).toBe(false);
  });

  it("uses bounded range reads rather than buffering the whole archive", async () => {
    const zip = buildZip([
      { name: "large.bin", data: new Uint8Array(20_000) },
      { name: "[Content_Types].xml" },
      { name: "_rels/.rels" },
      { name: "word/document.xml" },
    ]);
    const reads: Array<{ offset: number; length: number }> = [];
    expect(await validateZipAttachmentStructure(source(zip, reads), "docx")).toBe(true);
    expect(Math.max(...reads.map((read) => read.length))).toBeLessThanOrEqual(65_557);
    expect(reads.some((read) => read.offset > 4096)).toBe(true);
  });

  it("propagates storage read failures instead of misclassifying them as invalid content", async () => {
    const zip = buildZip([{ name: "a.txt" }]);
    await expect(validateZipAttachmentStructure({
      size: zip.byteLength,
      async read() { throw new Error("range read unavailable"); },
    }, "zip")).rejects.toThrow("range read unavailable");
  });
});
