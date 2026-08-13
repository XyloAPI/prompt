import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { R2Account } from "@/db/schema";

function getClient(account: R2Account): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${account.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export function publicUrl(bucketPublicUrl: string | null | undefined, key: string): string {
  const base = (bucketPublicUrl ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function createPresignedUploadUrl(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(getClient(opts.account), command, {
    expiresIn: opts.expiresIn ?? 900,
    signableHeaders: new Set(["content-type"]),
  });
}

export async function createPresignedDownloadUrl(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.key,
  });
  return getSignedUrl(getClient(opts.account), command, {
    expiresIn: opts.expiresIn ?? 3600,
  });
}

export async function getObjectBuffer(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
}): Promise<{ bytes: Buffer; contentType?: string }> {
  const command = new GetObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.key,
  });
  const res = await getClient(opts.account).send(command);
  const body = res.Body;
  const bytes = body ? Buffer.from(await body.transformToByteArray()) : Buffer.alloc(0);
  return { bytes, contentType: res.ContentType };
}

export async function getObjectSize(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
}): Promise<number> {
  const command = new HeadObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.key,
  });
  const res = await getClient(opts.account).send(command);
  return res.ContentLength ?? 0;
}

export async function deleteR2Object(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
}): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: opts.bucketName,
    Key: opts.key,
  });
  await getClient(opts.account).send(command);
}

export async function computeBucketUsage(opts: {
  account: R2Account;
  bucketName: string;
}): Promise<number> {
  const client = getClient(opts.account);
  let total = 0;
  let continuationToken: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: opts.bucketName,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      total += obj.Size ?? 0;
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return total;
}