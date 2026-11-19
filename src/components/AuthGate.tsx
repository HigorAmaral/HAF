"use client";

import { useEffect, useState } from "react";
import { Briefcase, KeyRound, Lock, Mail, ShieldCheck, User } from "lucide-react";

interface AuthGateProps {
  onAuthenticated: () => void;
}

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao solicitar link");
        setSuccessMsg(json.message);
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, newPassword: password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao redefinir senha");
        setSuccessMsg(json.message);
        setPassword("");
        setMode("login");
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/");
        }
        return;
      }

      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha na autenticação");
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            HAF — Monitor de Vagas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "forgot"
              ? "Informe seu e-mail para receber o link de recuperação."
              : mode === "reset"
                ? "Crie uma nova senha para sua conta."
                : "Entre ou crie sua conta para montar seu currículo e buscar vagas em todas as fontes."}
          </p>
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {mode !== "reset" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {mode !== "forgot" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {mode === "reset" ? "Nova senha (mínimo 6 caracteres)" : "Senha"}
              </label>
              <div className="relative">
                {mode === "reset" ? (
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                ) : (
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                )}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading
              ? "Processando..."
              : mode === "login"
                ? "Entrar no HAF"
                : mode === "register"
                  ? "Criar Conta e Começar"
                  : mode === "forgot"
                    ? "Enviar Link de Recuperação"
                    : "Salvar Nova Senha"}
          </button>
        </form>

        <div className="text-center text-xs">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-indigo-400 hover:underline"
            >
              Esqueci minha senha
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-slate-400 hover:text-slate-200 hover:underline"
            >
              ← Voltar para o login
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Senha protegida com Scrypt + Sessão assinada HTTP-only</span>
        </div>
      </div>
    </div>
  );
}
