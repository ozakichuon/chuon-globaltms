import Image from "next/image";
import type { EmployeeSummary } from "@/lib/types";
import { nationalityFlag } from "@/lib/utils";

export function avatarUrl(e: Pick<EmployeeSummary, "display_name" | "last_name_native" | "first_name_native" | "photo_url">): string {
  if (e.photo_url) return e.photo_url;
  return avatarUrlFor(
    e.last_name_native ? `${e.last_name_native} ${e.first_name_native}` : e.display_name
  );
}

// 氏名文字列だけからアバターURLを得る（一覧表でIDなしでも使える）
export function avatarUrlFor(name: string | null | undefined): string {
  const seed = encodeURIComponent(name ?? "?");
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

// 小アバター（リスト・表用。名前だけから生成）
export function MiniAvatar({
  name,
  nationality,
  photoUrl,
  size = 28,
}: {
  name: string | null | undefined;
  nationality?: string | null;
  photoUrl?: string | null;
  size?: number;
}) {
  const src = photoUrl ?? avatarUrlFor(name);
  return (
    <span
      className="relative inline-flex flex-shrink-0 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized
      />
      {nationality && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full flex items-center justify-center ring-1 ring-white leading-none"
          style={{
            width: Math.max(12, Math.round(size * 0.45)),
            height: Math.max(12, Math.round(size * 0.45)),
            fontSize: Math.max(10, Math.round(size * 0.35)),
          }}
        >
          {natFlag(nationality)}
        </span>
      )}
    </span>
  );
}

function natFlag(n: string): string {
  const map: Record<string, string> = {
    JP: "🇯🇵", ID: "🇮🇩", VN: "🇻🇳", PH: "🇵🇭", CN: "🇨🇳",
    NP: "🇳🇵", MM: "🇲🇲", KH: "🇰🇭", TH: "🇹🇭", BR: "🇧🇷",
    ベトナム: "🇻🇳", インドネシア: "🇮🇩", フィリピン: "🇵🇭", 日本: "🇯🇵",
  };
  return map[n] ?? "🌏";
}

interface Props {
  employee: Pick<
    EmployeeSummary,
    "display_name" | "last_name_native" | "first_name_native" | "nationality" | "photo_url"
  >;
  size?: number;
  withFlag?: boolean;
  className?: string;
}

export function Avatar({ employee, size = 96, withFlag = true, className }: Props) {
  const flagSize = Math.max(18, Math.round(size * 0.28));
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <div
        className="rounded-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden ring-2 ring-white shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl(employee)}
          alt={employee.display_name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
      {withFlag && (
        <span
          className="absolute -bottom-1 -right-1 bg-white rounded-full flex items-center justify-center shadow-sm ring-1 ring-slate-200"
          style={{
            width: flagSize,
            height: flagSize,
            fontSize: Math.round(flagSize * 0.7),
          }}
          title={employee.nationality}
        >
          {nationalityFlag(employee.nationality)}
        </span>
      )}
    </div>
  );
}
