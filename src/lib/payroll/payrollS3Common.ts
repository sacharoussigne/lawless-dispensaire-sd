import { S3Client } from '@aws-sdk/client-s3';

export function getPayrollS3Client() {
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

export function getPayrollS3Bucket(): string {
  const b = process.env.PAYROLL_S3_BUCKET ?? process.env.AWS_S3_BUCKET;
  if (!b) {
    throw new Error('PAYROLL_S3_BUCKET or AWS_S3_BUCKET is not set');
  }
  return b;
}
