import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import axios from "axios";
import {
  clearSessionCache,
  http,
  queryClient,
  useSession,
} from "../api";
import type { ResourceEvent } from "../contracts";
import { acceptVersion } from "../rules";
import { Button } from "./ui/button";
import { AppContext } from "./app-context";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { DemoPanel } from "./demo-panel";

const PRIVATE_ROUTES = ["/checkout", "/perfil", "/carteiras", "/favoritos", "/pedidos"];

export function Layout({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const session = useSession();
  const uid = session.data?.user?.id;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const previousUid = useRef(uid);

  // Ao trocar de conta, descarta o cache privado do usuário anterior.
  useEffect(() => {
    if (previousUid.current && previousUid.current !== uid) {
      void queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: ["private", previousUid.current] });
      queryClient.removeQueries({ queryKey: ["cart", previousUid.current] });
      queryClient.removeQueries({ queryKey: ["quote", previousUid.current] });
    }
    previousUid.current = uid;
  }, [uid]);

  // O socket só pode ser importado depois que o MSW iniciou, porque o cliente
  // captura o construtor de WebSocket no momento do import.
  useEffect(() => {
    let cancelled = false;
    let dispose = () => {};
    void import("socket.io-client")
      .then(({ io }) => {
        if (cancelled) return;
        const socket = io("https://realtime.kurio.test", {
          transports: ["websocket"],
          reconnectionDelay: 700,
        });
        const versions = new Map<string, number>();
        socket.on("connect", () => {
          setConnected(true);
          void queryClient.invalidateQueries();
        });
        socket.on("disconnect", () => setConnected(false));
        const receive = (event: ResourceEvent) => {
          if (event.userId && event.userId !== uid) return;
          const key = `${event.userId ?? "public"}:${event.resourceId}`;
          if (!acceptVersion(versions.get(key) ?? 0, event)) return;
          versions.set(key, event.version);
          if (event.userId) {
            void queryClient.invalidateQueries({
              queryKey: ["private", uid, "order", event.resourceId],
            });
            void queryClient.invalidateQueries({ queryKey: ["cart"] });
          } else {
            setMessage(
              "Preço ou disponibilidade atualizado em tempo real. Revise seu carrinho.",
            );
            for (const key of [
              ["catalog"],
              ["nft", event.resourceId],
              ["cart"],
              ["quote"],
            ])
              void queryClient.invalidateQueries({ queryKey: key });
          }
        };
        socket.on("nft.updated", receive);
        socket.on("order.updated", receive);
        dispose = () => {
          socket.removeAllListeners();
          socket.disconnect();
        };
      })
      .catch(() => setConnected(false));
    return () => {
      cancelled = true;
      dispose();
    };
  }, [uid]);

  // Sessão expirada em qualquer request privada volta para o login.
  useEffect(() => {
    const interceptor = http.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          error.response.data?.code === "UNAUTHENTICATED"
        ) {
          await clearSessionCache({ user: null, expiresAt: 0 });
          setMessage("Sessão expirada. Entre novamente para continuar.");
          const current = window.location.pathname + window.location.search;
          if (!["/login", "/cadastro"].includes(window.location.pathname))
            void navigate({ to: "/login", search: { returnTo: current } });
        }
        return Promise.reject(error);
      },
    );
    return () => http.interceptors.response.eject(interceptor);
  }, [navigate]);

  useEffect(() => {
    if (
      session.data &&
      !session.data.user &&
      PRIVATE_ROUTES.some((route) => pathname.startsWith(route))
    )
      void navigate({
        to: "/login",
        search: { returnTo: pathname + location.search },
      });
  }, [session.data, pathname, navigate]);

  useEffect(() => {
    document.title =
      pathname === "/"
        ? "Kurio — Arte digital para colecionar"
        : `${pathname.split("/")[1]} — Kurio`;
  }, [pathname]);

  return (
    <AppContext.Provider value={{ notify: setMessage, connected }}>
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="shell">
        <Header />
        <main id="main">{children}</main>
        {!["/perfil", "/carteiras"].includes(pathname) && <Footer />}
      </div>
      <MobileNav />
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            aria-label="Dispensar mensagem"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      <DemoPanel />
    </AppContext.Provider>
  );
}

export function NotFound() {
  return (
    <div className="state-panel">
      <h1>Página não encontrada</h1>
      <p>Este endereço não está disponível.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
