"use client";

import Link from "next/link";
import type { VerdleDashboardData } from "@/actions/get-verdle-dashboard";
import { VerdleDashboard } from "@/components/dashboard/verdle-dashboard";
import { Button } from "@/components/ui/button";

export function VerdleDashboardPage(props: { data: VerdleDashboardData }) {
  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="font-semibold text-xl">crackmyword</div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/daily">Daily</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/profile">Profile</Link>
          </Button>
        </div>
      </div>

      <VerdleDashboard
        data={props.data}
        onUpgradeClick={() => (window.location.href = "/profile")}
      />
    </div>
  );
}

