import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import {
  errorMessage,
  http,
  useFavoriteMutation,
  useFavorites,
  useSession,
} from "../../api";
import type { NFT } from "../../contracts";
import { Button } from "../../components/ui/button";
import { Loading } from "../../components/common";
import { useApp } from "../../components/app-context";

export function NFTCard({ nft }: { nft: NFT }) {
  const favorites = useFavorites();
  const mutation = useFavoriteMutation();
  const session = useSession();
  const navigate = useNavigate();
  const { notify } = useApp();
  const selected = favorites.data?.includes(nft.id) ?? false;

  return (
    <article className="nft-card">
      <div className="nft-art">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={nft.image}
            alt={nft.name}
            width="258"
            height="258"
            loading="lazy"
          />
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="favorite-button"
          aria-label={`${selected ? "Remover" : "Adicionar"} ${nft.name} ${selected ? "dos" : "aos"} favoritos`}
          aria-pressed={selected}
          disabled={mutation.isPending}
          onClick={() => {
            if (!session.data?.user) {
              void navigate({
                to: "/login",
                search: { returnTo: location.pathname + location.search },
              });
              return;
            }
            mutation.mutate(
              { id: nft.id, favorite: !selected },
              { onError: (error) => notify(errorMessage(error)) },
            );
          }}
        >
          <Heart size={21} fill={selected ? "currentColor" : "none"} />
        </Button>
      </div>
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="nft-name">
        {nft.name}
      </Link>
      <p className="nft-price">
        {nft.price} ETH {nft.oldPrice && <del>{nft.oldPrice} ETH</del>}
      </p>
    </article>
  );
}

export function Recommendations({
  title = "Mais desta coleção",
}: {
  title?: string;
}) {
  const data = useQuery({
    queryKey: ["recommendations"],
    queryFn: async ({ signal }) =>
      (await http.get<{ items: NFT[] }>("/nfts", { signal })).data,
  });

  return (
    <section className="recommendations">
      <h2>{title}</h2>
      {data.data ? (
        <div className="recommendation-grid">
          {data.data.items.slice(3, 8).map((nft) => (
            <NFTCard nft={nft} key={nft.id} />
          ))}
        </div>
      ) : (
        <Loading cards={5} />
      )}
      <div className="slider-dots" aria-hidden="true">
        ○ ● ○
      </div>
    </section>
  );
}
