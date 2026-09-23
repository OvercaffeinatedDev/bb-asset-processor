import { listDeployments } from './actions';
import EulaAdminPanel from './eulaAdminPanel';

// Reachable directly at /admin/eula — not part of the LTI flow.
const EulaAdminPage = async () => {
  const deployments = await listDeployments();

  return <EulaAdminPanel deployments={deployments} />;
};

export default EulaAdminPage;
