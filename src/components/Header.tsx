import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="text-xl font-bold gradient-text">
          S.O.S FINANCE
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-primary"
              >
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.navigate({ to: "/" });
                }}
                className="rounded-full border border-destructive/50 px-4 py-2 text-sm text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
