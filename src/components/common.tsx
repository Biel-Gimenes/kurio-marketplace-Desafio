import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { errorMessage } from "../api";
export function Loading({ cards = 3 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="skeleton-grid">
      {Array.from({ length: cards }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="state-panel" role="alert">
      <h2>Não foi possível carregar</h2>
      <p>{errorMessage(error)}</p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
    </div>
  );
}
export function Empty({
  title = "Nenhum NFT encontrado",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <h2>{title}</h2>
      {children ?? <p>Experimente uma nova busca ou remova os filtros.</p>}
    </div>
  );
}
export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <nav className="breadcrumb" aria-label="Navegação estrutural">
      <Link to="/">
        <ArrowLeft size={16} /> Início
      </Link>
      <span>/</span>
      <span>{children}</span>
    </nav>
  );
}
export function Quantity({
  value,
  max,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity" aria-label="Quantidade">
      <Button
        size="icon"
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </Button>
      <output aria-label="Quantidade selecionada">{value}</output>
      <Button
        size="icon"
        aria-label="Aumentar quantidade"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
