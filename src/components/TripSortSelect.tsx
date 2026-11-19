"use client";

import { useRouter, useSearchParams } from "next/navigation";

export const TRIP_SORT_OPTIONS = [
  { value: "from_desc", label: "出発：降順" },
  { value: "from_asc", label: "出発：昇順" },
  { value: "to_desc", label: "帰任：降順" },
  { value: "to_asc", label: "帰任：昇順" },
] as const;

export function TripSortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const qs = new URLSearchParams(params.toString());
        qs.set("tripSort", e.target.value);
        router.push(`/departures?${qs.toString()}`);
      }}
      className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs bg-white"
    >
      {TRIP_SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
