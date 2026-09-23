import { NextRequest, NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import path from 'node:path';

import { v4 as uuidv4 } from 'uuid';

import { env } from '@/lib/env/server';
import { createAssetSubmission, getAssetSubmission } from '@/lib/services/assetSubmissionService';
import { getSession, updateSession } from '@/lib/services/sessionService';
import { submitAssetReport } from '@/lib/utils/assetReport';
import { validateJWT } from '@/lib/utils/jwt';
import { retrieveLTIToken } from '@/lib/utils/ltiAuth';

const errorRedirect = (reason: string) =>
  NextResponse.redirect(
    new URL(`${env.APP_DOMAIN}/lti/assetprocessor/reports?error=${reason}`),
    303
  );

// KNOWN PLATFORM BUG (reported to Blackboard 2026-09-23): launches of these
// message types from Ultra arrive with a `nonce` claim that doesn't match the
// one issued for their `state` at /lti/login — `state` correctly resolves to a
// real session, but its stored nonce and the JWT's nonce are two unrelated
// values, consistent with Blackboard pairing the wrong login attempt's
// id_token with this state (confirmed for LtiAssetProcessorSettingsRequest and
// LtiEulaRequest same day; same pattern for LtiReportReviewRequest). Nonce
// validation is skipped for just these message types until Blackboard fixes
// it on their end — every other message type still enforces it.
const NONCE_CHECK_BYPASS_MESSAGE_TYPES = [
  'LtiAssetProcessorSettingsRequest',
  'LtiEulaRequest',
  'LtiReportReviewRequest',
];

// Strip characters that are awkward/unsafe in a filesystem path — platform
// filenames can contain spaces, commas, parens, etc. which are fine, but keep
// separators and control characters out.
const sanitizeFilename = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '_');

interface ProcessAssetParams {
  asset: AssetList;
  token: string;
  downloadsDir: string;
  deploymentId: string;
  submissionId: string;
  activityId?: string;
  resourceLinkId: string;
  contextId?: string;
  contextTitle?: string;
  userId: string;
  reportUrl?: string;
}

