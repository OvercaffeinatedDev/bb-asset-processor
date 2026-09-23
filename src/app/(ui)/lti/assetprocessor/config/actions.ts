'use server';

import { env } from '@/lib/env/server';
import { getSession } from '@/lib/services/sessionService';
import { signJWT } from '@/lib/utils/jwt';

export interface SubmitConfigResult {
  success: boolean;
  error?: string;
  returnUrl?: string;
  jwt?: string;
}

// Completes the LTI Deep Linking flow: signs an LtiDeepLinkingResponse JWT
// registering the Asset Processor as a content item, to be POSTed back to the
// platform's deep_link_return_url by the browser (see ConfigPanel's onSubmit).
//
// Ported from the working reference in old.tsx, with two fixes over the
// abandoned actions.ts attempt this replaces:
//   - iat/exp must be Unix seconds, not milliseconds (Date.now() is ms).
//   - the deep-linking `data` claim must echo back `deep_linking_settings.data`
//     (stored as session.deepLinkingData), not the whole raw launch JWT.
export const submitConfig = async (state: string): Promise<SubmitConfigResult> => {
  if (!state) {
    return { success: false, error: 'Missing session state' };
  }

  const session = await getSession(state);
  if (!session || !session.deepLinkingReturnURL) {
    return { success: false, error: 'Session not found or expired. Please relaunch the tool from Blackboard.' };
  }

  const now = Math.trunc(Date.now() / 1000);
  const payload = {
    iss: env.APP_KEY,
    aud: 'https://blackboard.com',
    sub: env.APP_KEY,
    iat: now,
    exp: now + 300,
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': session.deploymentId,
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti-dl/claim/data': session.deepLinkingData,
    'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': [
      {
        type: 'ltiAssetProcessor',
        title: 'AI Asset Processor',
        text: null,
        url: null,
        lineItem: null,
        presentation: null,
        submission: null,
        available: null,
      },
    ],
  };

  const signedJWT = signJWT(payload);
  if (!signedJWT) {
    return { success: false, error: 'Unable to generate the configuration token. Please contact the administrator.' };
  }

  return { success: true, returnUrl: session.deepLinkingReturnURL, jwt: signedJWT };
};
