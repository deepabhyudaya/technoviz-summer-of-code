import prisma from "@/lib/prisma";
import { CometCard } from "@/components/ui/comet-card";

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent";
}) => {
  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    teacher: prisma.teacher,
    student: prisma.student,
    parent: prisma.parent,
  };

  const data = await modelMap[type].count();

  return (
    <CometCard className="flex-1 min-w-[130px]" translateDepth={10} rotateDepth={10}>
      <div className="rounded-2xl p-4 w-full h-full bg-card text-card-foreground border border-border flex flex-col gap-3">
        <h2 className="capitalize text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {type === "admin" ? "Admin" : type === "teacher" ? "Teachers" : type === "student" ? "Students" : "Parents"}
        </h2>
        <h1 className="text-3xl font-bold">{data}</h1>
      </div>
    </CometCard>
  );
};

export default UserCard;
