import { createConvexFeedbackStore } from "@/lib/feedback/convex-store";
import { feedbackContract } from "@/lib/feedback/discovery";
import { handleFeedbackSubmission } from "@/lib/feedback/intake";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json(feedbackContract(), {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleFeedbackSubmission(request, {
    store: createConvexFeedbackStore(process.env),
    env: process.env,
  });
}
