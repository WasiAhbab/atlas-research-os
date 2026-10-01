import { secureRoute } from "@/lib/auth";
import { NextResponse } from "next/server";
import { setActiveProvider } from "@/lib/providers";
import { logActivity } from "@/lib/db";
export const runtime = "nodejs";
async function handlePOST(_req: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await context.params;
        (await setActiveProvider(id));
        (await logActivity({ action: "provider.activated", detail: id === "auto" ? "Enabled automatic provider routing with failover." : `Set ${id} as the active AI provider.` }));
        return NextResponse.json({ ok: true, activeProviderId: id });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not activate provider." }, { status: 400 });
    }
}

export const POST=secureRoute(handlePOST);
