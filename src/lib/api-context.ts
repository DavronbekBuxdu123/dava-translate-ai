import { NextRequest } from 'next/server';
import { sameOrigin } from '@/lib/server';
import { throttle } from '@/lib/rate-limit';
import { guest } from '@/lib/auth/guest';
export async function context(request: NextRequest, paid = false) {
  sameOrigin(request);
  // Throttle before guest creation as well as by the resolved guest identity.
  await throttle(request, request.cookies.get('dava_guest')?.value || 'new-guest', paid);
  return guest();
}
