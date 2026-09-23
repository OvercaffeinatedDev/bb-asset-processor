import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/services/sessionService';
import { retrieveLTIToken } from '@/lib/utils/ltiAuth';

export const POST = async (req: NextRequest) => {
  try {
    const { state, returnUrl } = await req.json();

    if (!state || !returnUrl) {
      return NextResponse.json({ error: 'Missing state or returnUrl' }, { status: 400 });
    }

    const session = await getSession(state);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const ltiToken = await retrieveLTIToken(session.aud!);
    if (!ltiToken) {
      return NextResponse.json({ error: 'Failed to obtain LTI access token' }, { status: 502 });
    }

    const eulaResponse = await fetch(`${returnUrl}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ltiToken}`,
      },
      body: JSON.stringify({
        userId: session.sub,
        accepted: true,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!eulaResponse.ok) {
      const body = await eulaResponse.text();
      console.error('EULA acceptance rejected by platform:', eulaResponse.status, body);
      return NextResponse.json({ error: 'Platform rejected EULA acceptance' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in EULA acceptance handler:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
