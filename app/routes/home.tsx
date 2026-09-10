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
      <p>Stage 1B establishes the locale routing and resolution foundation.</p>
    </main>
  );
}
