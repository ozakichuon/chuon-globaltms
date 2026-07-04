import { Sidebar } from "@/components/Sidebar";
import { getSessionUserId } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  return (
    <div className="flex min-h-screen">
      <Sidebar userId={userId ?? ""} />
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
