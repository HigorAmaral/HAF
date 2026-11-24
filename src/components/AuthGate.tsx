"use client";

import { useEffect, useState } from "react";
import { Briefcase, KeyRound, Lock, Mail, ShieldCheck, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
    const rafId = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("reset_token");
      if (token) {
        setResetToken(token);
        setMode("reset");
      }
    });
    return () => cancelAnimationFrame(rafId);
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
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4 py-8 text-[var(--text-primary)]">
      <div className="gupy-card relative w-full max-w-md space-y-6 p-8">
        <div className="flex items-center justify-between">
          <span className="indeed-badge px-2.5 py-1 text-[11px]">
            Portal de Vagas
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="indeed-btn-primary mb-3 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm">
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            HAF — Monitor de Vagas
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {mode === "forgot"
              ? "Informe seu e-mail para receber o link de recuperação."
              : mode === "reset"
                ? "Crie uma nova senha para sua conta."
                : "Entre ou crie sua conta para montar seu currículo e buscar vagas em mais de 65 fontes."}
          </p>
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "indeed-btn-primary shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "indeed-btn-primary shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
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
            className="indeed-btn-primary w-full py-2.5 text-sm shadow-sm disabled:opacity-50"
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
              className="font-semibold text-[var(--accent-bg)] hover:underline"
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
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
            >
              ← Voltar para o login
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-muted)]">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Senha protegida com Scrypt + Sessão assinada HTTP-only</span>
        </div>
      </div>
    </div>
  );
}
