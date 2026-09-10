export function loader(): never {
  throw new Response("Not Found", { status: 404 });
}
