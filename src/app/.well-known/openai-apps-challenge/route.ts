/**
 * OpenAI plugin directory domain verification.
 * Set OPENAI_APPS_CHALLENGE_TOKEN to the exact portal challenge token.
 * @see https://developers.openai.com/plugins/deploy/submission
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const token = process.env.OPENAI_APPS_CHALLENGE_TOKEN?.trim();
  if (!token) {
    return new Response("OpenAI apps challenge token is not configured.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(token, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
