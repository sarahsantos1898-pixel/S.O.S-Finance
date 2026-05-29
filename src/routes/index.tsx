import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import benefitDashboard from "@/assets/benefit-dashboard.jpg";
import benefitCards from "@/assets/benefit-cards.jpg";
import benefitEvolution from "@/assets/benefit-evolution.jpg";
import benefitGoals from "@/assets/benefit-goals.jpg";
import benefitExpenses from "@/assets/benefit-expenses.jpg";
import benefitSecurity from "@/assets/benefit-security.jpg";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "S.O.S Finance — Gestão Financeira Inteligente" },
      {
        name: "description",
        content:
          "Controle financeiro profissional com dashboard analítico, gráficos e metas de investimento.",
      },
    ],
  }),
});

const benefits = [
  {
    img: benefitDashboard,
    title: "Dashboard Analítico",
    desc: "Visualização financeira completa com gráfico de pizza e estatísticas em tempo real.",
  },
  {
    img: benefitCards,
    title: "Múltiplos Cartões",
    desc: "Gerencie vários cartões de crédito com limites e gastos atualizados.",
  },
  {
    img: benefitEvolution,
    title: "Evolução Financeira",
    desc: "Acompanhe gráficos de evolução de gastos e entradas mês a mês.",
  },
  {
    img: benefitGoals,
    title: "Metas de Investimento",
    desc: "Planeje seu futuro com metas de curto, médio ou longo prazo e simule aportes.",
  },
  {
    img: benefitExpenses,
    title: "Despesas Fixas",
    desc: "Controle contas como água, luz, internet e aluguel em um só lugar.",
  },
  {
    img: benefitSecurity,
    title: "Segurança Avançada",
    desc: "Rate limiting, validações robustas e proteção contra acessos indevidos.",
  },
];

const faqs = [
  { q: "O que é o S.O.S Finance?", a: "Sistema profissional de gestão financeira para organizar finanças pessoais e empresariais." },
  { q: "Como criar uma conta?", a: "Acesse 'Criar conta', informe nome, e-mail válido e senha com mínimo 6 caracteres." },
  { q: "Como funciona o gráfico de pizza?", a: "Mostra a proporção entre entradas e saídas do total de movimentações registradas." },
  { q: "Como definir uma meta de investimento?", a: "No dashboard, escolha entre curto, médio ou longo prazo e defina o valor objetivo." },
  { q: "Como simular aportes mensais?", a: "Após definir sua meta, informe quanto pode guardar por mês e veja em quanto tempo atinge." },
];

function Index() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.82_0.16_215_/_0.15),_transparent_60%)]" />
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight gradient-text md:text-6xl">
          Sistema Inteligente de Gestão Financeira
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Controle profissional com precisão, segurança e análises avançadas.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/cadastro"
            className="rounded-full gradient-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow transition hover:scale-105"
          >
            Começar agora
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-border px-8 py-3 font-semibold text-foreground transition hover:border-primary"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Benefícios</span>
          <h2 className="mt-3 text-4xl font-bold">Tudo o que você precisa</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <article
              key={b.title}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-2 hover:border-primary hover:shadow-glow"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={b.img}
                  alt={b.title}
                  loading="lazy"
                  width={800}
                  height={512}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-primary">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Suporte</span>
          <h2 className="mt-3 text-4xl font-bold">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-elevated">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium transition hover:text-primary"
              >
                {f.q}
                <span className={`text-primary transition ${open === i ? "rotate-180" : ""}`}>▾</span>
              </button>
              {open === i && <div className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-border py-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
        S.O.S Finance © 2026 — Gestão Financeira de Nível Empresarial
      </footer>
    </div>
  );
}
