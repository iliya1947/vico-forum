/** Two real DEFLATE members; a's CRC aliases b's local-header signature. */
export function descriptorOverlapZip(descriptor: "missing" | "unsigned" | "signed"): Uint8Array {
  const data = [
    Uint8Array.from([0, 8, 0, 247, 255, 65, 66, 67, 68, 213, 112, 45, 223, 0, 0, 0, 255, 255, 3, 0]),
    Uint8Array.from([75, 2, 0]),
  ];
  const descriptorBytes = descriptor === "missing" ? 0 : descriptor === "signed" ? 16 : 12;
  const localsLength = 51 + descriptorBytes + 34;
  const bytes = new Uint8Array(localsLength + 94 + 22), view = new DataView(bytes.buffer);
  let offset = 0;
  for (let i = 0; i < 2; i++) {
    const crc = i === 0 ? 0x04034b50 : 0x71beeff9;
    view.setUint32(offset, 0x04034b50, true); view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, i === 0 ? 8 : 0, true); view.setUint16(offset + 8, 8, true);
    view.setUint32(offset + 14, i === 0 ? 0 : crc, true);
    view.setUint32(offset + 18, i === 0 ? 0 : 3, true); view.setUint32(offset + 22, i === 0 ? 0 : 1, true);
    view.setUint16(offset + 26, 1, true); bytes[offset + 30] = 97 + i; bytes.set(data[i]!, offset + 31);
    const central = localsLength + 47 * i;
    view.setUint32(central, 0x02014b50, true); view.setUint16(central + 4, 20, true); view.setUint16(central + 6, 20, true);
    view.setUint16(central + 8, i === 0 ? 8 : 0, true); view.setUint16(central + 10, 8, true);
    view.setUint32(central + 16, crc, true); view.setUint32(central + 20, data[i]!.length, true);
    view.setUint32(central + 24, i === 0 ? 8 : 1, true); view.setUint16(central + 28, 1, true);
    view.setUint32(central + 42, offset, true); bytes[central + 46] = 97 + i;
    offset += 31 + data[i]!.length;
    if (i === 0 && descriptorBytes) {
      if (descriptor === "signed") { view.setUint32(offset, 0x08074b50, true); offset += 4; }
      view.setUint32(offset, crc, true); view.setUint32(offset + 4, 20, true); view.setUint32(offset + 8, 8, true);
      offset += 12;
    }
  }
  view.setUint32(bytes.length - 22, 0x06054b50, true);
  view.setUint16(bytes.length - 14, 2, true); view.setUint16(bytes.length - 12, 2, true);
  view.setUint32(bytes.length - 10, 94, true); view.setUint32(bytes.length - 6, localsLength, true);
  return bytes;
}

/** Distinct fixed-width names, empty stored members, optionally reversed directory order. */
export function classicManyEntryZip(count = 65535, reverse = false): Uint8Array {
  const localLength = 35 * count, centralLength = 51 * count;
  const bytes = new Uint8Array(localLength + centralLength + 22), view = new DataView(bytes.buffer);
  for (let i = 0; i < count; i++) {
    const name = new TextEncoder().encode(i.toString(16).padStart(5, "0"));
    const local = 35 * i, central = localLength + 51 * (reverse ? count - i - 1 : i);
    view.setUint32(local, 0x04034b50, true); view.setUint16(local + 4, 20, true); view.setUint16(local + 26, 5, true);
    bytes.set(name, local + 30);
    view.setUint32(central, 0x02014b50, true); view.setUint16(central + 4, 20, true); view.setUint16(central + 6, 20, true);
    view.setUint16(central + 28, 5, true); view.setUint32(central + 42, local, true); bytes.set(name, central + 46);
  }
  const end = bytes.length - 22;
  view.setUint32(end, 0x06054b50, true); view.setUint16(end + 8, count, true); view.setUint16(end + 10, count, true);
  view.setUint32(end + 12, centralLength, true); view.setUint32(end + 16, localLength, true);
  return bytes;
}
