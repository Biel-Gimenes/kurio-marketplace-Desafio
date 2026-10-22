import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Plus } from "lucide-react";
import {
  clearSessionCache,
  http,
  queryClient,
  useProfile,
  useSession,
  useWallets,
} from "../api";
import type { Profile, Session, Wallet } from "../contracts";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/dialog";
import { Field, FormError, applyServerErrors } from "../components/forms";
import { AccountNav } from "../components/account-nav";
import { useApp } from "../components/app-context";
import { ErrorState, Loading } from "../components/common";
import { Catalog } from "./catalog";
const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/\d/, "Inclua um número.");
const text = z.string().trim().min(2, "Use pelo menos 2 caracteres.");
const email = z.email("Informe um e-mail válido.");
const authSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
  name: z.string(),
  username: z.string(),
  confirm: z.string(),
});
export function Auth({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const search = useSearch({ strict: false });
  const target =
    search.returnTo?.startsWith("/") && !search.returnTo.startsWith("//")
      ? search.returnTo
      : "/";
  const navigate = useNavigate();
  const { notify } = useApp();
  const schema = authSchema.superRefine((data, ctx) => {
    if (isRegister) {
      for (const key of ["name", "username"] as const)
        if (data[key].trim().length < 2)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Use pelo menos 2 caracteres.",
          });
      if (!password.safeParse(data.password).success)
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Use 8 caracteres, uma maiúscula e um número.",
        });
      if (data.password !== data.confirm)
        ctx.addIssue({
          code: "custom",
          path: ["confirm"],
          message: "As senhas não coincidem.",
        });
    }
  });
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      username: "",
      confirm: "",
    },
  });
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof authSchema>) =>
      (await http.post<Session>(isRegister ? "/register" : "/login", data))
        .data,
    onSuccess: async (session) => {
      await clearSessionCache(session);
      notify(
        session.adjustments?.length
          ? session.adjustments.join(" ")
          : isRegister
            ? "Conta criada. Bem-vindo à Kurio."
            : "Bem-vindo de volta.",
      );
      await navigate({ to: target });
    },
    onError: (e) => applyServerErrors(form, e),
  });
  const title = isRegister ? "Criar perfil de colecionador" : "Entrar";
  return (
    <>
      <div className="auth-background" aria-hidden="true" inert>
        <Catalog />
      </div>
      <Dialog
        open
        onOpenChange={(v) => {
          if (!v) void navigate({ to: target });
        }}
        title={title}
        description={
          isRegister
            ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
            : "Entre para gerenciar sua carteira, coleção e perfil de criador."
        }
        className="auth-dialog"
      >
        <div className="auth-brand">KURIO</div>
        <div className="auth-tabs">
          <Link
            to="/login"
            search={{ returnTo: target }}
            className={!isRegister ? "selected" : ""}
          >
            Entrar
          </Link>
          <span>|</span>
          <Link
            to="/cadastro"
            search={{ returnTo: target }}
            className={isRegister ? "selected" : ""}
          >
            Criar conta
          </Link>
        </div>
        <form
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          noValidate
        >
          {isRegister && (
            <>
              <Field
                form={form}
                name="name"
                label="Nome de exibição"
                autoComplete="name"
              />
              <Field
                form={form}
                name="username"
                label="Nome de usuário"
                autoComplete="username"
              />
            </>
          )}
          <Field
            form={form}
            name="email"
            label="E-mail"
            type="email"
            placeholder="contato@email.com"
            autoComplete="email"
          />
          <Field
            form={form}
            name="password"
            label="Senha"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && (
            <Field
              form={form}
              name="confirm"
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
            />
          )}
          {!isRegister && (
            <button
              className="forgot-link"
              type="button"
              onClick={() =>
                notify(
                  "Recuperação de senha indisponível nesta demonstração. Use as credenciais do README.",
                )
              }
            >
              Esqueceu a senha?
            </button>
          )}
          <FormError form={form} />
          <Button className="w-full" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde…"
              : isRegister
                ? "Criar conta"
                : "Entrar"}
          </Button>
        </form>
        <div className="auth-divider">Ou continue com</div>
        <div className="auth-socials">
          <Button
            variant="outline"
            onClick={() =>
              notify("Login com Google indisponível nesta demonstração.")
            }
          >
            <b className="google-mark">G</b> Continuar com Google
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              notify("Login com Facebook indisponível nesta demonstração.")
            }
          >
            <b className="facebook-mark">f</b> Continuar com Facebook
          </Button>
        </div>
        <p className="auth-switch">
          {isRegister ? "Já tem uma conta?" : "Novo na Kurio?"}{" "}
          <Link
            to={isRegister ? "/login" : "/cadastro"}
            search={{ returnTo: target }}
          >
            {isRegister ? "Entre" : "Crie uma conta"}
          </Link>
        </p>
      </Dialog>
    </>
  );
}
const profileSchema = z.object({
  name: text,
  username: text,
  email,
  ens: z.string(),
  walletAlias: text,
  avatar: z.string(),
});
export function ProfilePage() {
  const profile = useProfile();
  if (profile.isPending) return <Loading cards={2} />;
  if (profile.isError)
    return (
      <ErrorState error={profile.error} retry={() => void profile.refetch()} />
    );
  return (
    <div className="account-layout">
      <AccountNav />
      <ProfileForm key={profile.data.id} profile={profile.data} />
    </div>
  );
}
function ProfileForm({ profile }: { profile: Profile }) {
  const { notify } = useApp();
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });
  const avatar = form.watch("avatar");
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) =>
      (await http.patch<Profile>("/profile", data)).data,
    onSuccess: async (data) => {
      queryClient.setQueryData(["private", profile.id, "profile"], data);
      queryClient.setQueryData<Session>(["session"], (old) =>
        old ? { ...old, user: data } : old,
      );
      notify("Perfil atualizado.");
      form.reset(data);
    },
    onError: (e) => applyServerErrors(form, e),
  });
  return (
    <section>
      <h1>Perfil do colecionador</h1>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        noValidate
      >
        <div className="form-grid">
          <Field form={form} name="name" label="Nome de exibição" required />
          <Field form={form} name="username" label="Nome de usuário" required />
          <Field
            form={form}
            name="email"
            label="E-mail"
            type="email"
            required
          />
          <Field
            form={form}
            name="ens"
            label="Nome ENS"
            placeholder="seunome.eth"
          />
          <Field
            form={form}
            name="walletAlias"
            label="Apelido da carteira"
            required
          />
          <div className="avatar-field">
            <label htmlFor="avatar-file">Avatar</label>
            <div>
              {avatar ? (
                <img src={avatar} alt="Seu avatar" width="44" height="44" />
              ) : (
                <User size={36} />
              )}
              <label className="file-button" htmlFor="avatar-file">
                Alterar
              </label>
              <input
                className="sr-only"
                id="avatar-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 1000000
                  ) {
                    notify("Escolha uma imagem PNG, JPEG ou WebP de até 1 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () =>
                    form.setValue("avatar", String(reader.result), {
                      shouldDirty: true,
                    });
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  form.setValue("avatar", "", { shouldDirty: true })
                }
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
        <FormError form={form} />
        <Button disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </form>
      <PasswordForm />
    </section>
  );
}
const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });
function PasswordForm() {
  const { notify } = useApp();
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) =>
      http.post("/password", data),
    onSuccess: () => {
      notify("Senha alterada com sucesso.");
      form.reset();
    },
    onError: (e) => applyServerErrors(form, e),
  });
  return (
    <form
      className="password-form"
      onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
      noValidate
    >
      <h2>Alterar senha</h2>
      <Field
        form={form}
        name="current"
        type="password"
        label="Senha atual"
        autoComplete="current-password"
      />
      <Field
        form={form}
        name="password"
        type="password"
        label="Nova senha"
        autoComplete="new-password"
      />
      <Field
        form={form}
        name="confirm"
        type="password"
        label="Confirmar nova senha"
        autoComplete="new-password"
      />
      <FormError form={form} />
      <Button disabled={mutation.isPending}>Salvar senha</Button>
    </form>
  );
}
const walletSchema = z
  .object({
    id: z.string(),
    name: text,
    alias: text,
    network: z.enum(["Ethereum", "Polygon", "Solana"]),
    address: z.string().min(1, "Informe o endereço da carteira."),
    provider: z.enum(["MetaMask", "WalletConnect", "Coinbase Wallet"]),
    profile: text,
    email,
    ens: z.string(),
    referral: text,
  })
  .superRefine((w, ctx) => {
    if (
      !(
        w.network === "Solana"
          ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
          : /^0x[a-fA-F0-9]{40}$/
      ).test(w.address)
    )
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Endereço inválido para a rede selecionada.",
      });
  });
