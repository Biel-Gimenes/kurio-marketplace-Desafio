import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Heart, Star, ZoomIn } from "lucide-react";
import {
  errorMessage,
  useCartMutation,
  useFavoriteMutation,
  useFavorites,
  useNFT,
  useSession,
} from "../../api";
import type { Edition } from "../../contracts";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/dialog";
import {
  Breadcrumb,
  ErrorState,
  Quantity,
} from "../../components/common";
import { useApp } from "../../components/app-context";
import { Recommendations } from "./nft-card";

export function Detail() {
  const { nftId } = useParams({ strict: false });
  const nft = useNFT(nftId ?? "");
  const [edition, setEdition] = useState<Edition>("1/50");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [tab, setTab] = useState("details");
  const cart = useCartMutation();
  const favorites = useFavorites();
  const favorite = useFavoriteMutation();
  const session = useSession();
  const navigate = useNavigate();
  const { notify } = useApp();

  if (nft.isPending)
    return (
      <section className="detail-loading" aria-label="Carregando detalhe">
        <div className="skeleton skeleton-breadcrumb" />
        <div className="detail-layout">
          <div className="skeleton detail-skeleton-art" />
          <div className="detail-skeleton-copy">
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className="skeleton skeleton-line" />
            ))}
          </div>
        </div>
        <div className="detail-skeleton-description">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton skeleton-line" />
          ))}
        </div>
      </section>
    );
  if (nft.isError)
    return <ErrorState error={nft.error} retry={() => void nft.refetch()} />;

  const item = nft.data;
  const max = item.stock[edition];

  return (
    <>
      <Breadcrumb>Mercado / {item.name}</Breadcrumb>
      <section className="detail-layout">
        <div className="gallery">
          <div className="thumbnails">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                className={index === imageIndex ? "selected" : ""}
                aria-label={`Imagem ${index + 1} de ${item.name}`}
                aria-pressed={index === imageIndex}
                onClick={() => setImageIndex(index)}
              >
                <img src={item.image} alt="" width="100" height="100" />
              </button>
            ))}
          </div>
          <button
            className={`detail-art detail-art-${imageIndex}`}
            aria-label="Ampliar obra"
            onClick={() => setZoom(true)}
          >
            <img src={item.image} alt={item.name} width="450" height="450" />
            <ZoomIn size={24} />
          </button>
        </div>
        <div className="detail-info">
          <h1>{item.name}</h1>
          <div className="detail-price">
            <strong>{item.price} ETH</strong>
            <span>
              <Star size={15} fill="currentColor" />
              ★★★★ <small>19 avaliações de colecionadores</small>
            </span>
          </div>
          <h2>Sobre este NFT:</h2>
          <p>
            Um colecionável digital finalizado à mão da coleção Kurio Editions,
            verificado na {item.network}, com arte desbloqueável e acesso para
            colecionadores.
          </p>
          <fieldset className="editions">
            <legend>Edição:</legend>
            {(["1/1", "1/10", "1/50", "Aberta"] as Edition[]).map((value) => (
              <label key={value} className={edition === value ? "selected" : ""}>
                <input
                  type="radio"
                  name="edition"
                  value={value}
                  checked={edition === value}
                  onChange={() => {
                    setEdition(value);
                    setQuantity(1);
                  }}
                />
                {value}
              </label>
            ))}
          </fieldset>
          <p className="stock">
            {max > 0 ? `${max} edições disponíveis` : "Edição esgotada"}
          </p>
          <div className="purchase-actions">
            <Quantity
              value={quantity}
              max={max}
              onChange={setQuantity}
              disabled={cart.isPending}
            />
            <Button
              disabled={!max || quantity > max || cart.isPending}
              onClick={() =>
                cart.mutate(
                  { item: { nftId: item.id, edition, quantity }, add: true },
                  {
                    onSuccess: () => {
                      notify("NFT adicionado ao carrinho.");
                      void navigate({ to: "/carrinho" });
                    },
                    onError: (error) => notify(errorMessage(error)),
                  },
                )
              }
            >
              {cart.isPending ? "Adicionando…" : "COMPRAR"}
            </Button>
            <Button
              variant="outline"
              aria-pressed={favorites.data?.includes(item.id) ?? false}
              disabled={favorite.isPending}
              onClick={() => {
                if (!session.data?.user) {
                  void navigate({
                    to: "/login",
                    search: { returnTo: `/nfts/${item.id}` },
                  });
                  return;
                }
                favorite.mutate(
                  {
                    id: item.id,
                    favorite: !favorites.data?.includes(item.id),
                  },
                  { onError: (error) => notify(errorMessage(error)) },
                );
              }}
            >
              <Heart size={19} />
              Favoritar
            </Button>
          </div>
          <dl className="nft-attributes">
            <div>
              <dt>ID do token:</dt>
              <dd>#{item.id.padStart(4, "0")}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>Kurio Apes</dd>
            </div>
            <div>
              <dt>Atributos:</dt>
              <dd>Óculos, Esmeralda, Raro</dd>
            </div>
            <div>
              <dt>Rede:</dt>
              <dd>{item.network}</dd>
            </div>
          </dl>
          <p>
            Compartilhar este NFT:{" "}
            <button
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(location.href)
                  .then(() => notify("Link copiado."))
                  .catch(() =>
                    notify("Copie o endereço desta página para compartilhar."),
                  );
              }}
            >
              Copiar link ↗
            </button>
          </p>
        </div>
      </section>
      <section className="detail-description">
        <div className="tabs" role="tablist" aria-label="Informações da obra">
          <button
            role="tab"
            aria-selected={tab === "details"}
            className={tab === "details" ? "selected" : ""}
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            role="tab"
            aria-selected={tab === "reviews"}
            className={tab === "reviews" ? "selected" : ""}
            onClick={() => setTab("reviews")}
          >
            Avaliações de colecionadores (19)
          </button>
        </div>
        {tab === "details" ? (
          <div role="tabpanel">
            <p>
              {item.name} é uma obra digital finalizada à mão da coleção Kurio
              Editions. Cada atributo fica armazenado nos metadados do token e
              verificado na {item.network}. A obra explora identidade, movimento
              e luz em um mundo digital sem fronteiras.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução, lançamentos
              exclusivos para colecionadores e um registro permanente de
              procedência registrada na rede.
            </p>
            <p>
              <b>Rede:</b>
              <br />
              Cunhado na {item.network} com procedência imutável e metadados
              armazenados no IPFS.
            </p>
            <p>
              <b>Contrato:</b>
              <br />
              Direitos autorais do criador: 5% nas vendas secundárias.
            </p>
            <p>
              <b>Direitos autorais:</b>
              <br />
              0x7A42...19C8 · Contrato inteligente verificado (simulação).
            </p>
          </div>
        ) : (
          <div role="tabpanel">
            <p>★★★★★ — Arte incrível, cheia de personalidade.</p>
            <p className="muted">
              Avaliações ilustrativas dos colecionadores da Kurio.
            </p>
          </div>
        )}
      </section>
      <Recommendations />
      <Dialog
        open={zoom}
        onOpenChange={setZoom}
        title={item.name}
        className="zoom-dialog"
      >
        <img src={item.image} alt={item.name} width="600" height="600" />
      </Dialog>
    </>
  );
}
