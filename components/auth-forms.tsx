"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type FormState,
} from "@/app/actions/auth";
import { Alert, SubmitButton } from "./ui";

const initial: FormState = {};

function Field({
  label,
  name,
  type = "text",
  error,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState(signIn, initial);
  const error = state.error ?? (state === initial ? initialError : undefined);
  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-semibold">Iniciar sesión</h2>
      {error && <Alert>{error}</Alert>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-emerald-700 hover:underline dark:text-emerald-400">
          ¿Olvidaste tu contraseña?
        </Link>
        <span className="muted">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Regístrate
          </Link>
        </span>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initial);
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {}
  }, []);

  if (state.message) {
    return (
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Revisa tu email</h2>
        <Alert kind="success">{state.message}</Alert>
        <Link href="/login" className="btn-secondary w-full">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-semibold">Crear cuenta</h2>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="timezone" value={timezone} />
      <Field label="Nombre" name="name" autoComplete="name" required maxLength={80} error={state.fieldErrors?.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
      />
      <p className="muted text-xs">Mínimo 8 caracteres. Zona horaria detectada: {timezone}</p>
      <SubmitButton pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="muted text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-semibold">Recuperar contraseña</h2>
      <p className="muted text-sm">Te enviaremos un enlace para crear una contraseña nueva.</p>
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert kind="success">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <SubmitButton pendingText="Enviando…">Enviar enlace</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-emerald-700 hover:underline dark:text-emerald-400">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-lg font-semibold">Nueva contraseña</h2>
      {state.error && <Alert>{state.error}</Alert>}
      <Field
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
      />
      <Field
        label="Repite la contraseña"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
