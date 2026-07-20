import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { College, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

type CollegeRow = College & {
  _count: { branches: number; students: number };
};

const CollegeListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Code", accessor: "collegeCode", className: "hidden md:table-cell" },
    { header: "University", accessor: "universityName", className: "hidden md:table-cell" },
    { header: "City", accessor: "city", className: "hidden lg:table-cell" },
    { header: "Branches", accessor: "branches", className: "hidden md:table-cell" },
    { header: "Students", accessor: "students", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "isActive", className: "hidden md:table-cell" },
    ...(role === "admin"
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  const renderRow = (item: CollegeRow) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-semibold">{item.name}</span>
          {item.shortName && (
            <span className="text-xs text-muted-foreground">{item.shortName}</span>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell">{item.collegeCode || "-"}</td>
      <td className="hidden md:table-cell">{item.universityName || "-"}</td>
      <td className="hidden lg:table-cell">
        {[item.city, item.state].filter(Boolean).join(", ") || "-"}
      </td>
      <td className="hidden md:table-cell">{item._count.branches}</td>
      <td className="hidden lg:table-cell">{item._count.students}</td>
      <td className="hidden md:table-cell">
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            item.isActive
              ? "bg-green-500/10 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {item.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="college" type="update" data={item} />
            <FormContainer table="college" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.CollegeWhereInput = {};
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (!value) continue;
      if (key === "search") {
        query.OR = [
          { name: { contains: value, mode: "insensitive" } },
          { shortName: { contains: value, mode: "insensitive" } },
          { collegeCode: { contains: value, mode: "insensitive" } },
          { universityName: { contains: value, mode: "insensitive" } },
        ];
      }
    }
  }

  const [data, count, allColleges] = await prisma.$transaction([
    prisma.college.findMany({
      where: query,
      include: { _count: { select: { branches: true, students: true } } },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.college.count({ where: query }),
    prisma.college.findMany({
      select: { id: true, name: true, shortName: true, collegeCode: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allColleges.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.collegeCode || c.shortName || undefined,
  }));

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Colleges</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Colleges" />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="college" type="create" />}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data as CollegeRow[]} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default CollegeListPage;
