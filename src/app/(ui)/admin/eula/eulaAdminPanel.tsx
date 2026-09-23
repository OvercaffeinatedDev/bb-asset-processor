'use client';

import { useState } from 'react';

import { Button, Checkbox, Divider, Input, Select, SelectItem } from '@heroui/react';

import { deleteAllEulaConsents, deleteEulaConsent, type DeploymentOption } from './actions';

interface EulaAdminPanelProps {
  deployments: DeploymentOption[];
}

type ActionResult = { type: 'success' | 'error'; text: string };

const describeResult = (res: {
  success: boolean;
  status?: number;
  responseBody?: string;
  error?: string;
}): ActionResult =>
  res.success
    ? {
        type: 'success',
        text: `Deleted (HTTP ${res.status}).${res.responseBody ? ` Response: ${res.responseBody}` : ''}`,
      }
    : {
        type: 'error',
        text:
          res.error ??
          `Platform rejected the request (HTTP ${res.status}).${res.responseBody ? ` ${res.responseBody}` : ''}`,
      };

// Internal, unauthenticated tool — reachable at /admin/eula, outside the LTI
// launch flow. Fires the DELETE that revokes EULA acceptance on Blackboard's
// side, for a deployment we've actually seen a launch from — either one user
// at a time, or every user under the deployment.
const EulaAdminPanel = ({ deployments }: EulaAdminPanelProps) => {
  const [deploymentId, setDeploymentId] = useState(deployments[0]?.deploymentId ?? '');

  const [userId, setUserId] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<ActionResult | null>(null);

  const selectedDeployment = deployments.find((d) => d.deploymentId === deploymentId);

  const handleDelete = async () => {
    setPending(true);
    setResult(null);
    try {
      const res = await deleteEulaConsent(deploymentId, userId);
      setResult(describeResult(res));
    } catch {
      setResult({ type: 'error', text: 'A network error occurred.' });
    } finally {
      setPending(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedDeployment) return;
    const confirmed = window.confirm(
      `This deletes EULA consent for EVERY user under deployment ${selectedDeployment.deploymentId} (${new URL(selectedDeployment.siteUrl).hostname}). This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setBulkPending(true);
    setBulkResult(null);
    try {
      const res = await deleteAllEulaConsents(deploymentId);
      setBulkResult(describeResult(res));
    } catch {
      setBulkResult({ type: 'error', text: 'A network error occurred.' });
    } finally {
      setBulkPending(false);
      setBulkConfirmed(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">EULA Consent Admin</h1>
        <p className="text-sm text-default-500">
          Internal tool, not part of the LTI launch flow — no authentication, don&apos;t expose this
          publicly.
        </p>
      </div>

      {deployments.length === 0 ? (
        <p className="text-sm text-warning-600">
          No deployments on record yet — launch the tool from Blackboard at least once, then come
          back here.
        </p>
      ) : (
        <>
          <Select
            label="Deployment"
            description="Sourced from sessions we've actually seen — picks each deployment's most recent known platform URL."
            selectedKeys={deploymentId ? [deploymentId] : []}
            onSelectionChange={(keys) => {
              const [first] = Array.from(keys as Set<string>);
              if (first) setDeploymentId(first);
            }}
          >
            {deployments.map((d) => (
              <SelectItem key={d.deploymentId} textValue={`${new URL(d.siteUrl).hostname} — ${d.deploymentId}`}>
                {new URL(d.siteUrl).hostname} — {d.deploymentId}
              </SelectItem>
            ))}
          </Select>

          {/* Single user — leaves an existing user's consent untouched otherwise, handy for testing. */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-default-600">Delete for one user</h2>
            {selectedDeployment && (
              <p className="break-words text-xs text-default-500">
                DELETE {new URL(selectedDeployment.siteUrl).origin}/learn/api/v1/lti/external/eula/
                {selectedDeployment.deploymentId}/user
              </p>
            )}
            <Input
              label="Blackboard user ID"
              placeholder="b317a895e7f64796a3fd01bb18a61d65"
              value={userId}
              onValueChange={setUserId}
            />
            {result && (
              <p className={result.type === 'error' ? 'text-sm text-danger break-words' : 'text-sm text-success break-words'}>
                {result.text}
              </p>
            )}
            <Button
              color="danger"
              variant="flat"
              onPress={handleDelete}
              isLoading={pending}
              isDisabled={!deploymentId || !userId.trim()}
            >
              Delete for this user
            </Button>
          </div>

          <Divider />

          {/* All users — no userId sent at all, wipes every user under the deployment. */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-danger">Delete for ALL users</h2>
            {selectedDeployment && (
              <p className="break-words text-xs text-default-500">
                DELETE {new URL(selectedDeployment.siteUrl).origin}/learn/api/v1/lti/external/eula/
                {selectedDeployment.deploymentId}/user (no user ID — wipes everyone)
              </p>
            )}
            <Checkbox isSelected={bulkConfirmed} onValueChange={setBulkConfirmed}>
              I understand this deletes EULA consent for every user under this deployment.
            </Checkbox>
            {bulkResult && (
              <p className={bulkResult.type === 'error' ? 'text-sm text-danger break-words' : 'text-sm text-success break-words'}>
                {bulkResult.text}
              </p>
            )}
            <Button
              color="danger"
              onPress={handleDeleteAll}
              isLoading={bulkPending}
              isDisabled={!deploymentId || !bulkConfirmed}
            >
              Delete for all users
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default EulaAdminPanel;
