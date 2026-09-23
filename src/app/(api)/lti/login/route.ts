import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

import { v4 as uuidv4 } from 'uuid';

import { env } from '@/lib/env/server';
import { createSession } from '@/lib/services/sessionService';

// Required by the LTI 1.3 / OIDC third-party-initiated login spec — a launch
// missing any of these isn't a valid login request and shouldn't proceed.
const REQUIRED_PARAMS = [
  'iss',
  'login_hint',
  'target_link_uri',
  'lti_deployment_id',
  'client_id',
] as const;

export const GET = async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;

  const missing = REQUIRED_PARAMS.filter((name) => !params.get(name));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'invalidLoginRequest', missing },
      { status: 400 }
    );
  }

  const loginHint = params.get('login_hint')!;
  const targetLinkUri = params.get('target_link_uri')!;
  const ltiMessageHint = params.get('lti_message_hint');
  const ltiDeploymentId = params.get('lti_deployment_id')!;
  const clientId = params.get('client_id')!;

  // NOTE: `iss` / `client_id` / `target_link_uri` are attacker-controlled at this
  // point. In a multi-tenant deployment these should be checked against a known
  // platform registration (registered iss + client_id + redirect target) before
  // being trusted to build the OIDC redirect below, to avoid this endpoint being
  // used as an open redirect. Left as-is here since this integration currently
  // targets a single known Blackboard platform.

  const state = uuidv4();
  const nonce = uuidv4();

  try {
    await createSession({ state, deploymentId: ltiDeploymentId, nonce });
  } catch (e) {
    console.error('Unable to save launch information to database:', e);
    return NextResponse.json({ error: 'sessionCreationFailed' }, { status: 500 });
  }

  const authUrl = new URL(env.DEVPORTAL_OIDC_URL);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('login_hint', loginHint);
  if (ltiMessageHint) authUrl.searchParams.set('lti_message_hint', ltiMessageHint);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('redirect_uri', targetLinkUri);
  authUrl.searchParams.set('client_id', clientId);

  redirect(authUrl.toString());
};
