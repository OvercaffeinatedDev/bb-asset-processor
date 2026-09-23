import { generateKeyPairSync, randomUUID } from 'crypto';

const kid = randomUUID();

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const privateJwk = {
  ...privateKey.export({ format: 'jwk' }),
  kid,
  use: 'sig',
  alg: 'RS256',
};
const publicJwk = {
  ...publicKey.export({ format: 'jwk' }),
  kid,
  use: 'sig',
  alg: 'RS256',
};

const keys = {
  publicKeys: {
    keys: [publicJwk],
  },
  privateKeys: {
    keys: [privateJwk],
  },
};

console.log(JSON.stringify(keys, null, 2));
