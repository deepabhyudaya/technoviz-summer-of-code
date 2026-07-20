import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalendar";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: Number(id) }),
    },
    include: {
      teacher: { select: { name: true, surname: true } },
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  const data = dataRes.map((lesson) => ({
    id: lesson.id,
    title: lesson.name,
    start: lesson.startTime,
    end: lesson.endTime,
    teacherName: `${lesson.teacher.name} ${lesson.teacher.surname}`,
    subjectName: lesson.subject.name,
    className: lesson.class.name,
  }));

  return (
    <div className="mt-4 w-full overflow-hidden" style={{ height: "min(750px, 90vh)" }}>
      <BigCalendar data={data} />
    </div>
  );
};

export default BigCalendarContainer;
