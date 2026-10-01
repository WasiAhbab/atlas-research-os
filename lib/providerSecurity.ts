import { PROVIDER_PRESETS } from './providerCatalog';
// Fixed, administrator-controlled HTTPS origins prevent public users reaching private services.
export function validateProviderUrl(value:string) {
  let url:URL;
  try {url=new URL(value);} catch {throw new Error('Enter a valid provider URL.');}
  const allowed = new Set(PROVIDER_PRESETS.flatMap(p=>{try {const u=new URL(p.baseUrl);return u.protocol==='https:'?[u.origin]:[];}catch{return [];}}));
  for(const origin of (process.env.ATLAS_ALLOWED_PROVIDER_ORIGINS || '').split(',').filter(Boolean)) allowed.add(origin.trim());
  if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !allowed.has(url.origin)) throw new Error('This endpoint is unavailable in the cloud. Use a hosted preset or ask the administrator to allow its HTTPS origin.');
}
