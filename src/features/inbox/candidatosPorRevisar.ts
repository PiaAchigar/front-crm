import type { Vinculos } from "../../api/contacts";

type Candidato = { id: string; name: string | null };

/** Quiénes se ofrecen en "Por revisar": la ficha actual, su titular (si ya está a cargo de alguien)
 *  y las que comparten el número. Sin repetidos. */
export function candidatosPorRevisar(
  actual: Candidato,
  vinculos: Pick<Vinculos, "titular" | "compartenNumero"> | undefined,
): Candidato[] {
  const todos: Candidato[] = [actual];
  if (vinculos?.titular) todos.push({ id: vinculos.titular.id, name: vinculos.titular.name });
  todos.push(...(vinculos?.compartenNumero ?? []));
  const vistos = new Set<string>();
  return todos.filter((c) => !vistos.has(c.id) && vistos.add(c.id));
}
