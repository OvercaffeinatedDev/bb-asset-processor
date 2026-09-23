'use server';

import { getKnownDeployments } from '@/lib/services/sessionService';
import { retrieveLTIToken } from '@/lib/utils/ltiAuth';

export interface DeploymentOption {
  deploymentId: string;
  siteUrl: string;
}

// Sourced from real session rows (see sessionService.getKnownDeployments) —
// there's no more admin-entered endpoint config: the URL shape is now known
// (https://<platform>/learn/api/v1/lti/external/eula/{deploymentId}/user) and
// the platform host comes from whichever deployment the admin picks.
export const listDeployments = async (): Promise<DeploymentOption[]> => {
  return getKnownDeployments();
};

export interface DeleteEulaConsentResult {
  success: boolean;
  status?: number;
  responseBody?: string;
  error?: string;
}

interface ResolvedDeployment {
  platformOrigin: string;
  token: string;
}

type ResolveResult =
  | { ok: true; deployment: ResolvedDeployment }
  | { ok: false; error: string };

// Shared by both delete variants below: turns a deploymentId into the
// platform origin + LTI access token needed to call it.
const resolveDeployment = async (deploymentId: string): Promise<ResolveResult> => {
  const deployments = await getKnownDeployments();
  const deployment = deployments.find((d) => d.deploymentId === deploymentId);
  if (!deployment) {
    return { ok: false, error: 'Unknown deployment — no session on record for it.' };
  }

  let platformOrigin: string;
  try {
    platformOrigin = new URL(deployment.siteUrl).origin;
  } catch {
    return {
      ok: false,
      error: `Stored site URL for this deployment isn't a valid URL: ${deployment.siteUrl}`,
    };
  }

  const site = new URL(platformOrigin).hostname;
  const token = await retrieveLTIToken(site);
  if (!token) {
    return { ok: false, error: `Unable to obtain an LTI access token for "${site}".` };
  }

  return { ok: true, deployment: { platformOrigin, token } };
};

// Internal admin tool, not part of the LTI launch flow — no session/nonce to
// check here.
export const deleteEulaConsent = async (
  deploymentId: string,
  userId: string
): Promise<DeleteEulaConsentResult> => {
  const trimmedUserId = userId.trim();
  if (!deploymentId || !trimmedUserId) {
    return { success: false, error: 'Deployment and user ID are required.' };
  }

  const resolved = await resolveDeployment(deploymentId);
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }
  const { platformOrigin, token } = resolved.deployment;

  const url = `${platformOrigin}/learn/api/v1/lti/external/eula/${deploymentId}/user`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // NOTE: the endpoint's shape doesn't encode the user, so it's assumed to
      // take one the same way the existing POST /user accept call does — as a
      // JSON body. Adjust here if Blackboard's actual contract differs.
      body: JSON.stringify({ userId: trimmedUserId }),
    });
    const responseBody = await res.text();
    return { success: res.ok, status: res.status, responseBody };
  } catch (e) {
    console.error('Error deleting EULA consent:', e);
    return { success: false, error: 'Network error while contacting the platform.' };
  }
};

// Wipes EULA consent for every user under a deployment — same endpoint family
// as deleteEulaConsent — same `/user` (singular) path, just no userId and no body.
export const deleteAllEulaConsents = async (
  deploymentId: string
): Promise<DeleteEulaConsentResult> => {
  if (!deploymentId) {
    return { success: false, error: 'Deployment is required.' };
  }

  const resolved = await resolveDeployment(deploymentId);
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }
  const { platformOrigin, token } = resolved.deployment;

  const url = `${platformOrigin}/learn/api/v1/lti/external/eula/${deploymentId}/user`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const responseBody = await res.text();
    return { success: res.ok, status: res.status, responseBody };
  } catch (e) {
    console.error('Error deleting all EULA consents:', e);
    return { success: false, error: 'Network error while contacting the platform.' };
  }
};
