import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import {
  excelAssignments,
  excelDormitories,
  employeePhotoMap,
} from "@/lib/excel-data";
import Link from "next/link";
import { Home, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

// 棟付き号室（例: F棟201）を解析して階数・部屋番号を返す
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

// assignments から dormitory 全体の部屋数を集計
const totalRooms = new Set(excelAssignments.map((a) => a.dormitory_id + ":" + a.room_no)).size;

export default function DormitoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home size={22} /> 寮管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {excelDormitories.length}寮・{totalRooms} 部屋・{excelAssignments.length} 入居者
        </p>
      </div>

      <div className="grid gap-4">
        {excelDormitories.map((d) => {
          const assigns = excelAssignments.filter((a) => a.dormitory_id === d.id);

          // 部屋を assignments から導出（room_no でグルーピング）
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
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {d.address}
                  </div>
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

              {/* 国籍内訳 */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {Object.entries(natCounts).map(([k, v]) => (
                  <Badge
                    key={k}
                    className="bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {k} {v}名
                  </Badge>
                ))}
              </div>

              {/* 部屋別 */}
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
                    <div
                      key={roomNo ?? "_"}
                      className={`border rounded-lg p-2 text-xs ${roomBg}`}
                    >
                      <div className="font-semibold text-slate-700">{roomNo ?? "—"}</div>
                      <div className="mt-1.5 space-y-1">
                        {residents.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <MiniAvatar
                              name={a.resident_name}
                              nationality={a.nationality}
                              photoUrl={a.photo_url ?? employeePhotoMap.get(a.employee_code ?? "")}
                              size={22}
                            />
                            {a.employee_code ? (
                              <Link
                                href={`/employees/${a.employee_code}`}
                                className="hover:text-brand-600 truncate flex-1"
                              >
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
