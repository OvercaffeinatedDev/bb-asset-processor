import { getSession } from '@/lib/services/sessionService';
import { INVALID_SESSION_STATES } from '@/lib/utils/consts';

import { dmSans, spaceMono } from '../config/fonts';
import ItemConfigPanel from './itemConfigPanel';
import styles from './updateConfig.module.css';

interface RequestParams {
  state?: string;
  cmd?: string;
}

const ErrorPanel = ({ title, message }: { title: string; message: string }) => (
  <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
    <div className={styles.frame}>
      <div className={styles.body}>
        <h1 className={styles.errorTitle}>{title}</h1>
        <p className={styles.errorText}>{message}</p>
      </div>
    </div>
  </div>
);

// Reached from the launch handler's LtiAssetProcessorSettingsRequest branch — the
// instructor re-opening settings on an assignment that's already configured, as
// opposed to ../config (LtiDeepLinkingRequest, first-time setup). Same session/
// state validation as that route; nonce was already checked once at launch time
// when the id_token was decoded, so it isn't re-checked per page view here.
const ChangeConfig = async ({
  searchParams,
}: {
  searchParams: Promise<RequestParams>;
}) => {
  const params = await searchParams;

  if (!params.state || INVALID_SESSION_STATES.includes(params.state)) {
    return (
      <ErrorPanel
        title="Ooops!"
        message="The request was received but could not be processed. Please try again from Blackboard."
      />
    );
  }

  const session = await getSession(params.state);
  if (!session) {
    return (
      <ErrorPanel
        title="Session not found"
        message="This session has expired or is invalid. Please relaunch the tool from Blackboard."
      />
    );
  }

  const platformOrigin = session.siteUrl ? new URL(session.siteUrl).origin : null;

  return <ItemConfigPanel state={params.state} platformOrigin={platformOrigin} />;
};

export default ChangeConfig;
