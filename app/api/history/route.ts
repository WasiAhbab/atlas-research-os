import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, recoverInterruptedSessions } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(req: NextRequest) {
    (await recoverInterruptedSessions());
    const p = req.nextUrl.searchParams;
    const kind = p.get("kind") || "sessions";
    const spec = ({ sessions: ["sessions", "started_at"], activity: ["activity_logs", "created_at"], calls: ["provider_calls", "created_at"] } as Record<string, string[]>)[kind];
    if (!spec)
        return NextResponse.json({ error: "Unknown history type" }, { status: 400 });
    const project = p.get("projectId") || "";
    const offset = Math.max(0, Number(p.get("offset")) || 0);
    const [table, date] = spec;
    const where = `(?='' OR project_id=?${kind === "sessions" ? "" : " OR project_id IS NULL"})`;
    const rows = (await db.prepare(`SELECT * FROM ${table} WHERE ${where} ORDER BY ${date} DESC,id DESC LIMIT 25 OFFSET ?`).all(project, project, offset));
    const total = Number(((await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get(project, project)) as any).n);
    return NextResponse.json({ rows, total, nextOffset: offset + rows.length < total ? offset + rows.length : null });
}

export const GET=secureRoute(handleGET);
