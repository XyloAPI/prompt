import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2BucketByName, getR2Accounts } from "../src/db/queries";

async function main() {
  const b = await getR2BucketByName("cdn1");
  if (!b) {
    console.log("bucket not found");
    return;
  }
  const acc = (await getR2Accounts()).find((a) => a.id === b.accountId);
  if (!acc) {
    console.log("account not found");
    return;
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${acc.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: acc.accessKeyId,
      secretAccessKey: acc.secretAccessKey,
    },
  });
  const res = await client.send(new ListObjectsV2Command({ Bucket: b.name }));
  console.log(
    JSON.stringify(
      (res.Contents ?? []).map((o) => ({ key: o.Key, size: o.Size })),
      null,
      2
    )
  );
}

main().catch((e) => console.error("ERR", e.message));
