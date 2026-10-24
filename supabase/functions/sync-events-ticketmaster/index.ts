import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("MARIA_APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const providerKey = Deno.env.get("TICKETMASTER_API_KEY");
  if (!supabaseUrl || !serviceKey) return respond(500, { error: "Server configuration is incomplete." });
  if (!providerKey) return respond(503, { error: "Event provider is not configured yet. Add TICKETMASTER_API_KEY as an Edge Function secret." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond(401, { error: "Sign in as an authorized administrator." });

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData.user) return respond(401, { error: "The session is invalid or expired." });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
  if (profileError || profile?.is_admin !== true) return respond(403, { error: "Administrator access required." });

  try {
    const params = new URLSearchParams({
      apikey: providerKey,
      countryCode: "IN",
      city: "Delhi",
      size: "50",
      sort: "date,asc",
      startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
    const providerResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!providerResponse.ok) {
      const status = providerResponse.status === 401 || providerResponse.status === 403 ? 502 : 503;
      return respond(status, { error: "The event provider request failed. Check the API key, access, and provider coverage.", provider_status: providerResponse.status });
    }
    const payload = await providerResponse.json();
    const providerEvents = Array.isArray(payload?._embedded?.events) ? payload._embedded.events : [];
    const rows = providerEvents.flatMap((event: any) => {
      // Only ingest absolute timestamps. Local date/time without an explicit
      // timezone is ambiguous and must not be silently interpreted as UTC.
      const startRaw = event?.dates?.start?.dateTime;
      if (!event?.id || !event?.name || !startRaw) return [];
      const startsAt = new Date(startRaw);
      if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) return [];
      const venue = event?._embedded?.venues?.[0];
      const venueName = typeof venue?.name === "string" && venue.name.trim() ? venue.name.trim() : "Venue to be confirmed";
      const city = venue?.city?.name || "Delhi NCR";
      const category = event?.classifications?.[0]?.segment?.name || "Other";
      const description = [event?.info, event?.pleaseNote].filter((value: unknown) => typeof value === "string").join("\n\n").slice(0, 5000);
      const externalUrl = typeof event?.url === "string" && event.url.startsWith("https://") ? event.url : null;
      const endRaw = event?.dates?.end?.dateTime;
      const endsAt = endRaw && Number.isFinite(new Date(endRaw).getTime()) && new Date(endRaw) > startsAt
        ? new Date(endRaw).toISOString()
        : null;
      return [{
        source_provider: "ticketmaster",
        source_event_id: String(event.id),
        title: String(event.name).slice(0, 160),
        description,
        category: String(category).slice(0, 80),
        venue_name: venueName.slice(0, 160),
        city: String(city).slice(0, 100),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt,
        booking_url: externalUrl,
        published: true,
      }];
    });

    if (!rows.length) return respond(200, { provider: "ticketmaster", fetched: providerEvents.length, upserted: 0, message: "No eligible future event records were returned for Delhi by this provider query." });
    const { error: upsertError } = await adminClient.from("events").upsert(rows, { onConflict: "source_provider,source_event_id" });
    if (upsertError) {
      console.error("Event sync database write failed", upsertError.message);
      return respond(500, { error: "Events were fetched, but the database update failed." });
    }
    return respond(200, { provider: "ticketmaster", fetched: providerEvents.length, upserted: rows.length });
  } catch (error) {
    console.error("Event sync failed", error instanceof Error ? error.message : "unknown error");
    return respond(502, { error: "Could not complete event synchronization. Try again later." });
  }
});
