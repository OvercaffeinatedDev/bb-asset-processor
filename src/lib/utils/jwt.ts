import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { jwk2pem } from 'pem-jwk';

import keys from '../../../config/keys.json';
import { env } from '../env/server';

interface JWKSMissingParams {
  kid: string;
}

type JWKSFromBlackboard = JsonWebKey & JWKSMissingParams;

const obtainKeyFromDevPortal = async (kid: string) => {
  const availableKeys = await fetch(env.DEVPORTAL_JWKS_URL);
  const keyset = await availableKeys.json();

  const matched = keyset.keys.filter((key: JWKSFromBlackboard) => key.kid === kid);
  if (!matched || matched.length === 0) throw new Error(`No key found for kid: ${kid}`);
  return matched[0];
};

export const validateJWT = async (token: string) => {
  try {
    const parts = token.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());

    const key = await obtainKeyFromDevPortal(header.kid);
    // Pin the algorithm to the one the platform's JWK actually declares (RS256 here).
    // Without this, jwt.verify() will also accept an attacker-supplied `alg: HS256`
    // token signed with this *public* key used as an HMAC secret — a classic
    // algorithm-confusion forgery.
    return jwt.verify(token, jwk2pem(key), { algorithms: ['RS256'] });
  } catch (e) {
    if (e instanceof JsonWebTokenError) {
      console.error('JWT verification failed:', e.message);
    } else if (e instanceof Error) {
      console.error('Unexpected error while parsing the JWT token:', e.message);
    }
    return null;
  }
};

export const signJWT = (payload: object): string | null => {
  const [privateKey] = keys.privateKeys.keys;
  try {
    return jwt.sign(payload, jwk2pem(privateKey), {
      keyid: privateKey.kid,
      algorithm: 'RS256',
    });
  } catch (error) {
    console.error('Error signing JWT:', error);
    return null;
  }
};
