import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { useApp } from "./app-context";

export function Footer() {
  const { notify } = useApp();
  const unavailable = () =>
    notify("Conteúdo editorial indisponível nesta demonstração.");

  return (
    <footer className="footer">
      <div className="footer-top">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
          ],
        ].map(([letter, title, description]) => (
          <div key={letter}>
            <span className="medallion">{letter}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
        <div>
          <h3>Antecipe-se ao próximo lançamento</h3>
          <form
            className="newsletter"
            onSubmit={(event) => {
              event.preventDefault();
              notify(
                "A inscrição na newsletter não está disponível nesta demonstração.",
              );
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email">
              E-mail para novidades
            </label>
            <input
              id="newsletter-email"
              placeholder="digite seu e-mail..."
              type="email"
              required
            />
            <Button size="sm">Enviar</Button>
          </form>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </div>
      </div>
      <div className="footer-band">
        <b className="wordmark">KURIO</b>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="footer-links">
        <div>
          <h3>Meu perfil</h3>
          <Link to="/perfil">Meu perfil</Link>
          <Link to="/favoritos">Minha coleção</Link>
          <button onClick={unavailable}>Atividade</button>
          <button onClick={unavailable}>Estúdio do criador</button>
          <Link to="/favoritos">Lista de interesse</Link>
        </div>
        <div>
          <h3>Central de ajuda</h3>
          {[
            "Central de ajuda",
            "Como comprar NFTs",
            "Carteira e segurança",
            "Política do mercado",
            "Denunciar item",
          ].map((label) => (
            <button key={label} onClick={unavailable}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <h3>Coleções</h3>
          {["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map(
            (collection) => (
              <Link key={collection} to="/" search={{ collections: collection, page: 1 }}>
                {collection}
              </Link>
            ),
          )}
        </div>
        <div>
          <h3>Redes sociais</h3>
          <div className="socials">
            {["f", "◎", "♥", "in", "▣"].map((symbol) => (
              <button
                aria-label={`Rede social ${symbol}`}
                onClick={unavailable}
                key={symbol}
              >
                {symbol}
              </button>
            ))}
          </div>
          <h3>Carteiras compatíveis</h3>
          <small className="wallet-chip">
            METAMASK · WALLETCONNECT · COINBASE
          </small>
        </div>
      </div>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}