const processAsset = async ({
  asset,
  token,
  downloadsDir,
  deploymentId,
  submissionId,
  activityId,
  resourceLinkId,
  contextId,
  contextTitle,
  userId,
  reportUrl,
}: ProcessAssetParams) => {
  // Blackboard may resend the same notice — skip work we've already done rather
  // than re-downloading the file and generating a second score for it.
  // NOTE: this also means that if submitAssetReport() below fails after the row
  // is already saved, a resend of the same notice won't retry sending the
  // report either — it'll just skip here. Fine for now, worth revisiting if
  // that combination turns out to happen in practice.
  const existing = await getAssetSubmission(submissionId, asset.asset_id);
  if (existing) {
    console.warn(`Asset ${asset.asset_id} for submission ${submissionId} already processed, skipping`);
    return;
  }

  const res = await fetch(asset.url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: asset.content_type || '*/*',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download asset ${asset.asset_id}: ${res.status} ${await res.text()}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // The DB is remote but the file lands on whatever machine handled this
  // request — a uuid-prefixed filename is both a collision-proof name on disk
  // and the join key a DB row uses to find it back.
  const storedFilename = `${uuidv4()}__${sanitizeFilename(asset.filename)}`;
  await fs.writeFile(path.join(downloadsDir, storedFilename), buffer);

  // Placeholder: no real similarity analysis yet — assign a random score so
  // the instructor-facing report dashboard has something to display against
  // each submitted asset.
  const plagiarismScore = Math.floor(Math.random() * 101);
  // Placeholder too: nothing actually drives Under Review -> Posted yet, so
  // pick one at random purely so the report list/detail UI has both statuses
  // to show.
  const status = Math.random() < 0.5 ? 'posted' : 'under_review';

  await createAssetSubmission({
    deploymentId,
    submissionId,
    activityId,
    resourceLinkId,
    contextId,
    contextTitle,
    assetId: asset.asset_id,
    userId,
    title: asset.title,
    filename: asset.filename,
    storedFilename,
    contentType: asset.content_type,
    fileSize: buffer.length,
    checksum: asset.checksum,
    plagiarismScore,
    status,
    reportUrl,
  });

  console.warn(`Processed asset ${asset.asset_id} (${asset.filename}) -> score ${plagiarismScore}`);

  // Report back immediately after the asset is downloaded and saved — this is
  // what actually shows the score in Blackboard's gradebook.
  if (reportUrl) {
    await submitAssetReport({
      reportUrl,
      token,
      resourceLinkId,
      assetId: asset.asset_id,
      title: asset.title,
      plagiarismScore,
    });
    console.warn(`Reported score for asset ${asset.asset_id} to ${reportUrl}`);
  } else {
    console.warn(`No assetreport.report_url on this notice — skipping report for asset ${asset.asset_id}`);
  }
};

// Fired server-to-server whenever a student submits an asset for analysis.
// There's no preceding OIDC login for this — Blackboard calls it directly —
// so there's no `state`/`nonce` to validate against (skipped entirely, see
// the caller). For each asset in the notice: download it with an LTI access
// token, store it under ./fileDownloads, and record a row with a placeholder
// plagiarism score for the eventual reporting dashboard.
const handleSubmissionNotice = async (decodedJWT: LtiSubmissionNoticeRequest) => {
  const deploymentId = decodedJWT['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
  const submissionId =
    decodedJWT['https://purl.imsglobal.org/spec/lti-aip/claim/submission']?.submission_id;
  const activityId =
    decodedJWT['https://purl.imsglobal.org/spec/lti-aip/claim/activity']?.activity_id;
  // Needed later to submit the originality report back to Blackboard — its
  // assetreport payload keys on { resourceLinkId, assetId }.
  const resourceLinkId =
    decodedJWT['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.id;
  // Captured so the reports list (launched separately, at course level) can
  // filter "for this course" — the Report Manager placement's own
  // resource_link is different from the assignment's, so resourceLinkId alone
  // can't scope it.
  const contextId = decodedJWT['https://purl.imsglobal.org/spec/lti/claim/context']?.id;
  const contextTitle = decodedJWT['https://purl.imsglobal.org/spec/lti/claim/context']?.title;
  const userId = decodedJWT['https://purl.imsglobal.org/spec/lti/claim/for_user']?.user_id;
  const reportUrl = decodedJWT['https://purl.imsglobal.org/spec/lti-ap/claim/assetreport']?.report_url;
  const platformUrl = decodedJWT['https://purl.imsglobal.org/spec/lti/claim/tool_platform']?.url;
  const assets =
    decodedJWT['https://purl.imsglobal.org/spec/lti-ap/claim/assetservice']?.assets ?? [];

  if (!submissionId || !userId || !resourceLinkId) {
    console.error(
      'Submission notice missing submission_id, for_user.user_id, or resource_link.id — nothing to key rows on, skipping'
    );
    return NextResponse.json({ status: 'ok' });
  }

  if (assets.length === 0) {
    console.warn('Submission notice has no assets to process');
    return NextResponse.json({ status: 'ok' });
  }

  // `site` is only a local cache key for the client-credentials token (see
  // tokenService) — derive it from the platform that actually sent this
  // notice instead of hardcoding one test environment's hostname.
  const site = platformUrl ? new URL(platformUrl).hostname : 'unknown-platform';
  const token = await retrieveLTIToken(site);
  if (!token) {
    console.error('Unable to obtain an LTI access token for', site);
    return NextResponse.json({ status: 'error', error: 'tokenUnavailable' }, { status: 502 });
  }

  const downloadsDir = path.join(process.cwd(), 'fileDownloads');
  await fs.mkdir(downloadsDir, { recursive: true });

  const results = await Promise.allSettled(
    assets.map((asset) =>
      processAsset({
        asset,
        token,
        downloadsDir,
        deploymentId,
        submissionId,
        activityId,
        resourceLinkId,
        contextId,
        contextTitle,
        userId,
        reportUrl,
      })
    )
  );

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(
      `${failures.length}/${assets.length} asset(s) failed to process for submission ${submissionId}:`,
      failures.map((f) => f.reason)
    );
  }

  return NextResponse.json({
    status: 'ok',
    processed: assets.length - failures.length,
    failed: failures.length,
  });
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.formData();
    const idToken = body.get('id_token') as string;
    const requestState = body.get('state') as string | null;

    if (!idToken) {
      return errorRedirect('missingParams');
    }

    const decodedJWT = await validateJWT(idToken);
    if (!decodedJWT) {
      return errorRedirect('invalidJWT');
    }

    const messageType = (decodedJWT as { [key: string]: unknown })[
      'https://purl.imsglobal.org/spec/lti/claim/message_type'
    ];

    // Submission notices are server-to-server and were never preceded by an
    // OIDC login through /lti/login — there's no `state`/`nonce` on record for
    // them, so they're handled before (and instead of) the session/nonce checks
    // below, which only apply to browser-driven, user-initiated launches.
    if (messageType === 'LtiSubmissionNotice') {
      return handleSubmissionNotice(decodedJWT as LtiSubmissionNoticeRequest);
    }

    if (!requestState) {
      return errorRedirect('missingParams');
    }

    const typedJWT = decodedJWT as DeepLinkingRequest;

    // Validate that state maps to a real session and nonce matches — this is
    // what actually prevents a captured/replayed id_token from being accepted
    // on a second request against the same state.
    const session = await getSession(requestState);
    if (!session) {
      return errorRedirect('sessionNotFound');
    }

    if (
      !NONCE_CHECK_BYPASS_MESSAGE_TYPES.includes(messageType as string) &&
      session.nonce !== typedJWT.nonce
    ) {
      return errorRedirect('nonceMismatch');
    }

    const platformData =
      typedJWT['https://purl.imsglobal.org/spec/lti/claim/tool_platform'];

    const baseUpdate = {
      sub: typedJWT.sub,
      aud: typedJWT.aud,
      siteUrl: platformData.url,
      jwtData: typedJWT,
    };

    if (
      messageType === 'LtiDeepLinkingRequest' &&
      typedJWT[
        'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'
      ]['accept_types']?.includes('ltiAssetProcessor')
    ) {
      const dlSettings =
        typedJWT[
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'
        ];

      await updateSession(requestState, {
        ...baseUpdate,
        deepLinkingReturnURL: dlSettings.deep_link_return_url,
        deepLinkingData: dlSettings.data,
      });

      return NextResponse.redirect(
        new URL(
          `${env.APP_DOMAIN}/lti/assetprocessor/config?state=${requestState}&cmd=newConfig`
        ),
        303
      );
    }

    if (messageType === 'LtiAssetProcessorSettingsRequest') {
      await updateSession(requestState, baseUpdate);

      return NextResponse.redirect(
        new URL(
          `${env.APP_DOMAIN}/lti/assetprocessor/updateConfig?state=${requestState}&cmd=updateConfig`
        ),
        303
      );
    }

    if (messageType === 'LtiEulaRequest') {
      await updateSession(requestState, baseUpdate);

      const eulaUrl = encodeURIComponent(
        typedJWT['https://purl.imsglobal.org/spec/lti/claim/eulaservice'].url
      );
      return NextResponse.redirect(
        new URL(
          `${env.APP_DOMAIN}/lti/assetprocessor/eula?state=${requestState}&returnUrl=${eulaUrl}`
        ),
        303
      );
    }

    if (messageType === 'LtiReportReviewRequest') {
      await updateSession(requestState, baseUpdate);

      const assetId = typedJWT['https://purl.imsglobal.org/spec/lti/claim/asset']?.id;
      const reviewSubmissionId =
        typedJWT['https://purl.imsglobal.org/spec/lti-aip/claim/submission']?.submission_id;

      if (!assetId || !reviewSubmissionId) {
        return errorRedirect('missingParams');
      }

      const assetSubmission = await getAssetSubmission(reviewSubmissionId, assetId);
      if (!assetSubmission) {
        return errorRedirect('reportNotFound');
      }

      return NextResponse.redirect(
        new URL(`${env.APP_DOMAIN}/lti/assetprocessor/reports/${assetSubmission.id}`),
        303
      );
    }

    // Report Manager — the teacher-facing reports list. A standard resource
    // link launch, distinguished from any other tool placement only by its
    // custom.reportManager flag (see reportView.json's sibling sample and
    // note in this repo). Nonce is fully enforced here, unlike the bugged
    // message types above.
    if (
      messageType === 'LtiResourceLinkRequest' &&
      typedJWT['https://purl.imsglobal.org/spec/lti/claim/custom']?.reportManager === 'true'
    ) {
      await updateSession(requestState, baseUpdate);

      return NextResponse.redirect(
        new URL(`${env.APP_DOMAIN}/lti/assetprocessor/reports?state=${requestState}`),
        303
      );
    }

    await updateSession(requestState, baseUpdate);
    return errorRedirect('unknownMessageType');
  } catch (e) {
    console.error('Unhandled error in launch handler:', e);
    return errorRedirect('serverError');
  }
};
