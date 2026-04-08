import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function getS3Client() {
  const region = process.env.AWS_REGION ?? 'eu-west-3';
  return new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

function getBucket(): string {
  const b = process.env.PAYROLL_S3_BUCKET ?? process.env.AWS_S3_BUCKET;
  if (!b) {
    throw new Error('PAYROLL_S3_BUCKET or AWS_S3_BUCKET is not set');
  }
  return b;
}

const extFromMime: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function uploadPayrollScreenshots(
  reportId: string,
  files: { buffer: Buffer; contentType: string }[],
): Promise<string[]> {
  const client = getS3Client();
  const bucket = getBucket();
  const keys: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const ext = extFromMime[files[i].contentType] ?? '.png';
    const key = `payroll-reports/${reportId}/${i}${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: files[i].buffer,
        ContentType: files[i].contentType,
      }),
    );
    keys.push(key);
  }

  return keys;
}

export async function deletePayrollScreenshotObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  const client = getS3Client();
  const bucket = getBucket();
  const out = await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );
  if (out.Errors && out.Errors.length > 0) {
    const msg = out.Errors.map((e) => `${e.Key}: ${e.Message ?? 'unknown'}`).join('; ');
    throw new Error(`S3 delete failed: ${msg}`);
  }
}
