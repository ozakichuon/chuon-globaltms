import { Badge } from "@/components/Badge";
import { getCareerLevels, getEmployees } from "@/lib/data";
import { careerLevelBadge, nationalityFlag } from "@/lib/utils";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const [levels, employees] = await Promise.all([
    getCareerLevels(),
    getEmployees(),
  ]);
  const active = employees.filter((e) => e.status === "active");

  // 国籍別の Lv分布
  const byNat: Record<string, Record<number, number>> = {};
  active.forEach((e) => {
    byNat[e.nationality] ??= {};
    byNat[e.nationality][e.career_level] =
      (byNat[e.nationality][e.career_level] ?? 0) + 1;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp size={22} /> キャリアラダー
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          作業者→管理者への道筋。各レベルの要件と現在の人員分布を確認。
        </p>
      </div>

      {/* ラダー */}
      <div className="space-y-3">
        {levels
          .slice()
          .reverse()
          .map((lv) => {
            const count = active.filter((e) => e.career_level === lv.level).length;
            const foreignCount = active.filter(
              (e) => e.career_level === lv.level && e.nationality !== "JP"
            ).length;

            return (
              <div
                key={lv.level}
                className={`card relative ${
                  lv.level >= 5 && foreignCount === 0
                    ? "border-amber-200 bg-amber-50/40"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Badge className={`${careerLevelBadge(lv.level)} text-base py-1 px-3`}>
                      Lv{lv.level}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-bold text-lg">{lv.name_ja}</h3>
                        <div className="text-xs text-slate-500">
                          🇮🇩 {lv.name_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">在籍</div>
                        <div className="text-xl font-bold">
                          {count}
                          <span className="text-xs font-normal ml-1">名</span>
                          <span className="text-xs text-slate-500 ml-2">
                            外国人 {foreignCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mt-2">
                      {lv.description_ja}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge className="bg-slate-100 text-slate-700">
                        スキル {lv.min_skill_count}+
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        日本語 {lv.min_jlpt_level}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        勤続 {lv.min_tenure_months}ヶ月+
                      </Badge>
                      {lv.min_mentor_count > 0 && (
                        <Badge className="bg-slate-100 text-slate-700">
                          メンター {lv.min_mentor_count}名+
                        </Badge>
                      )}
                      <Badge className="bg-brand-50 text-brand-700 border border-brand-100">
                        時給 +{lv.hourly_wage_delta}円
                      </Badge>
                    </div>

                    {lv.level >= 5 && foreignCount === 0 && (
                      <div className="mt-3 text-xs text-amber-700 bg-amber-100/50 rounded-lg p-2">
                        ⚠️ このレベルに外国人の登用実績なし。
                        キャリアの天井を取り払うため候補者育成を推奨。
                      </div>
                    )}
                  </div>
                </div>

                {/* 在籍している社員 */}
                {count > 0 && (
                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                    {active
                      .filter((e) => e.career_level === lv.level)
                      .map((e) => (
                        <Link
                          key={e.id}
                          href={`/employees/${e.id}`}
                          className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors"
                        >
                          <span>{nationalityFlag(e.nationality)}</span>
                          <span className="font-medium">{e.display_name}</span>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* 国籍別の分布（ヒートマップ風） */}
      <div className="card">
        <h3 className="font-bold">国籍別 キャリアレベル分布</h3>
        <p className="text-xs text-slate-500 mt-1">
          外国人が高レベルに到達しているかを一目で把握
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="text-sm min-w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-xs text-slate-500">国籍</th>
                {levels.map((lv) => (
                  <th key={lv.level} className="py-2 px-3 text-center text-xs">
                    Lv{lv.level}
                  </th>
                ))}
                <th className="py-2 px-3 text-center text-xs">合計</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byNat).map(([nat, lvMap]) => {
                const total = Object.values(lvMap).reduce((s, n) => s + n, 0);
                return (
                  <tr key={nat} className="border-t">
                    <td className="py-2 px-3">
                      {nationalityFlag(nat)} {nat}
                    </td>
                    {levels.map((lv) => {
                      const count = lvMap[lv.level] ?? 0;
                      const intensity = Math.min((count / 5) * 100, 100);
                      return (
                        <td
                          key={lv.level}
                          className="py-2 px-3 text-center text-xs"
                          style={{
                            background:
                              count > 0
                                ? `rgba(14, 165, 233, ${0.1 + intensity / 200})`
                                : undefined,
                          }}
                        >
                          {count > 0 ? count : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center font-bold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
