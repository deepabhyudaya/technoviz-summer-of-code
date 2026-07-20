import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { auth } from "@clerk/nextjs/server";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";

const TeacherPage = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { userId } = auth();
  return (
    <DashboardPageLayout
      layoutKey="teacher-dashboard-layout"
      leftContent={
        <div className="min-h-full bg-card text-card-foreground p-6 rounded-[12px] shadow-sm border border-border">
          <h1 className="text-[20px] font-bold text-foreground mb-4">Schedule</h1>
          <BigCalendarContainer type="teacherId" id={userId!} />
        </div>
      }
      rightContent={
        <>
          <EventCalendarContainer searchParams={searchParams} />
          <AnnouncementsNotificationList />
        </>
      }
    />
  );
};

export default TeacherPage;
