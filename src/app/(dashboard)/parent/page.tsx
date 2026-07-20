import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { userId } = auth();
  const currentUserId = userId;

  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId!,
    },
  });

  return (
    <DashboardPageLayout
      layoutKey="parent-dashboard-layout"
      leftContent={
        <div className="flex flex-col gap-6">
          {students.map((student) => (
            <div className="w-full" key={student.id}>
              <div className="h-full bg-card text-card-foreground p-6 rounded-[12px] shadow-sm border border-border">
                <h1 className="text-[20px] font-bold text-foreground mb-4">
                  Schedule ({student.name + " " + student.surname})
                </h1>
                <BigCalendarContainer type="classId" id={student.classId} />
              </div>
            </div>
          ))}
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

export default ParentPage;
