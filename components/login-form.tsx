"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/ui";

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (result?.error)
        setError("Sign-in failed. Check your credentials or try again later.");
      else {
        router.replace("/admin");
        router.refresh();
      }
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit}>
      <Brand />
      <p className="eyebrow">COMMUNITY STAFF</p>
      <h1>Welcome back.</h1>
      <p>Sign in to manage the community hub.</p>
      <label className="field">
        <span>Email address</span>
        <input type="email" name="email" required autoComplete="username" />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          maxLength={200}
        />
      </label>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Signing in..." : "Sign in"}
        <ArrowRight size={16} />
      </button>
      <Link href="/" className="login-back">
        Back to the community
      </Link>
    </form>
  );
}
