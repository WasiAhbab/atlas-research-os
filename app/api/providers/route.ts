import { secureRoute } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getActiveProviderId, listProviderPresets, listProvidersPublic, saveProvider } from "@/lib/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET() {
    return NextResponse.json({ providers: (await listProvidersPublic()), presets: listProviderPresets(), activeProviderId: (await getActiveProviderId()) });
}
async function handlePOST(req: NextRequest) {
    try {
        const body = await req.json();
        const id = (await saveProvider({
            id: body.id ? String(body.id) : undefined,
            presetId: String(body.presetId || "custom"),
            name: String(body.name || ""),
            apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
            model: String(body.model || ""),
            baseUrl: String(body.baseUrl || ""),
            webSearchEnabled: body.webSearchEnabled !== false,
            enabled: body.enabled !== false,
        }));
        return NextResponse.json({ id }, { status: 201 });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save provider." }, { status: 400 });
    }
}

export const GET=secureRoute(handleGET);
export const POST=secureRoute(handlePOST);
