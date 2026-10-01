import { secureRoute } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveProviderId, listProvidersPublic } from "@/lib/providers";
export const runtime = "nodejs";
async function handleGET() {
    const projects = (await db.prepare(`SELECT COUNT(*) AS c FROM projects`).get()) as {
        c: number;
    };
    const providers = (await listProvidersPublic());
    return NextResponse.json({
        ok: true,
        database: "supabase-postgresql",
        configuredProviders: providers.length,
        enabledProviders: providers.filter((p) => p.enabled).length,
        activeProviderId: (await getActiveProviderId()),
        encryptedCredentialVault: true,
        automaticFailover: true,
        projects: Number(projects.c)
    });
}

export const GET=secureRoute(handleGET);
