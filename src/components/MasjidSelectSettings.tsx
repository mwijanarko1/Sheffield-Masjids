"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { GlassSelect } from "@/components/ui/glass-select";
import {
  useMasjidlyTheme,
  type MasjidlyThemeMode,
} from "@/contexts/MasjidlyThemeContext";
import {
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
  type MasjidlyTimeTheme,
} from "@/lib/masjidly-theme";

interface MasjidSelectSettingsProps {
  mosques: Mosque[];
}

const SKY_OPTIONS: { id: MasjidlyTimeTheme; name: string }[] = [
  { id: "fajr", name: "Fajr" },
  { id: "sunrise", name: "Sunrise" },
  { id: "dhuhr", name: "Dhuhr" },
  { id: "asr", name: "Asr" },
  { id: "maghrib", name: "Maghrib" },
  { id: "isha", name: "Isha" },
];

const CONTACT_EMAIL = "mikhailspeaks@gmail.com";

function SectionCaption({
  title,
  color,
}: {
  title: string;
  color: string;
}) {
  return (
    <h2
      className="mb-2 text-[13px] font-semibold uppercase tracking-[0.04em]"
      style={{ color, opacity: 0.52 }}
    >
      {title}
    </h2>
  );
}

function SettingsCard({
  lightFg,
  children,
}: {
  lightFg: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden"
      data-foreground={lightFg ? "light" : "dark"}
    >
      {children}
    </div>
  );
}

