import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./api";
import "@fontsource/roboto-mono/latin-400.css";
import "@fontsource/roboto-mono/latin-500.css";
import "@fontsource/roboto-mono/latin-700.css";
import "./styles.css";
async function start() {
  const routerPromise = import("./router");
  // O worker precisa assumir o controle antes do primeiro render, porque as
  // rotas disparam queries assim que o router monta.
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { worker } = await import("./mocks/server");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }
  const { router } = await routerPromise;
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void start().catch((error) => {
  document.getElementById("root")!.textContent =
    `Não foi possível iniciar a demonstração: ${String(error)}. Recarregue a página.`;
});
