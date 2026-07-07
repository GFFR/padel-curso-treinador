"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "code";

/** Prefixes 9-digit national numbers with +351; passes full E.164 through. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s()-]/g, "");
  if (digits.startsWith("+")) return digits;
  if (/^9\d{8}$/.test(digits)) return `+351${digits}`;
  return digits;
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
    });
    setPending(false);
    if (otpError) {
      setError(
        "Não foi possível enviar o código. Confirma o número e tenta novamente.",
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: code,
      type: "sms",
    });
    setPending(false);
    if (verifyError) {
      setError("Código inválido ou expirado. Tenta novamente.");
      return;
    }
    router.push("/painel");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Número de telemóvel</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Números portugueses podem omitir o indicativo +351.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "A enviar..." : "Enviar código"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Código recebido por SMS</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Enviado para {normalizePhone(phone)}.{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setStep("phone")}
          >
            Alterar número
          </button>
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A verificar..." : "Entrar"}
      </Button>
    </form>
  );
}
