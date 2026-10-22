import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { http, useSession } from "../../api";
import type { CatalogSearch, NFT } from "../../contracts";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/dialog";
import { Empty, ErrorState, Loading } from "../../components/common";
import { Hero } from "./hero";
import { Editorial } from "./editorial";
import { NFTCard } from "./nft-card";

export { Detail } from "./detail";
export { NFTCard, Recommendations } from "./nft-card";

const collections = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
const networks = ["Ethereum", "Polygon", "Solana"];

export function Catalog({ favorites = false }: { favorites?: boolean }) {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const session = useSession();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min ?? "");
  const [max, setMax] = useState(search.max ?? "");

  useEffect(() => {
    setTerm(search.q ?? "");
    setMin(search.min ?? "");
    setMax(search.max ?? "");
  }, [search.q, search.min, search.max]);

  const update = (patch: Partial<CatalogSearch>) =>
    void navigate({
      to: favorites ? "/favoritos" : "/",
      search: (old) => ({ ...old, ...patch, page: patch.page ?? 1 }),
    });

  const data = useQuery({
    queryKey: [
      "catalog",
      favorites ? session.data?.user?.id : "public",
      search,
    ],
    queryFn: async ({ signal }) =>
      (
        await http.get<{ items: NFT[]; total: number; pages: number }>(
          "/nfts",
          { params: { ...search, favorites }, signal },
        )
      ).data,
    enabled: !favorites || !!session.data?.user,
  });

  const toggle = (key: "collections" | "networks", value: string) => {
    const values = (search[key] ?? "").split(",").filter(Boolean);
    update({
      [key]: (values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
      ).join(","),
    });
  };

  const filters = (
    <div className="filters">
      <h2>Coleções</h2>
      {collections.map((name) => (
        <label key={name} className="filter-option">
          <input
            type="checkbox"
            checked={(search.collections ?? "").split(",").includes(name)}
            onChange={() => toggle("collections", name)}
          />
          <span>{name}</span>
        </label>
      ))}
      <h2>Faixa de preço</h2>
      <div className="price-inputs">
        <label>
          De
          <input
            aria-label="Preço mínimo em ETH"
            type="number"
            min="0"
            step="0.01"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
        </label>
        <label>
          Até
          <input
            aria-label="Preço máximo em ETH"
            type="number"
            min="0"
            step="0.01"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
        </label>
      </div>
      <p className="muted">Preço em ETH</p>
      <Button
        size="sm"
        onClick={() => {
          update({ min, max });
          setFiltersOpen(false);
        }}
      >
        Aplicar
      </Button>
      <label className="filter-sort">
        Ordenar por
        <select
          aria-label="Ordenar NFTs"
          value={search.sort ?? "recent"}
          onChange={(event) => update({ sort: event.target.value })}
        >
          <option value="recent">Listados recentemente</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </label>
      <h2>Rede</h2>
      {networks.map((network) => (
        <label className="filter-option" key={network}>
          <input
            type="checkbox"
            checked={(search.networks ?? "").split(",").includes(network)}
            onChange={() => toggle("networks", network)}
          />
          <span>{network}</span>
        </label>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          update({
            q: "",
            collections: "",
            networks: "",
            min: "",
            max: "",
            tab: "all",
            sort: "recent",
          });
          setFiltersOpen(false);
        }}
      >
        Limpar filtros
      </Button>
    </div>
  );

  return (
    <>
      {!favorites && <Hero />}
      <section
        id="catalogo"
        className="catalog-section"
        aria-label={favorites ? "NFTs favoritos" : "Catálogo de NFTs"}
      >
        {favorites && <h1>Lista de interesse</h1>}
        <div className="search-row">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: term });
            }}
          >
            <Search size={22} />
            <label className="sr-only" htmlFor="catalog-search">
              Buscar NFTs
            </label>
            <input
              id="catalog-search"
              placeholder="Explorar coleções"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                update({ q: event.target.value });
              }}
            />
            <button type="submit" aria-label="Pesquisar">
              <ArrowRight size={20} />
            </button>
          </form>
          <Button
            className="mobile-filter"
            size="icon"
            aria-label="Filtros"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal />
          </Button>
        </div>
        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            {filters}
            <div className="featured-banner">
              <h2>NFT EM DESTAQUE</h2>
              <b>OFERTA LIMITADA</b>
              <Link to="/nfts/$nftId" params={{ nftId: "2" }}>
                <img
                  src="/assets/sage.webp"
                  alt="Sage Nomad em destaque"
                  width="310"
                  height="368"
                  loading="lazy"
                />
              </Link>
            </div>
          </aside>
          <div className="catalog-results">
            <div className="catalog-toolbar">
              <div
                className="tabs"
                role="tablist"
                aria-label="Categorias de destaque"
              >
                {[
                  ["all", "Todos os NFTs"],
                  ["new", "Novos lançamentos"],
                  ["trending", "Em alta"],
                ].map(([value, label]) => (
                  <button
                    role="tab"
                    aria-selected={search.tab === value}
                    className={search.tab === value ? "selected" : ""}
                    key={value}
                    onClick={() => update({ tab: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="sort">
                Ordenar por:
                <select
                  aria-label="Ordenar por"
                  value={search.sort ?? "recent"}
                  onChange={(event) => update({ sort: event.target.value })}
                >
                  <option value="recent">Listados recentemente</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>
            {data.isPending ? (
              <Loading cards={9} />
            ) : data.isError ? (
              <ErrorState
                error={data.error}
                retry={() => void data.refetch()}
              />
            ) : !data.data.items.length ? (
              <Empty
                title={favorites ? "Sua lista ainda está vazia" : undefined}
              />
            ) : (
              <>
                <p className="sr-only" role="status">
                  {data.data.total} NFTs encontrados
                </p>
                <div className="nft-grid">
                  {data.data.items.map((nft) => (
                    <NFTCard key={nft.id} nft={nft} />
                  ))}
                </div>
                <nav className="pagination" aria-label="Paginação">
                  {Array.from({ length: data.data.pages }, (_, index) => (
                    <Button
                      aria-label={`Página ${index + 1}`}
                      aria-current={
                        search.page === index + 1 ? "page" : undefined
                      }
                      key={index}
                      size="sm"
                      variant={
                        search.page === index + 1 ? "default" : "outline"
                      }
                      onClick={() => update({ page: index + 1 })}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </nav>
              </>
            )}
          </div>
        </div>
      </section>
      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtrar NFTs"
        className="filter-dialog"
      >
        {filters}
      </Dialog>
      {!favorites && <Editorial />}
    </>
  );
}
