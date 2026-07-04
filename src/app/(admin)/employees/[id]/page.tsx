import { Badge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import {
  getAttendanceMonthlyAll,
  getCareerLevels,
  getEmployeeById,
} from "@/lib/data";
import {
  findEmployeeById,
  getEmployeeAssignments,
  getEmployeeCertifications,
  getEmployeeOneOnOneRequests,
  getEmployeeOneOnOnes,
  getEmployeeSupportTickets,
} from "@/lib/excel-data";
import { MOOD_EMOJI, REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/one-on-one-labels";
import {
  ageAt,
  alertColor,
  careerLevelBadge,
  formatDate,
  hoursToHHMM,
  tenureString,
  zodiacOf,
} from "@/lib/utils";
import {
  overtimeAlertBarColor,
  overtimeAlertColor,
  overtimeAlertLabel,
} from "@/lib/overtime";
import { Clock } from "lucide-react";
import {
  employmentTypeLabel,
  nationalityLabel,
  visaLabel,
} from "@/lib/labels";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Home,
  Phone,
  UserCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [emp, levels, attendance] = await Promise.all([
    getEmployeeById(id),
    getCareerLevels(),
    getAttendanceMonthlyAll(),
  ]);
  if (!emp) notFound();

  const excelFull = findEmployeeById(id);
  const supportTickets = getEmployeeSupportTickets(id);
  const myCerts = getEmployeeCertifications(id);
  const dormAssigns = getEmployeeAssignments(id);
  const oneOnOnes = getEmployeeOneOnOnes(id);
  const oneOnOneRequests = getEmployeeOneOnOneRequests(id);

  const myAttendance = attendance
    .filter((a) => a.employee_id === id)
    .sort((a, b) => b.month_start.localeCompare(a.month_start));
  const currentAttendance = myAttendance[0];

  const nextLv = levels.find((l) => l.level === emp.career_level + 1);
  const curLv = levels.find((l) => l.level === emp.career_level);

  // 昇格進捗
  const gateSkill = nextLv ? emp.skill_count >= nextLv.min_skill_count : true;
  const gateJlpt = nextLv
    ? rankJlpt(emp.jlpt_level) >= rankJlpt(nextLv.min_jlpt_level)
    : true;
  const gateTenure = nextLv
    ? emp.tenure_months >= nextLv.min_tenure_months
    : true;
  const passed = [gateSkill, gateJlpt, gateTenure].filter(Boolean).length;
  const completion = nextLv ? Math.round((passed / 3) * 100) : 100;

  const alertLv =
    emp.visa_days_until_expiry === null
      ? "none"
      : emp.visa_days_until_expiry < 0
      ? "expired"
      : emp.visa_days_until_expiry <= 90
      ? "critical"
      : emp.visa_days_until_expiry <= 180
      ? "warning"
      : emp.visa_days_until_expiry <= 365
      ? "notice"
      : "safe";

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={14} /> 従業員一覧へ戻る
      </Link>

      {/* ヘッダー */}
      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <Avatar employee={emp} size={112} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{emp.display_name}</h1>
            <span className="font-mono text-xs text-slate-500">
              {emp.employee_code}
            </span>
            <Badge className={careerLevelBadge(emp.career_level)}>
              Lv{emp.career_level} {emp.career_level_name_ja}
            </Badge>
          </div>
          {emp.last_name_native && (
            <div className="text-sm text-slate-500 mt-1">
              {emp.last_name_native} {emp.first_name_native}
            </div>
          )}
          <div className="mt-2 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span>{nationalityLabel(emp.nationality)}</span>
            <span>•</span>
            <span>{emp.visa_type_jp ?? employmentTypeLabel(emp.employment_type)}</span>
            <span>•</span>
            <span>{emp.organization_name ?? "—"}</span>
            <span>•</span>
            {tenureString(emp.hired_at) && <span>勤続 {tenureString(emp.hired_at)}</span>}
          </div>
        </div>
      </div>

      {/* 勤怠サマリ */}
      {currentAttendance && (
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <Clock size={18} /> 勤怠（当月）
            </h3>
            <Badge className={overtimeAlertColor(currentAttendance.alert_level)}>
              {overtimeAlertLabel(currentAttendance.alert_level)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">実労働</div>
              <div className="text-xl font-bold">
                {currentAttendance.worked_hours.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">h</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">残業</div>
              <div className="text-xl font-bold">
                {hoursToHHMM(currentAttendance.overtime_hours)}
              </div>
              <div className="mt-1 bg-slate-100 rounded-full h-2 overflow-hidden relative">
                <div className="absolute top-0 bottom-0 border-r border-orange-400" style={{ left: "45%" }} />
                <div className="absolute top-0 bottom-0 border-r border-red-700" style={{ left: "80%" }} />
                <div
                  className={`h-full ${overtimeAlertBarColor(currentAttendance.alert_level)}`}
                  style={{
                    width: `${Math.min(
                      (currentAttendance.overtime_hours / 100) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">深夜</div>
              <div className="text-xl font-bold">
                {currentAttendance.late_night_hours.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">h</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">2ヶ月平均残業</div>
              <div className="text-xl font-bold">
                {currentAttendance.overtime_hours_3m_avg != null ? hoursToHHMM(currentAttendance.overtime_hours_3m_avg) : "—"}
              </div>
              {(currentAttendance.overtime_hours_3m_avg ?? 0) >= 80 && (
                <div className="text-[10px] text-red-600 mt-0.5">過労死ライン</div>
              )}
            </div>
          </div>

          {/* 月別推移 */}
          {myAttendance.length > 1 && (
            <div className="mt-5 pt-4 border-t">
              <div className="text-xs text-slate-500 mb-2">月別残業推移</div>
              <div className="space-y-1.5">
                {myAttendance.slice(0, 3).reverse().map((m) => {
                  const pct = Math.min((m.overtime_hours / 100) * 100, 100);
                  return (
                    <div key={m.month_start} className="flex items-center gap-2 text-xs">
                      <div className="w-16 text-slate-500">
                        {m.month_start.slice(0, 7)}
                      </div>
                      <div className="flex-1 relative bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="absolute top-0 bottom-0 border-r border-orange-400" style={{ left: "45%" }} />
                        <div className="absolute top-0 bottom-0 border-r border-red-700" style={{ left: "80%" }} />
                        <div
                          className={`h-full ${overtimeAlertBarColor(m.alert_level)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-14 text-right font-mono">
                        {hoursToHHMM(m.overtime_hours)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左：基本情報 */}
        <div className="lg:col-span-1 space-y-6">
          <section className="card">
            <h3 className="font-bold flex items-center gap-2">
              <UserCircle2 size={18} /> 基本情報
            </h3>
            <dl className="mt-3 text-sm space-y-2">
              <Row label="社員番号" value={emp.employee_code} />
              <Row label="国籍" value={nationalityLabel(emp.nationality)} />
              <Row label="母語" value={langLabel(emp.native_language)} />
              <Row label="UI言語" value={langLabel(emp.preferred_language)} />
              <Row label="雇用形態" value={emp.visa_type_jp ?? employmentTypeLabel(emp.employment_type)} />
              <Row label="組織" value={emp.organization_name ?? "—"} />
              <Row label="入社日" value={formatDate(emp.hired_at)} />
              <Row label="勤続" value={tenureString(emp.hired_at)} />
              <Row label="JLPT" value={emp.jlpt_level} />
            </dl>
          </section>

          <section className="card">
            <h3 className="font-bold flex items-center gap-2">
              <Phone size={18} /> 個人情報
            </h3>
            <dl className="mt-3 text-sm space-y-2">
              {excelFull?.furigana && (
                <Row label="フリガナ" value={excelFull.furigana} />
              )}
              {excelFull?.nickname && (
                <Row label="呼名" value={excelFull.nickname} />
              )}
              <Row label="性別" value={
                excelFull?.gender === "male" ? "男" : excelFull?.gender === "female" ? "女" : "—"
              } />
              <Row label="生年月日" value={formatDate(emp.birth_date)} />
              <Row
                label="年齢"
                value={
                  emp.birth_date !== null
                    ? `${ageAt(emp.birth_date) ?? "—"}歳`
                    : "—"
                }
              />
              <Row
                label="干支"
                value={emp.birth_date ? zodiacOf(emp.birth_date) : "—"}
              />
              {excelFull?.marital_status && (
                <Row label="配偶者" value={excelFull.marital_status} />
              )}
              {emp.postal_code && (
                <Row label="〒" value={emp.postal_code} />
              )}
              <Row label="住所" value={emp.address_jp ?? "—"} />
              <Row label="TEL" value={emp.phone ?? "—"} />
              {excelFull?.support_agency && (
                <Row label="登録支援機関" value={excelFull.support_agency} />
              )}
              {excelFull?.department_head && (
                <Row label="部署長" value={excelFull.department_head} />
              )}
            </dl>
          </section>

          {/* 在留カード詳細 */}
          {excelFull?.residence_card_no && (
            <section className="card">
              <h3 className="font-bold flex items-center gap-2">
                <Home size={18} /> 在留カード情報
              </h3>
              <dl className="mt-3 text-sm space-y-2">
                <Row
                  label="カード番号"
                  value={<span className="font-mono text-xs">{excelFull.residence_card_no}</span>}
                />
                <Row
                  label="カード期限"
                  value={formatDate(excelFull.residence_card_expires_at)}
                />
                {excelFull.employment_insurance_no && (
                  <Row
                    label="雇用保険番号"
                    value={<span className="font-mono text-xs">{excelFull.employment_insurance_no}</span>}
                  />
                )}
                {excelFull.ss1_entry_date && (
                  <Row label="特定1号入国日" value={formatDate(excelFull.ss1_entry_date)} />
                )}
              </dl>
            </section>
          )}

          {/* 寮・住居 */}
          {dormAssigns.length > 0 && (
            <section className="card">
              <h3 className="font-bold flex items-center gap-2">
                <Home size={18} /> 寮・部屋
              </h3>
              <div className="mt-3 space-y-2">
                {dormAssigns.map((a) => (
                  <div key={a.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                    <div className="font-medium">{a.dormitory_name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      部屋 {a.room_no ?? "—"}
                      {a.rent_burden && ` ・ 家賃負担 ¥${a.rent_burden.toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 資格（主に日本人スタッフに適用） */}
          {myCerts.length > 0 && (
            <section className="card">
              <h3 className="font-bold">保有資格 ({myCerts.length})</h3>
              <div className="mt-3 space-y-1 text-sm">
                {myCerts.map((c) => (
                  <div key={c.id} className="flex justify-between items-center py-1 border-b last:border-0">
                    <span className="text-sm">{c.certification_name}</span>
                    <span className="text-xs text-slate-500">
                      {c.acquired_before_hire ? "入社前" : "入社後"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 1on1履歴 */}
          {(oneOnOnes.length > 0 || oneOnOneRequests.length > 0) && (
            <section className="card">
              <h3 className="font-bold flex items-center gap-2">
                1on1 面談 ({oneOnOnes.length})
              </h3>
              {oneOnOneRequests.filter((r) => r.status !== "completed" && r.status !== "cancelled").slice(0, 2).map((r) => (
                <div key={r.id} className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">📩 依頼中</span>
                    <Badge className={REQUEST_STATUS_STYLE[r.status]}>
                      {REQUEST_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-slate-700">{r.topic_label}</div>
                </div>
              ))}
              <div className="mt-3 space-y-2">
                {oneOnOnes.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    href={`/one-on-ones/${s.id}`}
                    className="block bg-slate-50 hover:bg-slate-100 rounded-lg p-2 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {formatDate(s.meeting_date)} × {s.mentor_name}
                      </span>
                      <span>{MOOD_EMOJI[s.mood]}</span>
                    </div>
                    <div className="mt-0.5 text-slate-600 truncate">{s.summary}</div>
                  </Link>
                ))}
                {oneOnOnes.length > 3 && (
                  <div className="text-xs text-slate-500 text-center">
                    他 {oneOnOnes.length - 3} 回
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 生活サポート履歴 */}
          {supportTickets.length > 0 && (
            <section className="card">
              <h3 className="font-bold">生活サポート履歴 ({supportTickets.length})</h3>
              <div className="mt-3 space-y-2">
                {supportTickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="bg-slate-50 rounded-lg p-2 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-white text-slate-700 border border-slate-200">
                        {t.kind}
                      </Badge>
                      <span className="text-slate-500">{formatDate(t.date)}</span>
                      {t.status && <span className="text-slate-400">{t.status}</span>}
                    </div>
                    {t.request_note && (
                      <div className="text-slate-700 line-clamp-2">
                        {t.request_note}
                      </div>
                    )}
                  </div>
                ))}
                {supportTickets.length > 5 && (
                  <div className="text-xs text-center text-slate-500">
                    他 {supportTickets.length - 5} 件
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 備考 */}
          {excelFull?.note && (
            <section className="card">
              <h3 className="font-bold">備考</h3>
              <div className="mt-2 text-sm whitespace-pre-wrap text-slate-700">
                {excelFull.note}
              </div>
            </section>
          )}

          {/* 退職情報 */}
          {excelFull?.retired && (
            <section className="card bg-slate-100 border-slate-300">
              <h3 className="font-bold text-slate-600">退職済</h3>
              <dl className="mt-2 text-sm space-y-1">
                <Row label="退職日" value={formatDate(excelFull.retired_at)} />
                {excelFull.return_cost && (
                  <Row label="帰国費用" value={`¥${excelFull.return_cost.toLocaleString()}`} />
                )}
              </dl>
            </section>
          )}
        </div>

        {/* 中：在留資格 */}
        <div className="lg:col-span-1 space-y-6">
          <section className="card">
            <h3 className="font-bold flex items-center gap-2">
              <Home size={18} /> 在留資格
            </h3>
            {emp.current_visa_status && emp.current_visa_status !== "japanese" ? (
              <div className="mt-3 space-y-3">
                <Row
                  label="現行資格"
                  value={emp.visa_type_jp ?? visaLabel(emp.current_visa_status)}
                />
                <Row
                  label="期限"
                  value={
                    emp.visa_expires_at ? (
                      <span className={`badge ${alertColor(alertLv)}`}>
                        {formatDate(emp.visa_expires_at)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row
                  label="残日数"
                  value={
                    emp.visa_days_until_expiry === null
                      ? "—"
                      : emp.visa_days_until_expiry < 0
                      ? `${Math.abs(emp.visa_days_until_expiry)}日経過`
                      : `あと${emp.visa_days_until_expiry}日`
                  }
                />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">日本人（対象外）</div>
            )}
          </section>

          <section className="card">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar size={18} /> 次の移行計画
            </h3>
            {emp.current_visa_status === "technical_intern_1" && (
              <div className="mt-3 text-sm space-y-2">
                <div className="text-slate-600">
                  技能実習2号への移行を準備中
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                  必要: 技能検定基礎級 / 雇用契約の更新
                </div>
              </div>
            )}
            {emp.current_visa_status === "technical_intern_2" && (
              <div className="mt-3 text-sm space-y-2">
                <div className="text-slate-600">
                  特定技能1号への移行を検討中
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800">
                  <div className="font-semibold">残留のメリット</div>
                  <div className="mt-1">
                    5年継続で推定1,500万円 / 永住到達で3,200万円
                  </div>
                </div>
              </div>
            )}
            {emp.current_visa_status === "specified_skill_1" && (
              <div className="mt-3 text-sm space-y-2">
                <div className="text-slate-600">特定技能2号への昇格候補</div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800">
                  <div className="font-semibold">家族帯同・永住ルート</div>
                  <div className="mt-1">配偶者・子の帯同可能に</div>
                </div>
              </div>
            )}
            {(!emp.current_visa_status ||
              emp.current_visa_status === "japanese") && (
              <div className="mt-3 text-sm text-slate-500">—</div>
            )}
          </section>
        </div>

        {/* 右：キャリア進捗 */}
        <div className="lg:col-span-1 space-y-6">
          <section className="card">
            <h3 className="font-bold flex items-center gap-2">
              <GraduationCap size={18} /> キャリア進捗
            </h3>

            <div className="mt-4">
              <div className="text-xs text-slate-500">現在</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={careerLevelBadge(emp.career_level)}>
                  Lv{emp.career_level}
                </Badge>
                <span className="font-medium">{curLv?.name_ja}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {curLv?.description_ja}
              </div>
            </div>

            {nextLv ? (
              <>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      次の Lv{nextLv.level} {nextLv.name_ja} まで
                    </span>
                    <span className="font-bold text-brand-600">
                      {completion}%
                    </span>
                  </div>
                  <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  <GateRow
                    ok={gateSkill}
                    label="必要スキル数"
                    current={`${emp.skill_count}/${nextLv.min_skill_count}`}
                  />
                  <GateRow
                    ok={gateJlpt}
                    label="日本語"
                    current={`${emp.jlpt_level} / 必要${nextLv.min_jlpt_level}`}
                  />
                  <GateRow
                    ok={gateTenure}
                    label="勤続月数"
                    current={`${emp.tenure_months} / ${nextLv.min_tenure_months}ヶ月`}
                  />
                </ul>

                <div className="mt-4 text-xs bg-brand-50 border border-brand-100 rounded-lg p-3 text-brand-900">
                  昇格で時給 +{nextLv.hourly_wage_delta}円
                </div>
              </>
            ) : (
              <div className="mt-4 text-sm text-slate-500">
                最高位に到達しています
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500 text-xs">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function GateRow({
  ok,
  label,
  current,
}: {
  ok: boolean;
  label: string;
  current: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span
          className={
            ok
              ? "w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center"
              : "w-4 h-4 rounded-full border border-slate-300"
          }
        >
          {ok ? "✓" : ""}
        </span>
        {label}
      </span>
      <span className={ok ? "text-emerald-700 font-medium" : "text-slate-500"}>
        {current}
      </span>
    </li>
  );
}

function langLabel(l: string): string {
  const m: Record<string, string> = {
    ja: "日本語",
    id: "インドネシア語",
    vi: "ベトナム語",
    en: "英語",
  };
  return m[l] ?? l;
}

function rankJlpt(l: string): number {
  const m: Record<string, number> = {
    none: 0,
    N5: 1,
    N4: 2,
    N3: 3,
    N2: 4,
    N1: 5,
  };
  return m[l] ?? 0;
}
