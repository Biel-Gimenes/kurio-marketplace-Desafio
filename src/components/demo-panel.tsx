import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import {
  clearSessionCache,
  errorMessage,
  http,
  queryClient,
  useDemo,
} from "../api";
import type { Scenario } from "../contracts";
import { Button } from "./ui/button";
import { Dialog } from "./dialog";
import { useApp } from "./app-context";

/**
 * Painel usado na demo para provocar falhas, eventos de socket e reset.
 * Tudo passa por HTTP: o componente não toca no estado simulado diretamente.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const demo = useDemo();
  const { notify, connected } = useApp();
  const [nftId, setNftId] = useState("1");
  const mutate = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await http.post("/demo", data)).data,
    onSuccess: async (_data, variables) => {
      if (variables.action === "reset") {
        for (const key of Object.keys(localStorage))
          if (key.startsWith("kurio-attempt:")) localStorage.removeItem(key);
        for (const key of Object.keys(sessionStorage))
          if (key.startsWith("kurio-draft:")) sessionStorage.removeItem(key);
        await clearSessionCache({ user: null, expiresAt: 0 });
        location.assign("/");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["demo"] });
      if (variables.scenario === "expired")
        await queryClient.invalidateQueries({ queryKey: ["session"] });
      notify("Cenário atualizado na simulação.");
    },
    onError: (error) => notify(errorMessage(error)),
  });

  return (
    <>
      <button
        className="demo-trigger"
        aria-label="Abrir painel de demonstração"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={15} />
        <span>Demonstração</span>
        <span
          className={connected ? "connection-on" : "connection-off"}
          aria-label={connected ? "Socket conectado" : "Socket desconectado"}
        />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Painel de demonstração"
        description="Dados fictícios persistidos neste navegador. Eventos enviados pelo Socket.IO."
        className="demo-dialog"
      >
        <label>
          Cenário
          <select
            aria-label="Cenário"
            value={demo.data?.scenario ?? "normal"}
            onChange={(event) =>
              mutate.mutate({ scenario: event.target.value as Scenario })
            }
          >
            {[
              ["normal", "Sucesso"],
              ["empty", "Resultado vazio"],
              ["slow", "Lentidão (1,8 s)"],
              ["variable", "Respostas fora de ordem"],
              ["offline", "Falha de conexão REST"],
              ["server-error", "HTTP 503"],
              ["favorite-error", "Falha no próximo favorito"],
              ["expired", "Expirar sessão"],
              ["declined", "Pagamento recusado"],
              ["timeout", "Timeout após criar pedido"],
              ["wallet-refused", "Conexão de carteira recusada"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ID do NFT
          <input
            aria-label="ID do NFT"
            value={nftId}
            onChange={(event) => setNftId(event.target.value)}
          />
        </label>
        <div className="demo-buttons">
          {[
            ["price", "Aumentar preço"],
            ["stock", "Esgotar edições"],
            ["duplicate", "Repetir evento"],
            ["stale", "Evento antigo"],
            ["disconnect", "Desconectar socket"],
            ["reconnect", "Reconectar socket"],
          ].map(([action, label]) => (
            <Button
              variant="outline"
              key={action}
              onClick={() => mutate.mutate({ action, nftId })}
            >
              {label}
            </Button>
          ))}
        </div>
        <p role="status">Socket: {connected ? "conectado" : "desconectado"}</p>
        <Button
          variant="outline"
          onClick={() => mutate.mutate({ action: "reset" })}
        >
          Reset integral da demonstração
        </Button>
      </Dialog>
    </>
  );
}
