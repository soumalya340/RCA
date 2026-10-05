import { createFileRoute } from "@tanstack/react-router";
import { dropAway } from "@/lib/elsewhere/relay.server";

export const Route = createFileRoute("/api/presence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { selfId?: string };
          if (body?.selfId) await dropAway(body.selfId);
        } catch {
          // Unload beacons are best-effort.
        }
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      },
    },
  },
});
