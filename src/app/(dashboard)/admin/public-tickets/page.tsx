import { getAllPublicTickets } from "@/actions/public-ticket.actions";
import { PublicTicketAdminView } from "@/components/PublicTicketAdminView";
import { auth } from "@clerk/nextjs/server";

export default async function PublicTicketsAdminPage() {
  const { userId } = auth();
  if (!userId) return null;

  const tickets = await getAllPublicTickets();

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 bg-background h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-1 min-h-0">
        <PublicTicketAdminView tickets={tickets as any} currentUserId={userId} />
      </div>
    </div>
  );
}
