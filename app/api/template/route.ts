import {createDecipheriv} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {authenticated} from '../../../lib/auth.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!authenticated(request))return new Response(null,{status:401});try{const encrypted=await readFile(process.cwd()+'/private/invoice-template.enc');const key=Buffer.from(process.env.INVOICE_TEMPLATE_KEY||'','base64');const cipher=createDecipheriv('aes-256-gcm',key,encrypted.subarray(0,12));cipher.setAuthTag(encrypted.subarray(12,28));const data=Buffer.concat([cipher.update(encrypted.subarray(28)),cipher.final()]);return new Response(data,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'}});}catch{return new Response('Configure INVOICE_TEMPLATE_KEY in Vercel.',{status:503});}}
