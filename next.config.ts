import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';
const config:NextConfig={serverExternalPackages:['pg'], async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}]}];}};
export default withWorkflow(config);
