import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/knowledge";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(req: NextRequest) {
    try {
        const p = req.nextUrl.searchParams;
        return NextResponse.json((await searchKnowledge((p.get("q") || "").trim(), p.get("projectId") || "", Math.max(0, Number(p.get("offset")) || 0))));
    }
    catch {
        return NextResponse.json({ error: "Search is unavailable. Please retry." }, { status: 500 });
    }
}

export const GET=secureRoute(handleGET);
