import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import { excelPipeline } from "@/lib/excel-data";
import { formatDate } from "@/lib/utils";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

function natCode(jp: string | null | undefined): string {
  const map: Record<string, string> = {
    ベトナム: "VN",
    インドネシア: "ID",
    フィリピン: "PH",
  };
  return jp ? map[jp] ?? "OTHER" : "OTHER";
}

export default function RecruitmentPage() {
  const pipeline = excelPipeline;
  const byNat: Record<string, number> = {};
  pipeline.forEach((p) => {
    const k = p.nationality ?? "未定";
    byNat[k] = (byNat[k] ?? 0) + 1;
  });
  const byAgency: Record<string, number> = {};
  pipeline.forEach((p) => {
    const k = p.support_agency ?? "未定";
    byAgency[k] = (byAgency[k] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus size={22} /> 採用パイプライン
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          入社予定者 {pipeline.length} 名
        </p>
      </div>

      {/* 内訳 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">国籍内訳</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(byNat).map(([k, v]) => (
              <Badge key={k} className="bg-slate-100 text-slate-700 border border-slate-200">
                {k} {v}
              </Badge>
            ))}
          </div>
        </div>
        <div className="card col-span-3">
          <div className="text-xs text-slate-500">登録支援機関内訳</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(byAgency).map(([k, v]) => (
              <Badge key={k} className="bg-slate-100 text-slate-700 border border-slate-200">
                {k} {v}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* リスト */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-3 px-3">勤務地</th>
                <th className="py-3 px-3">国籍</th>
                <th className="py-3 px-3">氏名</th>
                <th className="py-3 px-3">呼名</th>
                <th className="py-3 px-3">性別</th>
                <th className="py-3 px-3">生年月日</th>
                <th className="py-3 px-3">配偶者</th>
                <th className="py-3 px-3">支援機関</th>
                <th className="py-3 px-3">入社予定</th>
                <th className="py-3 px-3">在留</th>
                <th className="py-3 px-3">備考</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2 px-3 text-xs">{p.workplace ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{p.nationality ?? "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <MiniAvatar
                        name={p.furigana ?? p.display_name}
                        nationality={natCode(p.nationality)}
                        size={32}
                      />
                      <div>
                        <div className="font-medium">{p.display_name}</div>
                        {p.furigana && (
                          <div className="text-xs text-slate-500">{p.furigana}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-xs">{p.nickname ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{p.gender ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{formatDate(p.birth_date)}</td>
                  <td className="py-2 px-3 text-xs">{p.marital_status ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{p.support_agency ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{p.expected_hire_date_raw ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{p.visa_type_jp ?? "—"}</td>
                  <td className="py-2 px-3 text-xs text-slate-600 max-w-xs truncate">
                    {p.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
