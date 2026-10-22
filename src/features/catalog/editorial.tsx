import { ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useApp } from "../../components/app-context";

export function Editorial() {
  const { notify } = useApp();
  const titles = [
    "Como funciona a propriedade de NFTs",
    "10 artistas digitais para acompanhar",
    "Raridade, atributos e procedência",
    "Como proteger sua carteira",
  ];

  return (
    <>
      <section className="promos">
        {[
          [
            "emerald",
            "Lançamentos gênesis de edição limitada",
            "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
          ],
          [
            "ivory",
            "Arte digital selecionada e muito mais",
            "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
          ],
        ].map(([image, title, description]) => (
          <article key={image}>
            <img
              src={`/assets/${image}.webp`}
              alt=""
              width="292"
              height="250"
              loading="lazy"
            />
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
              <Button size="sm" asChild>
                <a href="#catalogo">
                  Explorar <ArrowRight size={16} />
                </a>
              </Button>
            </div>
          </article>
        ))}
      </section>
      <section id="diario" className="editorial">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="editorial-grid">
          {titles.map((title, index) => (
            <article key={title}>
              <img
                src={`/assets/${["ivory", "emerald", "sage", "golden"][index]}.webp`}
                alt=""
                width="268"
                height="195"
                loading="lazy"
              />
              <div>
                <small>
                  {12 + index} de setembro | Leitura de {index + 2} min
                </small>
                <h3>{title}</h3>
                <p>
                  {
                    [
                      "Aprenda a colecionar, negociar e verificar ativos digitais.",
                      "Conheça criadores que moldam a cultura digital.",
                      "Entenda raridade, procedência, direitos autorais e utilidade.",
                      "Proteja seus ativos, suas chaves e sua privacidade.",
                    ][index]
                  }
                </p>
                <button
                  onClick={() =>
                    notify("Artigo editorial indisponível nesta demonstração.")
                  }
                >
                  Ler mais →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
