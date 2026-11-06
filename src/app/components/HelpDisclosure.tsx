import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function HelpDisclosure({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return <details className="group/help overflow-hidden rounded-none border-y border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] sm:rounded-xl sm:border">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-gray-300 transition-colors hover:bg-[var(--overlay-ink)]/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5B69FF] [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block">{title}</span>
        {description && <span className="mt-1 block text-xs font-normal leading-6 text-gray-400">{description}</span>}
      </span>
      <ChevronDown aria-hidden="true" size={16} className="shrink-0 text-gray-500 transition-transform group-open/help:rotate-180" />
    </summary>
    <div className="border-t border-[var(--overlay-ink)]/5 p-5 text-[13px] leading-7 text-gray-400">{children}</div>
  </details>;
}
