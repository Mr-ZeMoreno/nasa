import type { HabitatObject } from "@/lib/types";

const API =
  process.env.NEXT_PUBLIC_CATALOG_API ?? "http://localhost:8000/habitat/objects";

export async function getObjectsForFunctions(functions: string[], crew: number) {
  const url = new URL(API);

  if (functions?.length) {
    for (const f of functions) url.searchParams.append("functions", f);
  } else {
    // 🔹 Indica modo manual sin pasar 'functions'
    url.searchParams.set("mode", "manual");
  }

  url.searchParams.set("crew", String(crew));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "<no body>");
    throw new Error(`HTTP ${res.status} - ${txt}`);
  }
  return res.json() as Promise<HabitatObject[]>;
}
