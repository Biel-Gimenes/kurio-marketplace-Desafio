import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useCart, useSession } from "../api";
import { Button } from "./ui/button";
import { useApp } from "./app-context";

export function Header() {
  const session = useSession();
  const cart = useCart();
  const { notify } = useApp();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const itemCount =
    cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <header className="header">
      <Link to="/" className="wordmark" aria-label="Kurio início">
        KURIO
      </Link>
      <nav aria-label="Principal" className="desktop-nav">
        <Link to="/" className={path === "/" ? "active" : ""}>
          Início
        </Link>
        <a href="/#catalogo">Mercado</a>
        <button
          onClick={() =>
            notify("A seção de criadores não faz parte desta demonstração.")
          }
        >
          Criadores
        </button>
        <a href="/#diario">Aprenda</a>
      </nav>
      <div className="header-actions">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Buscar NFTs"
          onClick={() => {
            void navigate({ to: "/" });
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>("#catalog-search")
                  ?.focus(),
              50,
            );
          }}
        >
          <img src="/assets/search.svg" alt="" />
        </Button>
        <Link
          to="/carrinho"
          className="cart-link"
          aria-label={`Carrinho, ${itemCount} itens`}
        >
          <img src="/assets/cart.svg" alt="" />
          <span>{itemCount}</span>
        </Link>
        <Button size="sm" asChild>
          <Link to={session.data?.user ? "/perfil" : "/login"}>
            {session.data?.user ? (
              <User size={16} />
            ) : (
              <img src="/assets/login.svg" alt="" />
            )}
            <span>{session.data?.user?.username ?? "Entrar"}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
