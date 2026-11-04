import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionToken,validSession,passwordMatches,authenticated,sameOrigin} from '../lib/auth.mjs';
process.env.APP_PASSWORD='test-password-with-enough-entropy';
test('session expires, rejects tampering and survives cookie parsing',()=>{const token=sessionToken(1000);assert(validSession(token,1001));assert(!validSession(token,1000+7*86400000));assert(!validSession(token+'x',1001));assert(!validSession('9999999999999.'+'é'.repeat(64)));assert(passwordMatches(process.env.APP_PASSWORD));assert(!passwordMatches('wrong'));assert(authenticated(new Request('https://example.com',{headers:{cookie:'other=x; invoice-session='+sessionToken()}})));assert(!authenticated(new Request('https://example.com')));});
test('writes only accept same origin',()=>{assert(sameOrigin(new Request('https://example.com/api',{headers:{origin:'https://example.com'}})));assert(!sameOrigin(new Request('https://example.com/api',{headers:{origin:'https://evil.com'}})));});
