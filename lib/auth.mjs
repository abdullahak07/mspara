import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
const secret=()=>process.env.APP_PASSWORD||'';
export function passwordMatches(value){return secret().length>=16&&typeof value==='string'&&timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(secret()).digest());}
export function sessionToken(now=Date.now()){if(secret().length<16)throw new Error('Configure APP_PASSWORD (at least 16 characters).');const expires=String(now+7*86400000);return expires+'.'+createHmac('sha256',secret()).update(expires).digest('hex');}
export function validSession(token,now=Date.now()){if(secret().length<16||typeof token!=='string')return false;const [expires,signature]=token.split('.');if(!/^\d+$/.test(expires)||Number(expires)<=now||!signature||!/^[a-f0-9]{64}$/.test(signature))return false;const expected=createHmac('sha256',secret()).update(expires).digest('hex');return timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}
export function authenticated(request){const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('invoice-session='))?.slice(16);return validSession(token);}
export function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin;}
