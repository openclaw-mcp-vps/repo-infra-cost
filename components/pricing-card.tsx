"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function getCookieValue(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return cookie ? decodeURIComponent(cookie) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function createCheckoutReference() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

interface PricingCardProps {
  checkoutBaseUrl: string | null;
  variant?: "single" | "subscription";
  compact?: boolean;
}

export function PricingCard({ checkoutBaseUrl, variant = "single", compact = false }: PricingCardProps) {
  const [email, setEmail] = useState("");
  const [checkoutRef, setCheckoutRef] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "waiting" | "granted" | "failed">("idle");

  useEffect(() => {
    const existing = getCookieValue("ric_checkout_ref");
    if (existing) {
      setCheckoutRef(existing);
      setStatus("waiting");
    }
  }, []);

  const checkoutUrl = useMemo(() => {
    if (!checkoutBaseUrl) return null;

    const ref = checkoutRef ?? createCheckoutReference();

    try {
      const url = new URL(checkoutBaseUrl);
      url.searchParams.set("checkout[custom][checkout_ref]", ref);
      url.searchParams.set("checkout[custom][source]", "repo-infra-cost");

      if (email.trim()) {
        url.searchParams.set("checkout[email]", email.trim());
        url.searchParams.set("checkout[custom][email_hint]", email.trim());
      }

      return { ref, href: url.toString() };
    } catch {
      return null;
    }
  }, [checkoutBaseUrl, checkoutRef, email]);

  async function checkStatus(refToCheck?: string) {
    const targetRef = refToCheck ?? checkoutRef;
    if (!targetRef) return;

    setIsChecking(true);
    try {
      const response = await fetch(`/api/webhooks/lemonsqueezy?checkoutRef=${encodeURIComponent(targetRef)}`);
      const data = (await response.json()) as { granted?: boolean };

      if (data.granted) {
        setStatus("granted");
        window.location.reload();
      } else {
        setStatus("waiting");
      }
    } catch {
      setStatus("failed");
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (status !== "waiting" || !checkoutRef) return;

    const interval = setInterval(() => {
      void checkStatus(checkoutRef);
    }, 8000);

    return () => clearInterval(interval);
  }, [checkoutRef, status]);

  const price = variant === "single" ? "$3" : "$12/mo";
  const caption =
    variant === "single"
      ? "One estimate. Ideal for one-off platform decisions."
      : "Unlimited monthly estimates for active side-project builders.";

  return (
    <Card className={compact ? "max-w-md" : "w-full max-w-md"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-green-400" />
          {variant === "single" ? "Single Estimate" : "Unlimited Monthly"}
        </CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-semibold text-slate-100">{price}</p>
          <p className="mt-1 text-sm text-slate-400">Lemon Squeezy checkout overlay</p>
        </div>

        <div className="space-y-2">
          <label htmlFor={`email-${variant}`} className="text-xs text-slate-400">
            Email for receipt and access sync
          </label>
          <Input
            id={`email-${variant}`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@domain.com"
          />
        </div>

        {status === "waiting" && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Payment initiated. After checkout, return here and click "Check unlock status" if access does not activate automatically.
          </p>
        )}

        {status === "failed" && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            Could not verify payment status right now. Retry in a few seconds.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {checkoutUrl ? (
          <a
            href={checkoutUrl.href}
            className="lemonsqueezy-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-green-400"
            onClick={() => {
              setCheckoutRef(checkoutUrl.ref);
              setCookie("ric_checkout_ref", checkoutUrl.ref, 60 * 60 * 24 * 2);
              setStatus("waiting");
            }}
          >
            Open Checkout <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            Checkout is not configured. Set `NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID` to a Lemon Squeezy buy link.
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={() => void checkStatus()} disabled={isChecking || !checkoutRef}>
          {isChecking ? "Checking..." : "Check unlock status"}
          <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
        </Button>
      </CardFooter>
    </Card>
  );
}
