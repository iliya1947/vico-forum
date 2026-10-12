import { describe, expect, it } from "vitest";
import { createAttachmentStructuralValidator } from "./attachment-structural-validation";

const utf8 = (value: string) => new TextEncoder().encode(value);

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}
function u32le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
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
function pngChunk(type: string, data: number[] = []): Uint8Array {
  return concat(u32be(data.length), utf8(type), data, [0, 0, 0, 0]);
}
function validPng(): Uint8Array {
  return concat(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    pngChunk("IHDR", [...u32be(1), ...u32be(1), 8, 6, 0, 0, 0]),
    pngChunk("IDAT"),
    pngChunk("IEND"),
  );
}
function validJpeg(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
    0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x00,
    0xff, 0xd9,
  ]);
}
function validGif(): Uint8Array {
  return concat(utf8("GIF89a"), [1, 0, 1, 0, 0, 0, 0, 0x3b]);
}
function validWebp(): Uint8Array {
  const chunkData = [0x2f, 0, 0, 0, 0];
  const paddedData = [...chunkData, 0];
  const riffSize = 4 + 8 + paddedData.length;
  return concat(utf8("RIFF"), u32le(riffSize), utf8("WEBPVP8L"), u32le(chunkData.length), paddedData);
}
function validPdf(): Uint8Array {
  return utf8("%PDF-1.7\n1 0 obj\n<<>>\nendobj\nxref\n0 1\n0000000000 65535 f \n"
    + "trailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF\n");
}

function validate(kind: "png" | "jpeg" | "gif" | "webp" | "pdf", bytes: Uint8Array,
  splitAt: number[] = []): boolean {
  const validator = createAttachmentStructuralValidator(kind, bytes.byteLength)!;
  let offset = 0;
  for (const end of [...splitAt, bytes.byteLength]) {
    validator.push(bytes.subarray(offset, end));
    offset = end;
  }
  return validator.finish();
}

describe("attachment streaming structural validation core", () => {
  it("accepts structurally sane PNG across chunk boundaries and rejects header-only/truncated PNG", () => {
    const png = validPng();
    expect(validate("png", png, [3, 8, 17, 29, png.byteLength - 2])).toBe(true);
    expect(validate("png", png.subarray(0, 8))).toBe(false);
    expect(validate("png", png.subarray(0, png.byteLength - 12))).toBe(false);

    const zeroWidth = png.slice();
    zeroWidth.set([0, 0, 0, 0], 16);
    expect(validate("png", zeroWidth)).toBe(false);
  });

  it("requires JPEG frame, scan and end markers instead of accepting SOI alone", () => {
    const jpeg = validJpeg();
    expect(validate("jpeg", jpeg, [1, 2, 15, jpeg.byteLength - 1])).toBe(true);
    expect(validate("jpeg", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(false);
    expect(validate("jpeg", jpeg.subarray(0, jpeg.byteLength - 2))).toBe(false);
  });

  it("requires GIF logical-screen bytes and final trailer", () => {
    const gif = validGif();
    expect(validate("gif", gif, [2, 6, 13])).toBe(true);
    expect(validate("gif", utf8("GIF89a"))).toBe(false);
    expect(validate("gif", gif.subarray(0, gif.byteLength - 1))).toBe(false);
  });

  it("checks WebP RIFF size and first image chunk", () => {
    const webp = validWebp();
    expect(validate("webp", webp, [4, 11, 19, webp.byteLength - 1])).toBe(true);

    const truncated = webp.subarray(0, webp.byteLength - 3);
    expect(validate("webp", truncated)).toBe(false);

    const wrongKind = webp.slice();
    wrongKind.set(utf8("JUNK"), 12);
    expect(validate("webp", wrongKind)).toBe(false);
  });

  it("requires a PDF trailer with startxref before EOF", () => {
    const pdf = validPdf();
    expect(validate("pdf", pdf, [2, 8, 37, pdf.byteLength - 4])).toBe(true);
    expect(validate("pdf", utf8("%PDF-1.7"))).toBe(false);
    expect(validate("pdf", utf8("%PDF-1.7\n%%EOF\n"))).toBe(false);
  });

  it("keeps container and text families outside this bounded subtask", () => {
    expect(createAttachmentStructuralValidator("zip", 100)).toBeNull();
    expect(createAttachmentStructuralValidator("gzip", 100)).toBeNull();
    expect(createAttachmentStructuralValidator("ole", 100)).toBeNull();
    expect(createAttachmentStructuralValidator("text", 100)).toBeNull();
  });

  it("fails closed when the stream length differs from the expected size", () => {
    const gif = validGif();
    const validator = createAttachmentStructuralValidator("gif", gif.byteLength + 1)!;
    validator.push(gif);
    expect(validator.finish()).toBe(false);
  });
});
