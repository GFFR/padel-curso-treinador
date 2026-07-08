import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import {
  setGlobalBankSet,
  setThemeBankSetOverride,
} from "@/lib/actions/admin-actions";
import {
  fetchBankSetActivations,
  fetchBankSets,
  fetchThemeBankOverview,
} from "@/lib/services/bank-set-service";

export const metadata: Metadata = {
  title: "Banco de perguntas — Admin",
};

export default async function AdminBankPage() {
  const { supabase } = await requireAdmin();

  const [bankSets, activations, overview] = await Promise.all([
    fetchBankSets(supabase),
    fetchBankSetActivations(supabase),
    fetchThemeBankOverview(supabase),
  ]);

  const globalActivation = activations.find((a) => a.themeId === null);
  const globalBankSetId = globalActivation?.bankSetId ?? bankSets[0]?.id;

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Banco ativo (predefinição global)
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Os alunos veem perguntas do conjunto ativo. Pode definir um override
          por tema abaixo (ex.: ED em v2 enquanto PDD permanece em v1).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {bankSets.map((set) => {
            const isActive = set.id === globalBankSetId;
            const action = setGlobalBankSet.bind(null, set.id);
            return (
              <form key={set.id} action={action}>
                <Button
                  type="submit"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                >
                  {set.code.toUpperCase()} — {set.label}
                  {isActive && " ?"}
                </Button>
              </form>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Temas e overrides
        </h2>
        <ul className="mt-4 space-y-3">
          {overview.map((row) => (
            <li
              key={row.themeId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <span className="font-heading font-semibold uppercase">
                  {row.code.replace("_", " — ")}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {row.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  Ativo: {row.activeBankSetCode} ({row.questionCount} perguntas)
                </Badge>
                {bankSets.map((set) => {
                  const isOverride = row.overrideBankSetId === set.id;
                  const isEffective = row.activeBankSetId === set.id;
                  const setOverride = setThemeBankSetOverride.bind(
                    null,
                    row.themeId,
                    set.id,
                  );
                  const clearOverride = setThemeBankSetOverride.bind(
                    null,
                    row.themeId,
                    null,
                  );
                  if (isOverride) {
                    return (
                      <span key={set.id} className="flex gap-1">
                        <Badge>{set.code} (override)</Badge>
                        <form action={clearOverride}>
                          <Button type="submit" size="sm" variant="ghost">
                            Usar global
                          </Button>
                        </form>
                      </span>
                    );
                  }
                  if (isEffective && !row.overrideBankSetId) return null;
                  return (
                    <form key={set.id} action={setOverride}>
                      <Button type="submit" size="sm" variant="outline">
                        Override ? {set.code}
                      </Button>
                    </form>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-sm text-muted-foreground">
        <p>
          Conjuntos disponíveis:{" "}
          {bankSets
            .map((s) => `${s.code} (${s.description ?? s.label})`)
            .join(" — ")}
        </p>
        <p className="mt-2">
          Após ingerir v2, corra{" "}
          <code className="rounded bg-muted px-1">npm run ingest:check -- --theme ED --bank-set v2</code>{" "}
          e active o override do tema quando estiver satisfeito.
        </p>
      </section>
    </div>
  );
}
