"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, Gift, ShoppingCart } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: "EARNED" | "SPENT" | "GRANTED";
  source: string;
  description: string;
  createdAt: Date;
}

interface TransactionHistoryClientProps {
  initialTransactions: Transaction[];
}

const TransactionHistoryClient = ({ initialTransactions }: TransactionHistoryClientProps) => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case "EARNED":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "SPENT":
        return <ShoppingCart className="w-4 h-4 text-red-600" />;
      case "GRANTED":
        return <Gift className="w-4 h-4 text-purple-600" />;
      default:
        return <TrendingUp className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (transaction: Transaction) => {
    switch (transaction.type) {
      case "EARNED":
        return "text-green-600 bg-green-50 border-green-200";
      case "SPENT":
        return "text-red-600 bg-red-50 border-red-200";
      case "GRANTED":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">gecX History</h1>
            <p className="text-muted-foreground">View your token transaction history</p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery ? "No transactions found matching your search." : "No transactions yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.source} • {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getTransactionColor(transaction)}>
                        {transaction.type}
                      </Badge>
                      <span className={`font-semibold ${
                        transaction.type === "SPENT" ? "text-red-600" : "text-green-600"
                      }`}>
                        {transaction.type === "SPENT" ? "-" : "+"}{transaction.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistoryClient;
