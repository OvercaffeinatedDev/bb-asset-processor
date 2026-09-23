import { NextRequest, NextResponse } from 'next/server';

import fs from 'node:fs/promises';
import path from 'node:path';

import { getAssetSubmissionById } from '@/lib/services/assetSubmissionService';

// Streams a downloaded asset back out so the report detail page can embed it
// (PDF viewer, <img>, etc.) or offer it as a download. The file only exists on
// whichever machine actually ran the LtiSubmissionNotice download — the DB
// row is the pointer, this route is what turns that pointer back into bytes.
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const submission = await getAssetSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'fileDownloads', submission.storedFilename);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (e) {
    console.error(`File missing on disk for asset submission ${id}:`, e);
    return NextResponse.json(
      { error: 'File not available on this server (wrong machine, or it was cleaned up)' },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': submission.contentType || 'application/octet-stream',
      // `inline` lets the browser render it (PDF viewer, image, …) instead of
      // forcing a download; * gives a UTF-8-safe filename per RFC 5987.
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(submission.filename)}`,
      'Content-Length': String(fileBuffer.length),
    },
  });
};
