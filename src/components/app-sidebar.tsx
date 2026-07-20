import { currentUser } from "@clerk/nextjs/server";
import { SidebarInner } from "./sidebar-inner";
import { getUnreadCounts } from "@/actions/notification.actions";

export async function AppSidebar() {
  let user = null;
  try {
    user = await currentUser();
  } catch (e) {
    console.error("AppSidebar currentUser error:", e);
  }

  const role = ((user?.publicMetadata?.role as string) ?? "").toLowerCase();

  let counts = {
    messages: 0,
    tickets: 0,
    requests: 0,
    notifications: 0,
    teachers: 0,
    students: 0,
    parents: 0,
    grades: 0,
    classes: 0,
    lessons: 0,
    courses: 0,
    enrollments: 0,
    exams: 0,
    assignments: 0,
    results: 0,
    events: 0,
    announcements: 0,
  };

  try {
    counts = await getUnreadCounts();
  } catch (e) {
    console.error("AppSidebar getUnreadCounts error:", e);
  }

  return <SidebarInner role={role} initialCounts={counts} />;
}
