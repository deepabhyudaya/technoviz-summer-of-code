import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import prisma from "@/lib/prisma";
import { Course, Teacher } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";
import moment from "moment";
import { Eye } from "lucide-react";
import ApprovalButtons from "@/components/ApprovalButtons";
import Link from "next/link";

type CourseList = Course & { teacher: Teacher };

const ApprovalsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  await markNotificationsByTypesAsRead(["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED"]);
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin") return <div>Access Denied</div>;

  const columns = [
    {
      header: "Course Title",
      accessor: "title",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Requested At",
      accessor: "createdAt",
      className: "hidden lg:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
    },
  ];

  const renderRow = (item: CourseList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="p-4 font-medium">{item.title}</td>
      <td className="hidden md:table-cell">{item.teacher.name} {item.teacher.surname}</td>
      <td className="hidden lg:table-cell">{moment(item.createdAt).format("MMM D, YYYY")}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/courses/${item.slug || item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors text-foreground" title="View course">
              <Eye size={14} strokeWidth={2} />
            </button>
          </Link>
          <ApprovalButtons id={item.id} />
        </div>
      </td>
    </tr>
  );

  const { page } = searchParams;
  const p = page ? parseInt(page) : 1;

  const [data, count] = await prisma.$transaction([
    prisma.course.findMany({
      where: { status: "PENDING" },
      include: {
        teacher: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Course Approvals</h1>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ApprovalsPage;
