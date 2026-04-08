import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getPayrollS3Bucket, getPayrollS3Client } from './payrollS3Common';

export async function deletePayrollScreenshotObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  const client = getPayrollS3Client();
  const bucket = getPayrollS3Bucket();
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