export function WalletsPage() {
  const wallets = useWallets();
  const session = useSession();
  const [adding, setAdding] = useState(false);
  if (wallets.isPending) return <Loading cards={2} />;
  if (wallets.isError)
    return (
      <ErrorState error={wallets.error} retry={() => void wallets.refetch()} />
    );
  return (
    <div className="account-layout">
      <AccountNav />
      <section>
        <div className="section-heading">
          <h1>Suas carteiras</h1>
          <Button variant="ghost" onClick={() => setAdding(!adding)}>
            <Plus size={17} />
            {adding ? "Cancelar" : "Adicionar"}
          </Button>
        </div>
        <p className="muted">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs
          comprados.
        </p>
        {wallets.data.map((wallet, i) => (
          <WalletForm
            wallet={wallet}
            title={i === 0 ? "Carteira principal" : "Carteira secundária"}
            key={wallet.id}
          />
        ))}
        {(adding || !wallets.data.length) && (
          <WalletForm
            title="Adicionar carteira"
            onSaved={() => setAdding(false)}
            wallet={{
              id: "",
              name: "Nova carteira",
              alias: "Minha carteira",
              network: "Ethereum",
              address: "",
              provider: "MetaMask",
              profile: session.data?.user?.name ?? "",
              email: session.data?.user?.email ?? "",
              ens: "",
              referral: "KURIO",
            }}
          />
        )}
      </section>
    </div>
  );
}
function WalletForm({
  wallet,
  title,
  onSaved,
}: {
  wallet: Wallet;
  title: string;
  onSaved?: () => void;
}) {
  const { notify } = useApp();
  const form = useForm<z.infer<typeof walletSchema>>({
    resolver: zodResolver(walletSchema),
    defaultValues: wallet,
  });
  const mutation = useMutation({
    mutationFn: async (data: Wallet) =>
      http.request({
        url: "/wallets",
        method: data.id ? "PATCH" : "POST",
        data,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["private"] });
      notify("Carteira salva.");
      onSaved?.();
    },
    onError: (e) => applyServerErrors(form, e),
  });
  return (
    <form
      className="wallet-form"
      onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
      noValidate
    >
      <h2>{title}</h2>
      <div className="form-grid">
        <Field form={form} name="name" label="Nome de exibição" required />
        <Field form={form} name="alias" label="Apelido da carteira" required />
        <Field
          form={form}
          name="network"
          label="Rede"
          options={["Ethereum", "Polygon", "Solana"]}
          required
        />
        <Field form={form} name="profile" label="Nome do perfil" required />
        <Field
          form={form}
          name="address"
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          required
        />
        <Field
          form={form}
          name="ens"
          label="ENS ou carteira secundária (opcional)"
        />
        <Field
          form={form}
          name="provider"
          label="Tipo de carteira"
          options={["MetaMask", "WalletConnect", "Coinbase Wallet"]}
          required
        />
        <Field
          form={form}
          name="referral"
          label="Código de indicação"
          required
        />
        <Field form={form} name="email" label="E-mail" type="email" required />
      </div>
      <FormError form={form} />
      <Button disabled={mutation.isPending}>
        {mutation.isPending ? "Salvando…" : "Salvar carteira"}
      </Button>
    </form>
  );
}

export function LoginPage() {
  return <Auth mode="login" />;
}
export function RegisterPage() {
  return <Auth mode="register" />;
}
