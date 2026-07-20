import { getMyServers } from "@/actions/server.actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ServersNavClient from "@/components/servers/ServersNavClient";

export default async function ServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) return null;

  const servers = await getMyServers();

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <ServersNavClient servers={servers}>
        {children}
      </ServersNavClient>
    </div>
  );
}
