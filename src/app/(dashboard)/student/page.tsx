import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";

const StudentPage = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { userId } = auth();

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: userId! } },
    },
  });

  return (
    <DashboardPageLayout
      layoutKey="student-dashboard-layout"
      leftContent={
        <div className="min-h-full bg-card text-card-foreground p-6 rounded-[12px] shadow-sm border border-border">
          <h1 className="text-[20px] font-bold text-foreground mb-4">Schedule ({classItem[0]?.name || "N/A"})</h1>
          <BigCalendarContainer type="classId" id={classItem[0]?.id || 0} />
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

export default StudentPage;
