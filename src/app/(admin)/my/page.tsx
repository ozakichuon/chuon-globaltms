import { Badge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { getCareerLevels, getEmployeeById, getEmployees } from "@/lib/data";
import { getEmployeeOneOnOneRequests, getEmployeeOneOnOnes } from "@/lib/excel-data";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/one-on-one-labels";
import { careerLevelBadge, formatDate, tenureString } from "@/lib/utils";
import { visaLabel } from "@/lib/labels";
import Link from "next/link";
import { Smile, Meh, Frown, AlertCircle, Globe2, MessageCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; id?: string }>;
}) {
  const params = await searchParams;
  const locale = (params.lang ?? "id") as "ja" | "id" | "vi";

  // デモ用: id パラメータ指定なら優先、なければ最初のインドネシア人特定技能を使う
  const all = await getEmployees();
  const defaultEmp =
    all.find(
      (e) =>
        e.status === "active" &&
        e.nationality === "ID" &&
        e.employment_type === "specified_skill"
    ) ??
    all.find((e) => e.status === "active" && e.nationality === "ID") ??
    all.find((e) => e.status === "active");
  const empId = params.id ?? defaultEmp?.id ?? "";

  const [emp, levels] = await Promise.all([
    getEmployeeById(empId),
    getCareerLevels(),
  ]);
  if (!emp) {
    return <div className="p-8">従業員が見つかりません</div>;
  }

  // 自分の1on1履歴・依頼履歴
  const mySessions = getEmployeeOneOnOnes(empId);
  const myRequests = getEmployeeOneOnOneRequests(empId);
  const activeRequest = myRequests.find(
    (r) => r.status === "pending" || r.status === "accepted" || r.status === "scheduled"
  );

  const curLv = levels.find((l) => l.level === emp.career_level);
  const nextLv = levels.find((l) => l.level === emp.career_level + 1);
  const gateSkill = nextLv ? emp.skill_count >= nextLv.min_skill_count : true;
  const gateJlpt = nextLv
    ? rankJlpt(emp.jlpt_level) >= rankJlpt(nextLv.min_jlpt_level)
    : true;
  const gateTenure = nextLv
    ? emp.tenure_months >= nextLv.min_tenure_months
    : true;
  const passed = [gateSkill, gateJlpt, gateTenure].filter(Boolean).length;
  const completion = nextLv ? Math.round((passed / 3) * 100) : 100;

  const L = texts[locale];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* 言語切替 */}
      <div className="flex items-center gap-2 justify-end text-xs">
        <Globe2 size={14} />
        <LangLink q={params} lang="ja">日本語</LangLink>
        <LangLink q={params} lang="id">Bahasa</LangLink>
        <LangLink q={params} lang="vi">Tiếng Việt</LangLink>
      </div>

      {/* 挨拶 */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Avatar employee={emp} size={72} />
          <div>
            <div className="text-xs text-slate-500">
              {L.hello}{" "}
              {new Date().toLocaleDateString(
                locale === "ja" ? "ja-JP" : locale === "id" ? "id-ID" : "vi-VN",
                { weekday: "long", month: "long", day: "numeric" }
              )}
            </div>
            <h1 className="text-xl font-bold mt-1">
              {emp.last_name_native
                ? `${emp.last_name_native} ${emp.first_name_native}`
                : emp.display_name}
            </h1>
            <div className="text-sm text-slate-600 mt-0.5">
              <Badge className={careerLevelBadge(emp.career_level)}>
                Lv{emp.career_level} {locale === "id" ? curLv?.name_id : curLv?.name_ja}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 本日のコンディション */}
      <div className="card">
        <h2 className="font-bold">{L.conditionQuestion}</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <ConditionBtn icon={<Smile />} label={L.great} color="bg-emerald-50" />
          <ConditionBtn icon={<Meh />} label={L.ok} color="bg-slate-50" />
          <ConditionBtn icon={<Frown />} label={L.tired} color="bg-amber-50" />
          <ConditionBtn icon={<AlertCircle />} label={L.bad} color="bg-red-50" />
        </div>
      </div>

      {/* 1on1 面談依頼ボタン（現在進行中ならステータス表示） */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <MessageCircle size={18} /> {L.oneOnOne.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{L.oneOnOne.subtitle}</p>
          </div>
        </div>
        {activeRequest ? (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <Badge className={REQUEST_STATUS_STYLE[activeRequest.status]}>
                {REQUEST_STATUS_LABEL[activeRequest.status]}
              </Badge>
              <span className="text-xs text-slate-500">
                {formatDate(activeRequest.requested_at.slice(0, 10))} 申請
              </span>
            </div>
            <div className="mt-2 text-sm font-medium">
              {activeRequest.topic_label}
            </div>
            {activeRequest.scheduled_at && (
              <div className="mt-2 text-sm text-amber-700 flex items-center gap-1">
                <Clock size={14} /> {L.oneOnOne.scheduledAt}: <b>{formatDate(activeRequest.scheduled_at)}</b>
                {activeRequest.assigned_mentor && ` / ${activeRequest.assigned_mentor}`}
              </div>
            )}
          </div>
        ) : (
          <button className="mt-3 w-full bg-gradient-to-r from-brand-500 to-brand-700 text-white rounded-xl py-3 font-bold text-base hover:scale-[1.02] transition-transform">
            💬 {L.oneOnOne.requestCta}
          </button>
        )}

        {mySessions.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-slate-500 mb-2">{L.oneOnOne.history}</div>
            <div className="space-y-1">
              {mySessions.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span>
                    {formatDate(s.meeting_date)} / {s.mentor_name}
                  </span>
                  <span className="text-slate-400">{s.duration_min}分</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* キャリア進捗 */}
      <div className="card bg-gradient-to-br from-brand-50 to-white">
        <h2 className="font-bold">{L.myFuture}</h2>
        {nextLv ? (
          <>
            <div className="mt-3 text-sm text-slate-600">
              {L.towardNextLevel}: Lv{nextLv.level}{" "}
              <span className="font-medium">
                {locale === "id" ? nextLv.name_id : nextLv.name_ja}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 bg-white rounded-full h-3 overflow-hidden border border-slate-200">
                <div
                  className="bg-brand-500 h-full transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-2xl font-bold text-brand-600">{completion}%</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <GateRow ok={gateSkill} label={L.reqSkills} current={`${emp.skill_count}/${nextLv.min_skill_count}`} />
              <GateRow ok={gateJlpt} label={L.reqJlpt} current={`${emp.jlpt_level} / ${nextLv.min_jlpt_level}`} />
              <GateRow ok={gateTenure} label={L.reqTenure} current={`${emp.tenure_months}/${nextLv.min_tenure_months} ${L.months}`} />
            </div>
            <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
              💰 {L.salaryUp} <span className="font-bold">+{nextLv.hourly_wage_delta}{L.perHour}</span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            {L.topLevel}
          </div>
        )}
      </div>

      {/* 在留プラン */}
      {emp.current_visa_status && emp.current_visa_status !== "japanese" && (
        <div className="card">
          <h2 className="font-bold">{L.myFutureInJapan}</h2>
          <div className="mt-3 text-sm space-y-3">
            <Row
              label={L.currentVisa}
              value={visaLabel(emp.current_visa_status)}
            />
            {emp.visa_expires_at && (
              <Row label={L.expires} value={emp.visa_expires_at} />
            )}
            <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
              <div className="font-semibold">{L.stayPath}</div>
              <ul className="mt-2 space-y-1.5 text-xs">
                <li>✅ {L.path1}</li>
                <li>✅ {L.path2}</li>
                <li>✅ {L.path3}</li>
              </ul>
              <button className="mt-3 text-xs bg-white rounded-lg px-3 py-1.5 border border-indigo-200 hover:bg-indigo-50">
                {L.shareFamily}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
          (admin view)
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500 text-xs">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function GateRow({ ok, label, current }: { ok: boolean; label: string; current: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span
          className={
            ok
              ? "w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center"
              : "w-5 h-5 rounded-full border-2 border-slate-300"
          }
        >
          {ok ? "✓" : ""}
        </span>
        {label}
      </span>
      <span className={ok ? "text-emerald-700 font-medium" : "text-slate-500"}>
        {current}
      </span>
    </div>
  );
}

function ConditionBtn({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      className={`${color} hover:scale-105 transition-transform rounded-xl p-3 flex flex-col items-center gap-1 text-xs font-medium`}
    >
      {icon}
      {label}
    </button>
  );
}

function LangLink({
  q,
  lang,
  children,
}: {
  q: { id?: string };
  lang: "ja" | "id" | "vi";
  children: React.ReactNode;
}) {
  const url = `/my?lang=${lang}${q.id ? `&id=${q.id}` : ""}`;
  return (
    <Link href={url} className="text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded">
      {children}
    </Link>
  );
}

function rankJlpt(l: string): number {
  const m: Record<string, number> = { none: 0, N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  return m[l] ?? 0;
}

const texts = {
  ja: {
    hello: "おはようございます。",
    oneOnOne: {
      title: "1on1 面談",
      subtitle: "困ったことがあれば気軽に相談を。",
      requestCta: "面談をリクエスト",
      scheduledAt: "予定日",
      history: "過去の面談",
    },
    conditionQuestion: "今日の調子は？",
    great: "絶好調",
    ok: "普通",
    tired: "少し疲れ",
    bad: "つらい",
    myFuture: "あなたのキャリア",
    towardNextLevel: "次のLvまで",
    reqSkills: "必要スキル数",
    reqJlpt: "必要日本語",
    reqTenure: "必要勤続",
    months: "ヶ月",
    salaryUp: "昇格で時給",
    perHour: "円/時",
    topLevel: "最高位に到達しています！",
    myFutureInJapan: "日本での未来",
    currentVisa: "現在の在留資格",
    expires: "期限",
    stayPath: "中温で長く働くメリット",
    path1: "特定技能への移行を会社がサポート",
    path2: "日本語試験の受験料は会社負担",
    path3: "将来は家族帯同・永住権も視野に",
    shareFamily: "家族にシェアする",
  },
  id: {
    hello: "Selamat pagi!",
    oneOnOne: {
      title: "Sesi 1on1",
      subtitle: "Ada kesulitan? Jangan ragu untuk konsultasi.",
      requestCta: "Minta sesi 1on1",
      scheduledAt: "Jadwal",
      history: "Riwayat sesi",
    },
    conditionQuestion: "Bagaimana kondisi Anda hari ini?",
    great: "Sangat baik",
    ok: "Biasa",
    tired: "Sedikit lelah",
    bad: "Tidak enak",
    myFuture: "Karier Anda",
    towardNextLevel: "Menuju Lv berikutnya",
    reqSkills: "Skill dibutuhkan",
    reqJlpt: "JLPT dibutuhkan",
    reqTenure: "Masa kerja",
    months: "bulan",
    salaryUp: "Kenaikan per jam",
    perHour: " yen/jam",
    topLevel: "Anda sudah di level tertinggi!",
    myFutureInJapan: "Masa depan Anda di Jepang",
    currentVisa: "Visa saat ini",
    expires: "Berakhir",
    stayPath: "Manfaat bekerja lama di Chuon",
    path1: "Perusahaan mendukung transisi ke Visa Keterampilan Spesifik",
    path2: "Biaya ujian JLPT ditanggung perusahaan",
    path3: "Ke depan, membawa keluarga & izin tinggal permanen mungkin",
    shareFamily: "Bagikan ke keluarga",
  },
  vi: {
    hello: "Chào buổi sáng!",
    oneOnOne: {
      title: "1on1",
      subtitle: "Có khó khăn? Hãy thoải mái trao đổi.",
      requestCta: "Yêu cầu 1on1",
      scheduledAt: "Lịch hẹn",
      history: "Lịch sử 1on1",
    },
    conditionQuestion: "Hôm nay bạn thế nào?",
    great: "Rất tốt",
    ok: "Bình thường",
    tired: "Hơi mệt",
    bad: "Không ổn",
    myFuture: "Sự nghiệp của bạn",
    towardNextLevel: "Đến cấp tiếp theo",
    reqSkills: "Kỹ năng cần",
    reqJlpt: "JLPT cần",
    reqTenure: "Thâm niên cần",
    months: "tháng",
    salaryUp: "Tăng lương mỗi giờ",
    perHour: " yên/giờ",
    topLevel: "Bạn đã ở cấp cao nhất!",
    myFutureInJapan: "Tương lai tại Nhật Bản",
    currentVisa: "Visa hiện tại",
    expires: "Hết hạn",
    stayPath: "Lợi ích khi làm lâu dài tại Chuon",
    path1: "Công ty hỗ trợ chuyển sang Visa Kỹ năng đặc định",
    path2: "Chi phí thi JLPT do công ty chi trả",
    path3: "Tương lai có thể đưa gia đình & vĩnh trú",
    shareFamily: "Chia sẻ với gia đình",
  },
} as const;
