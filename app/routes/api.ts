export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export function action() {
  throw new Response("Not Found", { status: 404 });
}
