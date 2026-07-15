"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import Link from "next/link";
import { MapPin } from "lucide-react";

function parseFloorUnit(roomNo: string | null) {
  const m = roomNo?.match(/棟(\d)(\d{2})$/);
  if (m) return { floor: parseInt(m[1]), unit: parseInt(m[2]) };
  return null;
}

function sortRooms(a: string | null, b: string | null) {
  const pa = parseFloorUnit(a);
  const pb = parseFloorUnit(b);
  if (pa && pb) {
    if (pa.floor !== pb.floor) return pb.floor - pa.floor;
    return pa.unit - pb.unit;
  }
  const na = parseInt(a ?? "", 10);
  const nb = parseInt(b ?? "", 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  if (!isNaN(na)) return -1;
  if (!isNaN(nb)) return 1;
  return (a ?? "").localeCompare(b ?? "");
}

const GROUPS: { label: string; keywords: string[] }[] = [
  { label: "小栗工場", keywords: ["アトム"] },
  { label: "津吉工場", keywords: ["ビレッジハウス", "コーポ津吉", "東温市牛渕", "EARLS", "シティハイム", "中野町"] },
  { label: "西条工場", keywords: ["HAPPINESS"] },
];

type Dorm = { id: string; name: string; address?: string | null };
type Assignment = {
  id: string; dormitory_id: string; room_no: string | null;
  resident_name: string; nationality?: string | null; gender?: string | null;
  employee_code?: string | null; photo_url?: string | null;
};

interface Props {
  dormitories: Dorm[];
  assignments: Assignment[];
  photoMap: Map<string, string>;
}

export default function DormitoriesClient({ dormitories, assignments, photoMap }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const group = GROUPS[activeTab];
  const filteredDorms = dormitories.filter((d) =>
    group.keywords.some((kw) => d.name.includes(kw))
  );

  const totalResidents = filteredDorms.reduce(
    (sum, d) => sum + assignments.filter((a) => a.dormitory_id === d.id).length, 0
  );

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              i === activeTab
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {g.label}
            <span className="ml-1.5 text-xs text-slate-400">
              {assignments.filter((a) =>
                filteredDorms.find((d) => d.id === a.dormitory_id) ||
                dormitories
                  .filter((d) => GROUPS[i].keywords.some((kw) => d.name.includes(kw)))
                  .some((d) => d.id === a.dormitory_id)
              ).length}名
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mb-4">
        {filteredDorms.length}寮・{totalResidents}入居者
      </p>

      <div className="grid gap-4">
        {filteredDorms.map((d) => {
          const assigns = assignments.filter((a) => a.dormitory_id === d.id);
          const roomNos = [...new Set(assigns.map((a) => a.room_no))].sort(sortRooms);
          const hasBldg = roomNos.some((rn) => parseFloorUnit(rn));
          const natCounts: Record<string, number> = {};
          assigns.forEach((a) => {
            const k = a.nationality ?? "不明";
            natCounts[k] = (natCounts[k] ?? 0) + 1;
          });

          return (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-bold text-lg">{d.name}</h2>
                  {d.address && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} /> {d.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">部屋</div>
                    <div className="font-bold">{roomNos.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">入居</div>
                    <div className="font-bold">{assigns.length}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {Object.entries(natCounts).map(([k, v]) => (
                  <Badge key={k} className="bg-slate-100 text-slate-700 border border-slate-200">
                    {k} {v}名
                  </Badge>
                ))}
              </div>

              <div className={`mt-4 grid gap-2 ${hasBldg ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
                {roomNos.map((roomNo) => {
                  const residents = assigns.filter((a) => a.room_no === roomNo);
                  const genders = new Set(residents.map((a) => a.gender));
                  const roomBg =
                    genders.size > 1
                      ? "bg-yellow-50 border-yellow-200"
                      : genders.has("男")
                      ? "bg-blue-50 border-blue-200"
                      : genders.has("女")
                      ? "bg-rose-50 border-rose-200"
                      : "border-slate-200";
                  return (
                    <div key={roomNo ?? "_"} className={`border rounded-lg p-2 text-xs ${roomBg}`}>
                      <div className="font-semibold text-slate-700">{roomNo ?? "—"}</div>
                      <div className="mt-1.5 space-y-1">
                        {residents.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <MiniAvatar
                              name={a.resident_name}
                              nationality={a.nationality}
                              photoUrl={a.photo_url ?? photoMap.get(a.employee_code ?? "")}
                              size={22}
                            />
                            {a.employee_code ? (
                              <Link href={`/employees/${a.employee_code}`} className="hover:text-brand-600 truncate flex-1">
                                {a.resident_name}
                              </Link>
                            ) : (
                              <span className="truncate flex-1">{a.resident_name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
