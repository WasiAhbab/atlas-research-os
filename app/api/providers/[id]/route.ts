import { secureRoute } from "@/lib/auth";
import { NextResponse } from "next/server";
import { deleteProvider } from "@/lib/providers";
export const runtime = "nodejs";
async function handleDELETE(_req: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await context.params;
        if (id.startsWith("env:"))
            return NextResponse.json({ error: "Environment providers are configured through .env.local and cannot be deleted from the UI." }, { status: 400 });
        (await deleteProvider(id));
        return NextResponse.json({ ok: true });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete provider." }, { status: 500 });
    }
}

export const DELETE=secureRoute(handleDELETE);
