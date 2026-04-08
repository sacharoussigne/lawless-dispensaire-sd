import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getPayrollS3Bucket, getPayrollS3Client } from './payrollS3Common';

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
  const client = getPayrollS3Client();
  const bucket = getPayrollS3Bucket();
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
