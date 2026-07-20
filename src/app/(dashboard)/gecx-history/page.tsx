import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGecXTransactionHistory } from "@/actions/gecx.actions";
import TransactionHistoryClient from "./TransactionHistoryClient";

export const metadata = {
  title: "gecX History | gecX",
  description: "View your gecX token transaction history.",
};

const GecXHistoryPage = async () => {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const transactions = await getGecXTransactionHistory(userId);

  return <TransactionHistoryClient initialTransactions={transactions} />;
};

export default GecXHistoryPage;
