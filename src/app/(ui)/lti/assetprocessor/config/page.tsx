import { getSession } from '@/lib/services/sessionService';
import { INVALID_SESSION_STATES } from '@/lib/utils/consts';

import ConfigPanel from './configPanel';
import styles from './config.module.css';
import { dmSans, spaceMono } from './fonts';

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

const ConfigAssetProcessor = async ({
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
  if (!session || !session.deepLinkingReturnURL) {
    return (
      <ErrorPanel
        title="Session not found"
        message="This session has expired or is invalid. Please relaunch the tool from Blackboard."
      />
    );
  }

  const platformOrigin = session.siteUrl ? new URL(session.siteUrl).origin : null;

  return <ConfigPanel state={params.state} platformOrigin={platformOrigin} />;
};

export default ConfigAssetProcessor;
