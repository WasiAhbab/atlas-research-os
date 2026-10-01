import { secureRoute } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getProviderConfig, testProvider, updateProviderHealth } from "@/lib/providers";
import { logActivity } from "@/lib/db";
export const runtime = "nodejs";
export const maxDuration = 180;
async function handlePOST(_req: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await context.params;
    const provider = (await getProviderConfig(id));
    if (!provider)
        return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    try {
        const result = await testProvider(provider);
        (await updateProviderHealth(id, true));
        (await logActivity({ action: "provider.test_succeeded", detail: `${provider.name}/${result.model} responded successfully in ${result.latencyMs} ms.` }));
        return NextResponse.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Provider test failed.";
        (await updateProviderHealth(id, false, message));
        (await logActivity({ action: "provider.test_failed", detail: `${provider.name}: ${message}`, severity: "error" }));
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export const POST=secureRoute(handlePOST);
