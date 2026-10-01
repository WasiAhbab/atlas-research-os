import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
function masterKey(): Buffer {
    const value = process.env.ATLAS_MASTER_KEY?.trim();
    if (!value || value.length < 43)
        throw new Error("Configure a stable ATLAS_MASTER_KEY with at least 32 random bytes.");
    return createHash("sha256").update(value).digest();
}
export function encryptSecret(value: string): string {
    if (!value)
        return "";
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptSecret(value: string): string {
    if (!value)
        return "";
    const [version, ivRaw, tagRaw, bodyRaw] = value.split(".");
    if (version !== "v1" || !ivRaw || !tagRaw || !bodyRaw)
        throw new Error("Stored provider credential is invalid.");
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(bodyRaw, "base64url")), decipher.final()]).toString("utf8");
}
