import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchResearch } from "@/lib/dispatch";
export const runtime = "nodejs";
export const maxDuration = 180;
async function handlePOST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await context.params;
        const session = (await db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id)) as any;
        if (!session)
            return NextResponse.json({ error: "Session not found." }, { status: 404 });
        const body = await req.json().catch(() => ({}));
        const instructions = body.instructions === undefined ? session.instructions : String(body.instructions).trim();
        const checkpoint = (() => { try {
            return JSON.parse(session.checkpoint_json || "{}");
        }
        catch {
            return {};
        } })();
        const requestedProviderId = String(body.providerId || checkpoint.providerId || "auto").trim();
        const providerId = requestedProviderId;
        const result = await dispatchResearch({ projectId: session.project_id, topic: session.topic, instructions, providerId, resumeSessionId: id });
        return NextResponse.json(result, {status:202});
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resume research." }, { status: 500 });
    }
}

export const POST=secureRoute(handlePOST);
