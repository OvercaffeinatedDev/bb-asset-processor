export const LTIAUTHTYPES = {
  EULA: 'eula',
  REPORT: 'reports',
};

// Error codes an asset-processor UI route may be reached with — none of them
// describe a session there's anything to act on.
export const INVALID_SESSION_STATES = [
  'invalidConfigOperation',
  'invalidJWT',
  'sessionNotFound',
  'nonceMismatch',
];
