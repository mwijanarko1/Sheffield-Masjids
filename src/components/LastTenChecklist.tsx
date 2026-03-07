"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  type Difficulty,
  isItemEffectivelyChecked,
  LastTenChecklistItem,
} from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

interface LastTenChecklistProps {
  night: number;
  difficulty: Difficulty;
  items: LastTenChecklistItem[];
  checkedItems: Record<string, boolean>;
  onToggleItem: (itemId: string) => void;
}

function renderTextBlock(content?: string | string[]) {
  if (!content) return null;
  const lines = Array.isArray(content) ? content : [content];
  return lines.map((line, index) => (
    <p key={`${line.slice(0, 24)}-${index}`}>{line}</p>
  ));
}

export default function LastTenChecklist({
  night,
  difficulty,
  items,
  checkedItems,
  onToggleItem,
}: LastTenChecklistProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div
      id={`last-ten-panel-${night}`}
      role="tabpanel"
      aria-labelledby={`last-ten-tab-${night}`}
      className="divide-y divide-white/8"
      tabIndex={0}
    >
      {items.map((item) => {
        const checked = isItemEffectivelyChecked(item.id, checkedItems);
        const checkboxId = `night-${night}-${item.id}`;
        const isOpen = openId === item.id;
        const actionPoint =
          item.actionPointByDifficulty?.[difficulty] ?? item.actionPoint;

        return (
          <article key={item.id} className="py-3 first:pt-1">
            {/* Main row: checkbox + action text + chevron */}
            <div className="flex items-center gap-3">
              {/* Checkbox */}
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={() => onToggleItem(item.id)}
                className={cn(
                  "h-5 w-5 shrink-0 rounded-md border-2 appearance-none cursor-pointer transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]",
                  checked
                    ? "border-[#FFB380] bg-[#FFB380]"
                    : "border-white/25 bg-transparent hover:border-white/40",
                )}
                style={{
                  backgroundImage: checked
                    ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='%230A1128' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`
                    : undefined,
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />

              {/* Action point label */}
              <label
                htmlFor={checkboxId}
                className={cn(
                  "flex-1 min-w-0 cursor-pointer text-sm font-medium leading-snug transition-colors duration-200 sm:text-[15px] break-words",
                  checked ? "text-white/50 line-through" : "text-white/90",
                )}
              >
                {actionPoint}
              </label>

              {/* Dropdown chevron */}
              <button
                type="button"
                aria-label={isOpen ? "Collapse details" : "Expand details"}
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]",
                  isOpen
                    ? "bg-[#FFB380]/15 text-[#FFB380]"
                    : "text-white/40 hover:bg-white/8 hover:text-white/60",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </div>

            {/* Expandable detail panel — source & benefit */}
            <div
              className={cn(
                "grid transition-all duration-250 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-3 ml-8 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  {/* Benefit */}
                  <section className="space-y-1.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFB380]/70">
                      Benefit
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70 break-words">
                      {item.benefit}
                    </p>
                    {item.benefitAr && (
                      <p
                        className="text-sm leading-relaxed text-white/50 break-words"
                        dir="rtl"
                        lang="ar"
                      >
                        {item.benefitAr}
                      </p>
                    )}
                  </section>

                  {/* Source */}
                  <section className="space-y-1.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFB380]/70">
                      Source
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70 break-words">
                      {item.source}
                    </p>
                    {item.sourceAr && (
                      <p
                        className="text-sm leading-relaxed text-white/50 break-words"
                        dir="rtl"
                        lang="ar"
                      >
                        {item.sourceAr}
                      </p>
                    )}
                  </section>

                  {/* Link Buttons */}
                  {(item.link || item.charityLink) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB380]/10 px-3 py-1.5 text-xs font-semibold text-[#FFB380] transition-colors hover:bg-[#FFB380]/20"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Explore Source
                        </a>
                      )}
                      {item.charityLink && (
                        <a
                          href={item.charityLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Give Charity
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
