import { NextResponse } from 'next/dist/server/web/spec-extension/response';

import keys from '@/../config/keys.json';

export const GET = () => {
  return NextResponse.json({
    keys: [keys.publicKeys.keys[0]],
  });
};