function SettingsToggle({
  title,
  checked,
  onChange,
  fg,
  fgMuted,
}: {
  title: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  fg: string;
  fgMuted: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3">
      <span className="text-[17px] font-medium" style={{ color: fg }}>
        {title}
      </span>
      <button
        type="button"
        role="switch"
        aria-label={title}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
        style={{
          background: checked ? "#47A6FF" : fgMuted,
          opacity: checked ? 1 : 0.35,
        }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
          style={{ left: checked ? "1.35rem" : "0.15rem" }}
        />
      </button>
    </label>
  );
}

function RowLink({
  href,
  label,
  fg,
  external,
}: {
  href: string;
  label: string;
  fg: string;
  external?: boolean;
}) {
  const className =
    "group flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-[17px] font-medium transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60";
  const inner = (
    <>
      <span className="inline-flex items-center gap-2" style={{ color: fg }}>
        {label}
        {external ? (
          <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
        ) : null}
      </span>
      <svg
        className="h-4 w-4 opacity-40 group-hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </>
  );
  if (external) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function Divider({ fg }: { fg: string }) {
  return (
    <div className="mx-4 h-px" style={{ background: fg, opacity: 0.18 }} />
  );
}

function ContactAction({
  title,
  href,
  fg,
  lightFg,
}: {
  title: string;
  href: string;
  fg: string;
  lightFg: boolean;
}) {
  return (
    <a
      href={href}
      className="block rounded-[14px] px-4 py-3.5 text-center text-base font-semibold transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
      style={{
        color: lightFg ? "#fff" : fg,
        background: lightFg ? "rgba(255,255,255,0.22)" : "rgba(29,36,51,0.12)",
      }}
    >
      {title}
    </a>
  );
}

/**
 * Masjidly SettingsView parity for the web app surface we support:
 * mosque selection, display prefs, appearance, contact, legal.
 */
export default function MasjidSelectSettings({ mosques }: MasjidSelectSettingsProps) {
  const {
    selectedMosque,
    setSelectedMosque,
    isHydrated,
    countryOptions,
    selectedCountryCode,
    setSelectedCountryCode,
    cityOptions,
    selectedCitySlug,
    setSelectedCitySlug,
    mosquesInSelectedCity,
  } = usePersistedMosque(mosques);

  const {
    theme,
    themeMode,
    setThemeMode,
    fixedTheme,
    setFixedTheme,
    uses24HourTime,
    setUses24HourTime,
    showIqamahTime,
    setShowIqamahTime,
  } = useMasjidlyTheme();

  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;

  return (
    <div
      className="mx-auto w-full max-w-xl px-5 pb-10 pt-2 sm:px-6 sm:pb-14"
      style={{ color: fg }}
    >
      <div className="mb-6 flex items-center gap-4">
        <h1 className="min-w-0 flex-1 text-[34px] font-bold leading-tight tracking-tight">
          Settings
        </h1>
        <Link
          href="/"
          aria-label="Close settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          style={{ background: `${fg}1A`, color: fg }}
        >
          <X size={16} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <SectionCaption title="Mosque" color={fg} />
          <SettingsCard lightFg={lightFg}>
            <div className="space-y-1 px-3 py-2">
              <div className="px-1 py-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: fgMuted }}>
                  Country
                </p>
                <GlassSelect
                  options={countryOptions}
                  value={isHydrated ? selectedCountryCode : ""}
                  onChange={setSelectedCountryCode}
                  ariaLabel="Select country"
                  disabled={!isHydrated}
                  placeholder={isHydrated ? "Select country" : "Loading…"}
                />
              </div>
              <Divider fg={fg} />
              {cityOptions.length > 0 ? (
                <>
                  <div className="px-1 py-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: fgMuted }}>
                      City
                    </p>
                    <GlassSelect
                      options={cityOptions}
                      value={isHydrated ? selectedCitySlug : ""}
                      onChange={setSelectedCitySlug}
                      ariaLabel="Select city"
                      disabled={!isHydrated}
                      placeholder={isHydrated ? "Select city" : "Loading…"}
                    />
                  </div>
                  <Divider fg={fg} />
                </>
              ) : null}
              <div className="px-1 py-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: fgMuted }}>
                  Mosque
                </p>
                <GlassSelect
                  options={mosquesInSelectedCity}
                  value={isHydrated ? selectedMosque?.id ?? "" : ""}
                  onChange={(id) => {
                    const selected = mosquesInSelectedCity.find((m) => m.id === id);
                    if (selected) setSelectedMosque(selected);
                  }}
                  ariaLabel="Select mosque"
                  disabled={!isHydrated}
                  placeholder={isHydrated ? "Select mosque" : "Loading…"}
                />
              </div>
            </div>
          </SettingsCard>
        </section>

        <section>
          <SectionCaption title="Display" color={fg} />
          <SettingsCard lightFg={lightFg}>
            <SettingsToggle
              title="24-hour time"
              checked={uses24HourTime}
              onChange={setUses24HourTime}
              fg={fg}
              fgMuted={fgMuted}
            />
            <Divider fg={fg} />
            <SettingsToggle
              title="Show iqamah time"
              checked={showIqamahTime}
              onChange={setShowIqamahTime}
              fg={fg}
              fgMuted={fgMuted}
            />
          </SettingsCard>
        </section>

        <section>
          <SectionCaption title="Appearance" color={fg} />
          <SettingsCard lightFg={lightFg}>
            <div className="px-4 py-3">
              <p className="mb-2 text-[17px] font-medium" style={{ color: fg }}>
                Sky theme
              </p>
              <div className="inline-flex rounded-full p-1" style={{ background: `${fg}14` }}>
                {(["dynamic", "fixed"] satisfies MasjidlyThemeMode[]).map((mode) => {
                  const active = themeMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setThemeMode(mode)}
                      className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
                      style={{
                        background: active ? "#47A6FF" : "transparent",
                        color: active ? "#fff" : fg,
                      }}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
            {themeMode === "fixed" ? (
              <>
                <Divider fg={fg} />
                <div className="px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: fgMuted }}>
                    Fixed prayer sky
                  </p>
                  <GlassSelect
                    options={SKY_OPTIONS}
                    value={fixedTheme}
                    onChange={(id) => {
                      const option = SKY_OPTIONS.find((sky) => sky.id === id);
                      if (option) setFixedTheme(option.id);
                    }}
                    ariaLabel="Select fixed sky theme"
                  />
                </div>
              </>
            ) : null}
          </SettingsCard>
        </section>

        <section>
          <SectionCaption title="Contact" color={fg} />
          <div className="flex flex-col gap-2.5">
            <ContactAction
              title="Send feedback"
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Sheffield Masjids feedback")}`}
              fg={fg}
              lightFg={lightFg}
            />
            <ContactAction
              title="Report prayer times"
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Prayer times correction")}`}
              fg={fg}
              lightFg={lightFg}
            />
            <ContactAction
              title="Request a masjid"
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Request a masjid")}`}
              fg={fg}
              lightFg={lightFg}
            />
          </div>
        </section>

        <section>
          <SectionCaption title="Legal & Privacy" color={fg} />
          <SettingsCard lightFg={lightFg}>
            <nav>
              <RowLink href="/privacy" label="Privacy Policy" fg={fg} />
              <Divider fg={fg} />
              <RowLink href="/terms" label="Terms & Conditions" fg={fg} />
              <Divider fg={fg} />
              <RowLink href="/about" label="About" fg={fg} />
              <Divider fg={fg} />
              <RowLink href="/contact" label="Contact page" fg={fg} />
              <Divider fg={fg} />
              <RowLink
                href="/masjidly"
                label="Masjidly app"
                fg={fg}
              />
            </nav>
          </SettingsCard>
        </section>
      </div>

      <div className="mt-12 text-center">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: fg, opacity: 0.35 }}
        >
          Built by{" "}
          <a
            href="https://mikhailwijanarko.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: fg, opacity: 0.7 }}
          >
            @mikhailbuilds
          </a>
        </p>
      </div>
    </div>
  );
}
