import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { resolveApproval } from "@/lib/approvals";
export const runtime = "nodejs";
async function handlePOST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await context.params, body = await req.json();
        return NextResponse.json((await resolveApproval(id, String(body.folderPath || "").trim())));
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve approval" }, { status: 400 });
    }
}

export const POST=secureRoute(handlePOST);
