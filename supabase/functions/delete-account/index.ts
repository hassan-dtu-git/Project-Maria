import { createClient } from "npm:@supabase/supabase-js@2.95.0";

type JsonRecord = Record<string, unknown>;
type AuthMethod = { method?: unknown; timestamp?: unknown };

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function respond(req: Request, body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req.headers.get("origin")),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseKeyMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  if (req.method !== "POST") return respond(req, { error: "Method not allowed." }, 405);

  const authorization = req.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) return respond(req, { error: "Sign in again before deleting your account." }, 401);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKeys = parseKeyMap(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const secretKeys = parseKeyMap(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!projectUrl || !publishableKey || !secretKey) {
    console.error("delete-account is missing a required server-side Supabase setting");
    return respond(req, { error: "Account deletion is temporarily unavailable. Please contact support." }, 503);
  }

  try {
    const supabaseAuth = createClient(projectUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });

    // Verify the caller's access token through Supabase Auth.
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(tokenMatch[1]);
    const claims = claimsData?.claims;
    if (claimsError || !claims || typeof claims.sub !== "string" || claims.role !== "authenticated" || claims.is_anonymous === true) {
      return respond(req, { error: "Your session is not valid. Sign in again and retry." }, 401);
    }

    // Only a fresh password-authentication method satisfies reauthentication.
    // Access tokens may omit auth_time, so check the signed AMR method timestamp.
    const authMethods: AuthMethod[] = Array.isArray(claims.amr) ? claims.amr as AuthMethod[] : [];
    const passwordAuthTimes = authMethods
      .filter((item) => item && item.method === "password")
      .map((item) => Number(item.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp));
    const now = Math.floor(Date.now() / 1000);
    const recentPasswordAuth = passwordAuthTimes.some((timestamp) =>
      timestamp <= now + 60 && now - timestamp >= 0 && now - timestamp <= 600
    );
    if (!recentPasswordAuth) {
      return respond(req, { error: "For safety, enter your current password again before deleting your account." }, 401);
    }

    let body: JsonRecord;
    try {
      body = await req.json() as JsonRecord;
    } catch {
      return respond(req, { error: "A valid confirmation is required." }, 400);
    }
    if (body.confirmation !== "DELETE") {
      return respond(req, { error: 'Type "DELETE" to confirm permanent account deletion.' }, 400);
    }

    const supabaseAdmin = createClient(projectUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Revoke refresh tokens on every device before deleting the Auth record.
    // Supabase access tokens remain valid until expiry, so the database authorization
    // layer must continue to fail closed once the user's profile has been removed.
    const { error: revokeError } = await supabaseAdmin.auth.admin.signOut(tokenMatch[1], 'global');
    if (revokeError) {
      console.error("delete-account session revocation warning", revokeError.message);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(claims.sub, false);
    if (deleteError) {
      console.error("delete-account admin deletion failed", deleteError.message);
      return respond(req, { error: "Maria could not delete the account right now. Please try again or contact support." }, 500);
    }

    return respond(req, { deleted: true });
  } catch (error) {
    console.error("delete-account request failed", error instanceof Error ? error.message : "unknown error");
    return respond(req, { error: "Maria could not delete the account right now. Please try again or contact support." }, 500);
  }
});
