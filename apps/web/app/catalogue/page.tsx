import { listCultivars } from "../../lib/api";

export default async function Catalogue({ searchParams }: { searchParams: { q?: string } }) {
  let cultivars: Awaited<ReturnType<typeof listCultivars>> = [];
  let error: string | null = null;
  try {
    cultivars = await listCultivars(searchParams.q ?? "");
  } catch {
    error = "API indisponible : démarrez apps/api puis rechargez. Aucune donnée d’exemple n’est affichée comme réelle.";
  }
  return (
    <main>
      <h1>Catalogue des cultivars</h1>
      <form><input name="q" defaultValue={searchParams.q ?? ""} placeholder="Rechercher…" /><button>Rechercher</button></form>
      {error && <p>{error}</p>}
      {!error && cultivars.length === 0 && <p>Aucun cultivar enregistré pour le moment.</p>}
      <ul>
        {cultivars.map((c) => (
          <li key={c.id}>
            {c.name} — score : {c.commercial_score ?? "non documenté"}
            {c.breeder_verification_status === "non vérifié" ? " — breeder non vérifié" : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
