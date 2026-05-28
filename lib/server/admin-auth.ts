import { NextRequest } from 'next/server';

function extractToken(request: NextRequest): string {
  const bearer = request.headers.get('authorization') ?? '';
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  return (request.headers.get('x-admin-key') ?? '').trim();
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const expected = String(process.env.ADMIN_CP_KEY ?? '').trim();
  if (!expected) {
    return false;
  }

  const actual = extractToken(request);
  return actual.length > 0 && actual === expected;
}
