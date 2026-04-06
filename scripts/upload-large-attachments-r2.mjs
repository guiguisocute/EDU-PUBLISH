import fs from 'node:fs/promises';
import nodeFs from 'node:fs';
import path from 'node:path';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { normalizePublicBaseUrl, siteUrlToR2Key } from './lib/r2-paths.mjs';

const ROOT = process.cwd();
const ATTACHMENTS_DIR = path.join(ROOT, 'content', 'attachments');

const thresholdMb = Number.parseFloat(process.env.ATTACHMENT_R2_THRESHOLD_MB || '20');
const thresholdBytes = Number.isFinite(thresholdMb) && thresholdMb > 0
  ? Math.floor(thresholdMb * 1024 * 1024)
  : 20 * 1024 * 1024;

const bucket = String(process.env.R2_BUCKET || '').trim();
const endpoint = String(process.env.R2_S3_ENDPOINT || '').trim();
const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
const publicBaseUrl = normalizePublicBaseUrl(process.env.R2_PUBLIC_BASE_URL);
const dryRun = String(process.env.R2_UPLOAD_DRY_RUN || '').trim() === '1';

if (endpoint) {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:') {
      console.error('[r2-upload] R2_S3_ENDPOINT must use HTTPS');
      process.exit(1);
    }
  } catch (e) {
    console.error(`[r2-upload] Invalid R2_S3_ENDPOINT URL: ${e.message}`);
    process.exit(1);
  }
}

const hasAllRequiredConfig = Boolean(bucket && endpoint && accessKeyId && secretAccessKey && publicBaseUrl);

const walkFiles = async (dir) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  }));

  return files.flat();
};

const attachmentFilePathToSiteUrl = (absolutePath) => {
  const relativePath = path.relative(ATTACHMENTS_DIR, absolutePath).split(path.sep).join('/');
  return `/attachments/${relativePath}`;
};

const mimeByExt = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const contentTypeFor = (filePath) => {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return mimeByExt[ext] || 'application/octet-stream';
};

const createClient = () => new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const objectExistsWithSameSize = async (client, key, size) => {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return Number(head.ContentLength || -1) === size;
  } catch {
    return false;
  }
};

const uploadFile = async (client, filePath, key, size) => {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: nodeFs.createReadStream(filePath),
      ContentType: contentTypeFor(filePath),
      CacheControl: 'public, max-age=31536000, immutable',
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await upload.done();
  console.log(`[r2] uploaded ${key} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
};

const main = async () => {
  if (!hasAllRequiredConfig) {
    console.log('[r2] skipped: missing config, requires R2_BUCKET, R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL');
    return;
  }

  const files = await walkFiles(ATTACHMENTS_DIR);
  const oversized = [];
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;
    if (stat.size <= thresholdBytes) continue;
    oversized.push({
      filePath,
      size: stat.size,
      key: siteUrlToR2Key(attachmentFilePathToSiteUrl(filePath)),
    });
  }

  if (oversized.length === 0) {
    console.log(`[r2] no files over ${thresholdMb} MB, nothing to upload`);
    return;
  }

  console.log(`[r2] found ${oversized.length} oversized attachments (>${thresholdMb} MB)`);
  const client = createClient();

  let uploaded = 0;
  let skipped = 0;

  for (const item of oversized) {
    const { filePath, size, key } = item;
    const exists = await objectExistsWithSameSize(client, key, size);
    if (exists) {
      skipped += 1;
      console.log(`[r2] skip existing ${key}`);
      continue;
    }

    if (dryRun) {
      uploaded += 1;
      console.log(`[r2] dry-run upload ${key} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
      continue;
    }

    await uploadFile(client, filePath, key, size);
    uploaded += 1;
  }

  console.log(`[r2] done: uploaded=${uploaded}, skipped=${skipped}, public_base=${publicBaseUrl}`);
};

main().catch((error) => {
  console.error('[r2] upload failed');
  console.error(error.message);
  process.exit(1);
});
