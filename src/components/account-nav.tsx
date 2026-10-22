import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Heart, LogOut, ShoppingCart, User, Wallet } from "lucide-react";
import { clearSessionCache, errorMessage, http } from "../api";
import { useApp } from "./app-context";

export function AccountNav() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: async () => {
      await http.delete("/session");
      await clearSessionCache({ user: null, expiresAt: 0 });
      await navigate({ to: "/" });
    },
    onError: (error) => notify(errorMessage(error)),
  });

  return (
    <aside className="account-nav">
      <h2>Meu perfil</h2>
      <Link to="/perfil">
        <User size={17} />
        Dados do perfil
      </Link>
      <Link to="/carteiras">
        <Wallet size={17} />
        Carteiras
      </Link>
      <button
        onClick={() => notify("Atividade indisponível nesta demonstração.")}
      >
        <ShoppingCart size={17} />
        Atividade
      </button>
      <Link to="/favoritos">
        <Heart size={17} />
        Lista de interesse
      </Link>
      {["Ofertas", "Arquivos baixados", "Suporte"].map((item) => (
        <button
          key={item}
          onClick={() => notify(`${item}: fora do escopo desta demonstração.`)}
        >
          {item}
        </button>
      ))}
      <button disabled={logout.isPending} onClick={() => logout.mutate()}>
        <LogOut size={17} />
        Sair
      </button>
    </aside>
  );
}
