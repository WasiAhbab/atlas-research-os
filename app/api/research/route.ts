import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { dispatchResearch } from "@/lib/dispatch";
export const runtime = "nodejs";
export const maxDuration = 180;
async function handlePOST(req: NextRequest) {
    try {
        const body = await req.json();
        const projectId = String(body.projectId || "").trim();
        const topic = String(body.topic || "").trim();
        const instructions = String(body.instructions || "").trim();
        const providerId = String(body.providerId || "auto").trim();
        if (!projectId || !topic)
            return NextResponse.json({ error: "projectId and topic are required." }, { status: 400 });
        const result = await dispatchResearch({ projectId, topic, instructions, providerId });
        return NextResponse.json(result, {status:202});
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Research failed." }, { status: 500 });
    }
}

export const POST=secureRoute(handlePOST);
