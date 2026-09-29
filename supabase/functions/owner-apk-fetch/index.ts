import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const REPO = "milandushmantha272-jpg/dd-world-marketing-app";
const ARTIFACT_NAME = "DD-World-Enterprise-APK";
const OWNER_EMAIL = "milandushmantha272@gmail.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, message: "POST required." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!serviceKey) return json({ ok: false, message: "Server authorization is not configured." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, message: "Authentication required." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ ok: false, message: "Invalid session." }, 401);

  const { data: owner, error: ownerError } = await admin
    .from("users")
    .select("id,email,role,status,employment_status,id_approval_status")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (ownerError) return json({ ok: false, message: "Unable to validate account." }, 500);

  const isOwner =
    owner?.role === "owner" &&
    String(owner?.email ?? "").toLowerCase() === OWNER_EMAIL &&
    owner?.status === "active" &&
    owner?.employment_status === "ACTIVE" &&
    owner?.id_approval_status === "APPROVED";

  if (!isOwner) {
    return json({ ok: false, message: "APK download is restricted to the Owner account." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!/(download\s*link|latest\s*apk|\bapk\b|අලුත්\s*apk|download\s*apk)/i.test(query)) {
    return json({ ok: false, message: "This endpoint only handles Owner APK requests." }, 400);
  }

  const githubToken = Deno.env.get("GITHUB_ACTIONS_READ_TOKEN") ?? Deno.env.get("GITHUB_TOKEN") ?? "";
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DD-World-Marketing-App/owner-apk-fetch",
  };
  if (githubToken) headers.Authorization = "Bearer " + githubToken;

  const artifactsRes = await fetch(
    "https://api.github.com/repos/" + REPO + "/actions/artifacts?per_page=100",
    { headers }
  );
  if (!artifactsRes.ok) {
    const detail = await artifactsRes.text();
    return json({
      ok: false,
      message: artifactsRes.status === 401 || artifactsRes.status === 403
        ? "GitHub Actions artifact access is not configured on the server."
        : "GitHub Actions artifact lookup failed.",
      github_status: artifactsRes.status,
      detail: detail.slice(0, 300),
    }, 502);
  }

  const artifactPayload = await artifactsRes.json();
  const candidates = (artifactPayload?.artifacts ?? [])
    .filter((a: any) => a?.name === ARTIFACT_NAME && a?.expired === false && a?.workflow_run?.id)
    .sort((a: any, b: any) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""));

  for (const artifact of candidates) {
    const runId = artifact.workflow_run.id;
    const runRes = await fetch(
      "https://api.github.com/repos/" + REPO + "/actions/runs/" + runId,
      { headers }
    );
    if (!runRes.ok) continue;
    const run = await runRes.json();
    if (run?.status !== "completed" || run?.conclusion !== "success" || run?.head_branch !== "main") continue;

    const artifactPage =
      "https://github.com/" + REPO + "/actions/runs/" + runId + "/artifacts/" + artifact.id;
    const markdownLink = "[Download latest DD-World Enterprise APK](" + artifactPage + ")";

    return json({
      ok: true,
      artifact_name: artifact.name,
      artifact_id: artifact.id,
      run_id: runId,
      run_number: run.run_number,
      commit_sha: run.head_sha,
      digest: artifact.digest ?? "unavailable",
      markdown_link: markdownLink,
      artifact_page: artifactPage,
    });
  }

  return json({ ok: false, message: "No successful non-expired DD-World-Enterprise-APK was found on main." }, 404);
});