import TeacherAttendanceKanban from "@/components/TeacherAttendanceKanban";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function TeacherAttendancePage() {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 h-[calc(100vh-80px)] min-h-[600px] overflow-hidden">
      <TeacherAttendanceKanban />
    </div>
  );
}
