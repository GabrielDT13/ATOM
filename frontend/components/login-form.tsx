"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type { SessionResponse } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch<SessionResponse>("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesión",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-box">
      {error ? <div className="login-error">{error}</div> : null}
      <h2 className="login-title">Iniciar sesión</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          autoComplete="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Usuario"
          required
          type="text"
          value={username}
        />
        <div className="password-group">
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label="Mostrar u ocultar contraseña"
            className="toggle-password"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            <Image alt="Mostrar contraseña" height={25} src="/images/eye.png" width={25} />
          </button>
        </div>
        <button className="btn-submit" disabled={loading} type="submit">
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
