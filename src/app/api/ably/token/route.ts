import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Ably from "ably";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ably not configured" },
      { status: 503 }
    );
  }

  const client = new Ably.Rest(apiKey);
  const tokenRequestData = await client.auth.createTokenRequest({
    clientId: userId,
  });

  return NextResponse.json(tokenRequestData);
}
