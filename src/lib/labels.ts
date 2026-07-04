export function visaLabel(s: string | null | undefined): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    japanese: "日本人",
    permanent: "永住者",
    long_term: "定住者",
    spouse: "日本人配偶者",
    technical_intern_1: "技能実習1号",
    technical_intern_2: "技能実習2号",
    technical_intern_3: "技能実習3号",
    specified_skill_1: "特定技能1号",
    specified_skill_2: "特定技能2号",
    engineer_humanities: "技人国",
    other: "その他",
  };
  return map[s] ?? s;
}

export function alertLabel(level: string): string {
  const map: Record<string, string> = {
    expired: "期限切れ",
    critical: "90日以内",
    warning: "180日以内",
    notice: "1年以内",
    safe: "安全",
    none: "—",
  };
  return map[level] ?? level;
}

export function employmentTypeLabel(s: string | null | undefined): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    regular: "正社員",
    contract: "契約社員",
    part_time: "パート",
    technical_intern: "技能実習",
    specified_skill: "特定技能",
    engineer: "技人国",
  };
  return map[s] ?? s;
}

export function nationalityLabel(n: string | null | undefined): string {
  if (!n) return "—";
  const map: Record<string, string> = {
    JP: "日本",
    ID: "インドネシア",
    VN: "ベトナム",
    PH: "フィリピン",
    CN: "中国",
    NP: "ネパール",
    MM: "ミャンマー",
    KH: "カンボジア",
    TH: "タイ",
    BR: "ブラジル",
  };
  return map[n] ?? n;
}
