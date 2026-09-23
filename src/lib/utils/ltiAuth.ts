import qs from 'qs';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../env/server';
import { deleteToken, getToken, upsertToken } from '../services/tokenService';
import { signJWT } from './jwt';

const generateLTIToken = async (site: string): Promise<string | null> => {
  const currentTime = Math.trunc(new Date().getTime() / 1000);
  const assertionData: LTIAssertionData = {
    iss: env.APP_KEY,
    sub: env.APP_KEY,
    aud: ['https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken'],
    iat: currentTime,
    exp: currentTime + 300,
    jti: uuidv4(),
  };

  const signedAssertion = signJWT(assertionData);
  if (!signedAssertion) {
    console.error('Failed to sign LTI assertion');
    return null;
  }

  const authRequestParams = {
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: signedAssertion,
    scope:
      'https://purl.imsglobal.org/spec/lti/scope/eula/deployment https://purl.imsglobal.org/spec/lti/scope/eula/user https://purl.imsglobal.org/spec/lti-ap/scope/asset.readonly https://purl.imsglobal.org/spec/lti-ap/scope/report',
  };

  const ltiAuthResponse = await fetch(env.DEVPORTAL_LTI_AUTH_URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: qs.stringify(authRequestParams),
  });

  if (!ltiAuthResponse.ok) {
    console.error('Error occurred while generating LTI token:', await ltiAuthResponse.json());
    return null;
  }

  const token = await ltiAuthResponse.json();
  const expirationDate = new Date(Date.now() + token['expires_in'] * 1000);

  await upsertToken(site, token['access_token'], expirationDate);

  return token['access_token'] as string;
};

// Treat a token as expired a little early so it doesn't die mid-request.
const EXPIRY_SAFETY_MARGIN_MS = 30_000;

export const retrieveLTIToken = async (site: string): Promise<string | null> => {
  const existing = await getToken(site);

  if (!existing) {
    return generateLTIToken(site);
  }

  if (existing.expirationDate.getTime() - EXPIRY_SAFETY_MARGIN_MS < Date.now()) {
    await deleteToken(site);
    return generateLTIToken(site);
  }

  return existing.token;
};
