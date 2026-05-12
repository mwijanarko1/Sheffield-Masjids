import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Solid white feature card used on the Masjidly landing page.
 * Clean light surface with dark text per Masjidly DESIGN.md.
 */
export default function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.2)] hover:scale-[1.01]">
      <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-[#47A6FF]/10 p-3">
        <Icon size={24} strokeWidth={1.8} className="text-[#111111]" />
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-[#111111] mb-2">
        {title}
      </h3>

      <p className="text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}
