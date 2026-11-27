import { parseStructureCounter, StructureValidationError } from "./forum-structure-contract";

export type StructureBrowseKind = "admin-categories" | "admin-sections" | "categories" | "sections";
export interface StructureBrowseScope { kind: StructureBrowseKind; parent: string | null; search: string }
export const STRUCTURE_CURSOR_LIMIT = 16384;
export function structureIdentity(value: unknown): string {
  if (typeof value !== "string" || !value || new TextEncoder().encode(value).length > 2048
    || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) throw new StructureValidationError("Invalid structure identity");
  return value;
}
export function structureSearch(value: unknown): string {
  if (typeof value !== "string" || Array.from(value).length > 200 || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value))
    throw new StructureValidationError("Invalid structure search");
  return value;
}
export function literalPattern(search: string) { return `%${search.replace(/[\\%_]/g, "\\$&")}%`; }
function tuple(scope: StructureBrowseScope, value: unknown): string[] {
  const positions = scope.kind === "admin-categories" ? [1] : scope.kind === "sections" ? [0,2] : [0];
  const size = scope.kind === "admin-categories" ? 3 : scope.kind === "sections" ? 4 : 2;
  if (!Array.isArray(value) || value.length !== size) throw new StructureValidationError("Invalid structure cursor");
  value.forEach((item, i) => {
    if (scope.kind === "admin-categories" && i === 0) {
      if (item !== "0" && item !== "1") throw new StructureValidationError("Invalid structure cursor");
    } else if (positions.includes(i)) parseStructureCounter(item);
    else structureIdentity(item);
  });
  return value as string[];
}
export function encodeStructureCursor(scope: StructureBrowseScope, order: string[]): string {
  tuple(scope,order);
  const bytes = new TextEncoder().encode(JSON.stringify({v:1,...scope,order}));
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
  if (encoded.length > STRUCTURE_CURSOR_LIMIT) throw new StructureValidationError("Invalid structure cursor");
  return encoded;
}
export function decodeStructureCursor(scope: StructureBrowseScope, after?: string): string[] | null {
  structureSearch(scope.search);
  if (scope.parent !== null) structureIdentity(scope.parent);
  if (after === undefined) return null;
  try {
    if (!after || after.length > STRUCTURE_CURSOR_LIMIT || !/^[A-Za-z0-9_-]+$/.test(after)) throw Error();
    const raw = atob(after.replaceAll("-","+").replaceAll("_","/"));
    const value = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
    if (!value || Object.keys(value).sort().join() !== "kind,order,parent,search,v" || value.v !== 1
      || value.kind !== scope.kind || value.parent !== scope.parent || value.search !== scope.search) throw Error();
    const order = tuple(scope,value.order);
    if (encodeStructureCursor(scope,order) !== after) throw Error();
    return order;
  } catch { throw new StructureValidationError("Invalid structure cursor; start from First"); }
}
