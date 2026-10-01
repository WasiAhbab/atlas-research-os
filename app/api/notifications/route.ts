import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(req: NextRequest) {
    const p = req.nextUrl.searchParams, project = p.get("projectId") || "", offset = Math.max(0, Number(p.get("offset")) || 0);
    const unread = p.get("unread") === "true";
    const where = `(?='' OR project_id=? OR project_id IS NULL)${unread ? " AND read_at IS NULL" : ""}`;
    const rows = (await db.prepare(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?`).all(project, project, offset));
    const total = Number(((await db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE ${where}`).get(project, project)) as any).n);
    return NextResponse.json({ rows, total, nextOffset: offset + rows.length < total ? offset + rows.length : null });
}
async function handlePOST(req: NextRequest) {
    const body = await req.json();
    if (!body.id)
        return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    const result = (await db.prepare(`UPDATE notifications SET read_at=? WHERE id=?`).run(now(), String(body.id)));
    return NextResponse.json({ ok: Boolean(result.changes) });
}

export const GET=secureRoute(handleGET);
export const POST=secureRoute(handlePOST);
