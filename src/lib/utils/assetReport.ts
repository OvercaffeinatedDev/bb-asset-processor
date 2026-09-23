// Posts an originality report for one asset back to Blackboard's
// assetreport.report_url (see reportSubmission.json / response.json for the
// claim, score.json for the payload shape this is modeled on).
interface AssetReportPayload {
  resourceLinkId: string;
  assetId: string;
  type: string;
  timestamp: string;
  title: string;
  scoreGiven: string;
  scoreMaximum: string;
  priority: string;
  processingProgress: string;
  indicationColor: string;
}

// Simple traffic-light banding over the 0-100 placeholder score — swap for
// whatever the real analysis wants to communicate once one exists. Exported
// so the report detail UI can reuse the exact same colors it reports to
// Blackboard.
export const getIndicationColor = (score: number): string => {
  if (score <= 30) return '#22C55E'; // green — low similarity
  if (score <= 70) return '#F59E0B'; // amber — moderate similarity
  return '#EF4444'; // red — high similarity
};

interface SubmitAssetReportParams {
  reportUrl: string;
  token: string;
  resourceLinkId: string;
  assetId: string;
  title: string;
  plagiarismScore: number;
}

export const submitAssetReport = async ({
  reportUrl,
  token,
  resourceLinkId,
  assetId,
  title,
  plagiarismScore,
}: SubmitAssetReportParams): Promise<void> => {
  // type/priority/processingProgress/scoreMaximum are fixed per the payload
  // guide — every field is sent as a string, including the numeric-looking
  // ones.
  const payload: AssetReportPayload = {
    resourceLinkId,
    assetId,
    type: 'originality',
    timestamp: new Date().toISOString(),
    title,
    scoreGiven: String(plagiarismScore),
    scoreMaximum: '100',
    priority: '5',
    processingProgress: 'Processed',
    indicationColor: getIndicationColor(plagiarismScore),
  };

  const res = await fetch(reportUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to submit asset report for ${assetId}: ${res.status} ${await res.text()}`
    );
  }
};
