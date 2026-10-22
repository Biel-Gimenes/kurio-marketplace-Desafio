import { ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";

export function Hero() {
  return (
    <section className="hero" aria-label="Bem-vindo à Kurio">
      <div className="hero-copy">
        <span>Bem-vindo à Kurio</span>
        <h1>
          <span className="hero-desktop-title">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="hero-mobile-title">
            SEJA DONO DA CULTURA DIGITAL
          </span>
        </h1>
        <p>
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e faça parte da cultura da
          internet.
        </p>
        <Button asChild>
          <a href="#catalogo">
            EXPLORAR <ArrowRight size={16} />
          </a>
        </Button>
      </div>
      <img
        className="hero-image"
        src="/assets/emerald.webp"
        alt="Emerald Ape: arte digital de macaco com óculos e jaqueta verde"
        width="450"
        height="450"
        fetchPriority="high"
      />
      <img
        className="hero-companion"
        src="/assets/sage.webp"
        alt=""
        width="58"
        height="58"
      />
      <div className="hero-dots" aria-hidden="true">
        ● ● ●
      </div>
    </section>
  );
}
