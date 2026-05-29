import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api, type Cartao, type Profile, type Transacao } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — S.O.S Finance" }] }),
});

function brl(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Dashboard() {
  const { user, loaded } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [filtro, setFiltro] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (loaded && !user) router.navigate({ to: "/login" });
  }, [loaded, user, router]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [p, c, t] = await Promise.all([
      api.getProfile(user.id),
      api.getCartoes(user.id),
      api.getTransacoes(user.id),
    ]);
    setProfile(p);
    setCartoes(c);
    setTransacoes(t);
  }, [user]);

  useEffect(() => {
    if (user) refresh().catch((e) => setErro(e.message));
  }, [user, refresh]);

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErro("");
    setLoading(true);
    try {
      await api.addTransacao(user.id, tipo, descricao, parseFloat(valor), cartaoId || null);
      setDescricao("");
      setValor("");
      setCartaoId("");
      await refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t: Transacao) {
    if (!user) return;
    await api.removeTransacao(t, user.id);
    await refresh();
  }

  async function handleAddCard() {
    if (!user) return;
    const banco = prompt("Nome do banco:");
    if (!banco) return;
    const limite = parseFloat(prompt("Limite (R$):") || "0");
    await api.addCartao(user.id, banco, limite);
    await refresh();
  }

  async function handleRemoveCard(id: string) {
    if (!confirm("Remover cartão?")) return;
    await api.removeCartao(id);
    await refresh();
  }

  if (!loaded || !user) return null;

  const totalEntradas = transacoes.filter((t) => t.tipo === "entrada").reduce((a, b) => a + Number(b.valor), 0);
  const totalSaidas = transacoes.filter((t) => t.tipo === "saida").reduce((a, b) => a + Number(b.valor), 0);
  const saldo = profile ? Number(profile.saldo) : totalEntradas - totalSaidas;
  const total = totalEntradas + totalSaidas;
  const pctE = total === 0 ? 50 : (totalEntradas / total) * 100;

  const filtradas = transacoes.filter((t) =>
    t.descricao.toLowerCase().includes(filtro.toLowerCase())
  );

  const nomeExibicao = profile?.nome?.split(" ")[0] || user.email?.split("@")[0] || "você";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Olá, {nomeExibicao}</h1>
          <p className="text-sm text-muted-foreground">Aqui está o resumo das suas finanças.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Saldo Atual" value={brl(saldo)} variant={saldo >= 0 ? "success" : "danger"} />
          <StatCard title="Total Entradas" value={brl(totalEntradas)} variant="success" />
          <StatCard title="Total Saídas" value={brl(totalSaidas)} variant="danger" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-primary">Distribuição</h3>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success transition-all" style={{ width: `${pctE}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span className="text-success">▲ Entradas {pctE.toFixed(1)}%</span>
              <span className="text-destructive">▼ Saídas {(100 - pctE).toFixed(1)}%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">Cartões de Crédito</h3>
              <button
                onClick={handleAddCard}
                className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                + Adicionar
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {cartoes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
              )}
              {cartoes.map((c) => (
                <CartaoItem key={c.id} cartao={c} onRemove={() => handleRemoveCard(c.id)} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-primary">Registrar Movimentação</h3>
          {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
          <form onSubmit={handleAddTx} className="mt-4 grid gap-3 md:grid-cols-5">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
            >
              <option value="entrada">▲ Entrada</option>
              <option value="saida">▼ Saída</option>
            </select>
            <input
              required
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
            <select
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
            >
              <option value="">Sem cartão</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Registrar
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-primary">Histórico de Transações</h3>
            <input
              placeholder="Buscar..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            {filtradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma transação registrada
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="py-2 text-left">Data</th>
                    <th className="py-2 text-left">Descrição</th>
                    <th className="py-2 text-left">Tipo</th>
                    <th className="py-2 text-right">Valor</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-3 text-muted-foreground">
                        {new Date(t.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3">{t.descricao}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            t.tipo === "entrada"
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {t.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="py-3 text-right">{brl(Number(t.valor))}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(t)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, variant }: { title: string; value: string; variant: "success" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${variant === "success" ? "text-success" : "text-destructive"}`}>
        {value}
      </p>
    </div>
  );
}

function CartaoItem({ cartao, onRemove }: { cartao: Cartao; onRemove: () => void }) {
  const limite = Number(cartao.limite);
  const gasto = Number(cartao.gasto);
  const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0;
  const color = pct > 80 ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-success";
  return (
    <div className="rounded-lg border border-border bg-elevated p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-primary">{cartao.banco}</span>
        <button onClick={onRemove} className="text-xs text-destructive hover:underline">
          Remover
        </button>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{brl(gasto)}</span>
        <span>{brl(limite)}</span>
      </div>
    </div>
  );
}
