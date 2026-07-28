import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
import {
  CHAT_TOOL_DESCRIPTIONS,
  checkAccountInputSchema,
  emptyInputSchema,
  listRecentUnfollowersInputSchema,
  paginatedListInputSchema,
} from "@/lib/instagram/chat-tool-schemas";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the AI assistant built into Orbly, a local-first Instagram follower/following analytics tool.

Ground rules:
- All of your tools read data that lives only in the user's own browser (IndexedDB), from Instagram data exports they've imported into Orbly themselves. Nothing is scraped from Instagram directly, and Orbly never automates actions on Instagram (it cannot unfollow anyone for the user).
- Only state facts about the user's followers/following as fact when a tool actually returned them. Never guess, estimate, or extrapolate a username list or count that a tool didn't return.
- If a tool reports "available: false", tell the user plainly why (e.g. no data imported yet, or only one snapshot so history isn't available) and what they need to do to unlock that answer (e.g. "import your Instagram export on the Import page", or "import a second, more recent export to see recent unfollowers").
- If the user asks something your tools cannot answer at all — because Instagram's data export doesn't include it (e.g. story views, who viewed their profile, DMs, likes, hidden "restricted" accounts, why someone specifically unfollowed them) — say so explicitly and explain that this data isn't part of the follower/following export Orbly reads, rather than guessing or making it up. Where you can, briefly say how they COULD get that information (e.g. "Instagram's own app shows story viewers under the story itself; that's not in the data export Orbly uses").
- For general Instagram knowledge questions not about the user's specific account (e.g. "how does the algorithm work", "what's a good posting cadence") you may answer from your own general knowledge, but make clear it's general information, not something read from their data.
- When you do use a tool result, be transparent that the number/list came from their imported Instagram data snapshot (and which one, if relevant) so the user knows where the information is from and can go verify it themselves in the app if they want.
- Keep answers concise and direct. Large lists should be summarized (e.g. "342 accounts, here are the first 20") rather than dumped in full unless the user asks for the complete list.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-5",
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      getAccountStats: {
        description: CHAT_TOOL_DESCRIPTIONS.getAccountStats,
        inputSchema: emptyInputSchema,
      },
      listDoesNotFollowBack: {
        description: CHAT_TOOL_DESCRIPTIONS.listDoesNotFollowBack,
        inputSchema: paginatedListInputSchema,
      },
      listMutuals: {
        description: CHAT_TOOL_DESCRIPTIONS.listMutuals,
        inputSchema: paginatedListInputSchema,
      },
      listYouDontFollowBack: {
        description: CHAT_TOOL_DESCRIPTIONS.listYouDontFollowBack,
        inputSchema: paginatedListInputSchema,
      },
      checkAccount: {
        description: CHAT_TOOL_DESCRIPTIONS.checkAccount,
        inputSchema: checkAccountInputSchema,
      },
      listRecentUnfollowers: {
        description: CHAT_TOOL_DESCRIPTIONS.listRecentUnfollowers,
        inputSchema: listRecentUnfollowersInputSchema,
      },
      listSnapshots: {
        description: CHAT_TOOL_DESCRIPTIONS.listSnapshots,
        inputSchema: emptyInputSchema,
      },
      getQueueStatus: {
        description: CHAT_TOOL_DESCRIPTIONS.getQueueStatus,
        inputSchema: emptyInputSchema,
      },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
