import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New Domain | Sheffield Masjids",
  description: "Sheffield Masjids has moved to a new domain.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewDomainPage() {
  const newDomain = "https://www.sheffieldmasjids.com";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md w-full space-y-8 p-8 rounded-2xl border border-border bg-card shadow-sm">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            New Domain
          </h1>
          <p className="text-lg text-muted-foreground">
            Sheffield Masjids has moved to a more permanent home.
          </p>
        </div>

        <div className="py-6">
          <div className="p-4 bg-muted rounded-lg border border-border mb-6">
            <code className="text-xl font-medium text-foreground break-all">
              {newDomain.replace("https://", "")}
            </code>
          </div>

          <Button asChild size="lg" className="w-full gap-2 text-lg h-14">
            <a href={newDomain}>
              Go to New Site
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                />
              </svg>
            </a>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Please update your bookmarks to the new address.
        </p>
      </div>
    </div>
  );
}
