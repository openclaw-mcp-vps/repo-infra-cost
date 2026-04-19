import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-400" />
      <h1 className="mt-6 text-3xl font-semibold text-slate-100">Checkout completed</h1>
      <p className="mt-3 max-w-xl text-slate-400">
        Return to the estimator page. Access is enabled automatically once the Lemon Squeezy webhook confirms your purchase.
      </p>
      <div className="mt-6">
        <Link href="/estimate">
          <Button size="lg">Go to estimator</Button>
        </Link>
      </div>
    </main>
  );
}
