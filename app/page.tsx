import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {validSession} from '../lib/auth.mjs';
import InvoiceApp from './invoice-app';
export const dynamic='force-dynamic';
export default async function Page(){if(!validSession((await cookies()).get('invoice-session')?.value))redirect('/login');return <InvoiceApp/>;}
