import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccordionItemProps {
  question: string;
  answer: string;
  className?: string;
}

export function AccordionItem({ question, answer, className }: AccordionItemProps) {
  return (
    <details
      className={cn(
        "group rounded-lg border border-slate-800 bg-slate-900/50 p-4 open:bg-slate-900",
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-medium text-slate-100">
        {question}
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
    </details>
  );
}
