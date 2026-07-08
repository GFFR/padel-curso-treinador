"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { completeOnboarding } from "@/lib/actions/profile-actions";
import { getProfileInitials } from "@/lib/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm({ email }: { email: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await completeOnboarding(formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Escolher foto de perfil"
        >
          <Avatar size="lg" className="size-24">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-lg">
              {getProfileInitials(displayName, email)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-x-0 bottom-0 rounded-b-full bg-foreground/70 py-1 text-center text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
            Adicionar foto
          </span>
        </button>
        <input
          ref={fileInputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleAvatarChange}
        />
        <p className="text-center text-xs text-muted-foreground">
          Foto opcional · JPG, PNG ou WebP · máx. 2 MB
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Como te chamas?</Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="O teu nome"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          minLength={2}
          maxLength={80}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A guardar..." : "Continuar"}
      </Button>
    </form>
  );
}
