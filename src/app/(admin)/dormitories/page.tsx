import { excelAssignments, excelDormitories, employeePhotoMap } from "@/lib/excel-data";
import { Home } from "lucide-react";
import DormitoriesClient from "./DormitoriesClient";

export const dynamic = "force-dynamic";

export default function DormitoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home size={22} /> 寮管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          全{excelDormitories.length}寮・{excelAssignments.length}入居者
        </p>
      </div>

      <DormitoriesClient
        dormitories={excelDormitories}
        assignments={excelAssignments}
        photoMap={employeePhotoMap}
      />
    </div>
  );
}
