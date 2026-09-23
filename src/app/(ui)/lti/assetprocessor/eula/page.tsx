import { getSession } from '@/lib/services/sessionService';

import { dmSans, spaceMono } from '../config/fonts';
import styles from './eula.module.css';
import EulaViewer from './eulaViewer';

interface RequestParams {
  returnUrl?: string;
  state?: string;
}

const ErrorPanel = ({ message }: { message: string }) => (
  <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
    <div className={styles.frame}>
      <div className={styles.errorBody}>
        <h1 className={styles.errorTitle}>Ooops!</h1>
        <p className={styles.errorText}>{message}</p>
      </div>
    </div>
  </div>
);

const EulaHandler = async ({
  searchParams,
}: {
  searchParams: Promise<RequestParams>;
}) => {
  const params = await searchParams;
  const requestState = params.state;
  const eulaUrl = params.returnUrl;

  if (!requestState || !eulaUrl) {
    return (
      <ErrorPanel message="Unable to load the EULA. Please contact the administrator for more information." />
    );
  }

  const session = await getSession(requestState);
  if (!session) {
    return (
      <ErrorPanel message="Session not found or expired. Please relaunch the tool from Blackboard." />
    );
  }

  const platformOrigin = session.siteUrl ? new URL(session.siteUrl).origin : null;

  return (
    <EulaViewer
      returnUrl={eulaUrl}
      callState={requestState}
      platformOrigin={platformOrigin}
    />
  );
};

export default EulaHandler;
