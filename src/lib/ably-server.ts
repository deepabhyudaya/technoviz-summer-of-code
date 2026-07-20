import Ably from "ably";

let restClient: Ably.Rest | null = null;

function getRestClient(): Ably.Rest | null {
  if (restClient) return restClient;
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return null;
  restClient = new Ably.Rest(apiKey);
  return restClient;
}

export type AblyEvent =
  | { type: "message:new"; message: any }
  | { type: "message:edit"; messageId: string | number; content: string }
  | { type: "message:delete"; messageId: string | number }
  | { type: "reaction:add"; messageId: string | number; emoji: string; userId: string }
  | { type: "reaction:remove"; messageId: string | number; emoji: string; userId: string }
  | { type: "member:muted"; userId: string; isMuted: boolean };

export async function ablyPublish(
  channelName: string,
  event: AblyEvent
): Promise<boolean> {
  const client = getRestClient();
  if (!client) return false;

  try {
    const channel = client.channels.get(channelName);
    await channel.publish("chat", event);
    return true;
  } catch (err) {
    console.error("Ably publish failed:", err);
    return false;
  }
}

export function getDMChannelName(convId: string | number): string {
  return `dm:${convId}`;
}

export function getGroupChannelName(groupId: string | number): string {
  return `group:${groupId}`;
}

export function getServerChannelName(
  serverId: string,
  channelId: string
): string {
  return `server:${serverId}:channel:${channelId}`;
}
