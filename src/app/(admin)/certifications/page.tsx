import { Badge } from "@/components/Badge";
import { MiniAvatar } from "@/components/Avatar";
import { excelCertifications, excelEmployeeCerts, excelManagerCerts } from "@/lib/excel-data";
import { formatDate } from "@/lib/utils";
import { Award, ShieldCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CertificationsPage() {
  // 資格別保有者数
  const byCert: Record<string, number> = {};
  excelEmployeeCerts.forEach((c) => {
    byCert[c.certification_name] = (byCert[c.certification_name] ?? 0) + 1;
  });

  // 人別保有数（日本人スタッフ中心）
  const byPerson: Record<string, { count: number; lastCert: string | null }> = {};
  excelEmployeeCerts.forEach((c) => {
    const p = byPerson[c.employee_name] ?? { count: 0, lastCert: null };
    p.count++;
    if (c.acquired_at && (!p.lastCert || c.acquired_at > p.lastCert)) {
      p.lastCert = c.acquired_at;
    }
    byPerson[c.employee_name] = p;
  });

  const beforeHire = excelEmployeeCerts.filter((c) => c.acquired_before_hire).length;
  const afterHire = excelEmployeeCerts.filter((c) => !c.acquired_before_hire).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award size={22} /> 資格管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          全 {excelEmployeeCerts.length} 件の資格取得・{excelCertifications.length} 種類の資格
          （入社前 {beforeHire} 件・入社後 {afterHire} 件）
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 資格マスタ + 保有者数 */}
        <section className="card">
          <h3 className="font-bold flex items-center gap-2">
            <Award size={18} /> 資格別保有者数
          </h3>
          <div className="mt-3 max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2">資格</th>
                  <th className="py-2 w-20 text-right">保有者</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCert)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, cnt]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="py-2 text-sm">{name}</td>
                      <td className="py-2 text-right font-bold">{cnt}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 人別保有数ランキング */}
        <section className="card">
          <h3 className="font-bold flex items-center gap-2">
            <Users size={18} /> 資格保有数ランキング
          </h3>
          <div className="mt-3 max-h-[600px] overflow-y-auto space-y-1">
            {Object.entries(byPerson)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 30)
              .map(([name, info], i) => (
                <div
                  key={name}
                  className="flex items-center gap-2 py-1.5 border-b last:border-0"
                >
                  <span className="w-6 text-xs text-slate-400 font-mono">
                    #{i + 1}
                  </span>
                  <MiniAvatar name={name} size={26} />
                  <span className="flex-1 text-sm truncate">{name}</span>
                  <span className="text-xs text-slate-500 hidden md:inline">
                    最新 {formatDate(info.lastCert)}
                  </span>
                  <Badge className="bg-brand-50 text-brand-700 border border-brand-100">
                    {info.count}件
                  </Badge>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* 日本人指導員の資格管理 */}
      <section className="card">
        <h3 className="font-bold flex items-center gap-2">
          <ShieldCheck size={18} /> 日本人指導員資格（技能実習制度）
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          技能実習責任者・指導員・生活指導員の資格取得/更新状況。3年ごとに更新が必要。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-2 px-2">氏名</th>
                <th className="py-2 px-2">資格名</th>
                <th className="py-2 px-2">取得日</th>
                <th className="py-2 px-2">更新期限</th>
              </tr>
            </thead>
            <tbody>
              {excelManagerCerts.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <MiniAvatar name={m.name} size={26} />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">{m.certification_name}</td>
                  <td className="py-2 px-2 text-xs">{m.acquired_raw ?? "—"}</td>
                  <td className="py-2 px-2 text-xs">{m.expires_raw ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
