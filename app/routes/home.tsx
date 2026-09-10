export function meta() {
  return [
    { title: "Vico Forum" },
    { name: "description", content: "Vico Forum development scaffold" },
  ];
}

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">Vico Forum</p>
      <h1>Development scaffold</h1>
      <p>Stage 1A establishes the React Router and Cloudflare Workers foundation.</p>
    </main>
  );
}
