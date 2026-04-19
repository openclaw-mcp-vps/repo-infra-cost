"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How accurate are these cost estimates?",
    answer:
      "You get directional budget numbers based on repo signals and traffic assumptions. Teams usually land within 20-35% after calibrating request volume and data transfer patterns."
  },
  {
    question: "What does the GitHub analyzer inspect?",
    answer:
      "Repo Infra Cost fetches package.json and Dockerfile from common project paths, then infers framework type, runtime baseline, and likely infra shape."
  },
  {
    question: "Can I estimate private repositories?",
    answer:
      "Yes. Add a GitHub token in server environment (`GITHUB_TOKEN`) and private repo reads will use that identity."
  },
  {
    question: "Why compare AWS, Fly, Railway, and Vercel together?",
    answer:
      "They represent the typical self-hosted and managed paths indie devs actually choose. Seeing all four side by side stops platform lock-in surprises."
  },
  {
    question: "Does unlimited monthly include API access?",
    answer:
      "The $12/month plan includes unlimited in-app estimates. API access can be added later for automation-heavy teams."
  }
];

export function FAQSection() {
  return (
    <div className="space-y-3">
      {faqs.map((item) => (
        <Disclosure key={item.question}>
          {({ open }) => (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60">
              <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-100">
                <span>{item.question}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
              </Disclosure.Button>
              <Disclosure.Panel className="px-5 pb-4 text-sm leading-relaxed text-slate-400">{item.answer}</Disclosure.Panel>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
