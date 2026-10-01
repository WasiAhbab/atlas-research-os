import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, transaction, ensureFolder, logActivity, now, randomUUID } from "@/lib/db";
export const runtime = "nodejs";
async function handlePOST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = String(body.name || "").trim();
        const topic = String(body.topic || "").trim();
        const instructions = String(body.instructions || "").trim();
        if (!name || !topic)
            return NextResponse.json({ error: "Project name and topic are required." }, { status: 400 });
        if(name.length>160 || topic.length>2000 || instructions.length>20000)return NextResponse.json({error:"Please shorten the project details."},{status:400});
        const id=await transaction(async()=>{
        const count=await db.prepare(`SELECT count(*) AS n FROM projects`).get();
        if(Number(count.n)>=100)throw new Error("This account supports up to 100 research projects.");
        const id = randomUUID();
        (await db.prepare(`INSERT INTO projects (id, name, topic, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(id, name, topic, instructions, now(), now()));
        for(const path of ["Research", "Sources", "Open Questions"]) await ensureFolder(id,path);
        (await logActivity({ projectId: id, action: "project.created", detail: `Created project “${name}” for topic “${topic}”.` }));
        return id;
        });
        return NextResponse.json({ id }, { status: 201 });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create project." }, { status: 500 });
    }
}

export const POST=secureRoute(handlePOST);
