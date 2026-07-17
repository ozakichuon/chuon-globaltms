import { excelAssignments, excelDormitories, excelEmployees, employeePhotoMap } from "@/lib/excel-data";
import { Home } from "lucide-react";
import DormitoriesClient from "./DormitoriesClient";

export const dynamic = "force-dynamic";

export default function DormitoriesPage() {
  // 退職者を除外
  const retiredCodes = new Set(
    excelEmployees.filter((e) => e.retired).flatMap((e) =>
      (e as any).employee_code ? (e as any).employee_code.split("\n").map((c: string) => c.trim()).filter(Boolean) : []
    )
  );
  const activeAssignments = excelAssignments.filter(
    (a) => !a.employee_code || !retiredCodes.has(a.employee_code)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home size={22} /> 寮管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          全{excelDormitories.length}寮・{activeAssignments.length}入居者
        </p>
      </div>

      <DormitoriesClient
        dormitories={excelDormitories}
        assignments={activeAssignments}
        photoMap={employeePhotoMap}
      />
    </div>
  );
}
