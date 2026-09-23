'use server';

import { getSession } from '@/lib/services/sessionService';

export interface SubmitUpdateConfigResult {
  success: boolean;
  error?: string;
}

// Reached via LtiAssetProcessorSettingsRequest — the instructor editing settings
// on an assignment that's already configured (as opposed to LtiDeepLinkingRequest,
// the initial setup in ../config). Unlike that flow there's no deep-linking
// response to complete here, so this only re-validates the session; the actual
// per-assignment settings (threshold, visibility, exclusions, …) have nowhere to
// persist yet — see the note in configPanel.tsx / itemConfigPanel.tsx.
export const submitUpdateConfig = async (state: string): Promise<SubmitUpdateConfigResult> => {
  if (!state) {
    return { success: false, error: 'Missing session state' };
  }

  const session = await getSession(state);
  if (!session) {
    return { success: false, error: 'Session not found or expired. Please relaunch the tool from Blackboard.' };
  }

  // TODO: once per-assignment settings have a home (a dedicated table, not
  // ltiSessions — see conversation history), write them here.
  return { success: true };
};
