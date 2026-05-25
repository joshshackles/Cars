"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOME_PATHS = new Set(["/", "/dashboard"]);

export function HistoryBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (HOME_PATHS.has(pathname)) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
      className="hidden min-h-11 gap-2 border border-white/25 bg-white/10 text-white hover:bg-white hover:text-cars-navy md:inline-flex"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back
    </Button>
  );
}
