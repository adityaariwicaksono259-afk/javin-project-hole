import { verifyAdmin } from "./auth.js";

export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      username: auth.username,
      message: "Session admin valid."
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
