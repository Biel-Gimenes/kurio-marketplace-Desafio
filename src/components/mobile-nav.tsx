import { Link } from "@tanstack/react-router";
import { Heart, Home, Search, ShoppingCart, User } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Navegação mobile">
      <Link to="/" aria-label="Início">
        <Home />
      </Link>
      <Link to="/favoritos" aria-label="Favoritos">
        <Heart />
      </Link>
      <a
        href="/#catalogo"
        className="mobile-explore"
        aria-label="Explorar NFTs"
      >
        <Search size={28} />
      </a>
      <Link to="/carrinho" aria-label="Carrinho">
        <ShoppingCart />
      </Link>
      <Link to="/perfil" aria-label="Perfil">
        <User />
      </Link>
    </nav>
  );
}
