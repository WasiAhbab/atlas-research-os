import {bootstrapWorkspace} from "@/lib/bootstrap";
import { secureRoute } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDashboardState } from "@/lib/db";
import { getActiveProviderId, listProviderPresets, listProvidersPublic } from "@/lib/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET() {
    await bootstrapWorkspace();
    const providers = (await listProvidersPublic());
    const activeProviderId = (await getActiveProviderId());
    const active = providers.find((p) => p.id === activeProviderId);
    return NextResponse.json({
        ...(await getDashboardState()),
        providers,
        providerPresets: listProviderPresets(),
        config: {
            liveProviderCount: providers.filter((p) => p.enabled).length,
            activeProviderId,
            activeProviderName: active?.name || (activeProviderId === "auto" ? "Auto Router" : "None"),
            activeModel: active?.model || "Automatic",
            autoFileConfidence: Number(process.env.AUTO_FILE_CONFIDENCE || 0.78),
            providerFailover: true,
            encryptedVault: true,
        }
    });
}

export const GET=secureRoute(handleGET);
