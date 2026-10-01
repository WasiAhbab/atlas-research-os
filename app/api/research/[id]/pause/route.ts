import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, now, logActivity } from "@/lib/db";
export const runtime = "nodejs";
async function handlePOST(_req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await context.params;
    const changed = (await db.prepare(`UPDATE research_jobs SET pause_requested=1 WHERE session_id=? AND status IN ('running','queued')`).run(id));
    if (!changed.changes)
        return NextResponse.json({ error: "This session is no longer running. Refresh its history." }, { status: 409 });
    const session = (await db.prepare(`SELECT project_id FROM sessions WHERE id=?`).get(id)) as any;
    (await logActivity({ projectId: session.project_id, sessionId: id, action: "research.pause_requested", detail: "Pause requested. The current provider response will be saved before the run pauses." }));
    return NextResponse.json({ ok: true });
}

export const POST=secureRoute(handlePOST);
