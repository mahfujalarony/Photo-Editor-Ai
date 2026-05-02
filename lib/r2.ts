import { createHash, createHmac, randomUUID } from "crypto";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicUrl?: string;
};

type UploadObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string | undefined>;
};

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

function getR2Config(): R2Config {
  const accountId = firstEnv(
    "R2_ACCOUNT_ID",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "ClOUDflare_ACCOUNT_ID",
  );
  const accessKeyId = firstEnv(
    "R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_ACCESS_KEY_ID",
    "ClOUDFLRE_ACCESS_KEY_ID",
  );
  const secretAccessKey = firstEnv(
    "R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_SECRET_ACCESS_KEY",
  );
  const bucket = firstEnv(
    "R2_BUCKET",
    "R2_BUCKET_NAME",
    "CLOUDFLARE_R2_BUCKET",
    "CLOUDFLARE_BUCKET",
    "CLOUDFLRE_DEFAULT",
  );
  const explicitEndpoint = firstEnv("R2_ENDPOINT", "CLOUDFLARE_R2_ENDPOINT");
  const endpoint = explicitEndpoint
    ? normalizeEndpoint(explicitEndpoint)
    : accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : "";
  const publicUrl = firstEnv("R2_PUBLIC_URL", "CLOUDFLARE_R2_PUBLIC_URL");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID, plus R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicUrl: publicUrl ? normalizeEndpoint(publicUrl) : undefined,
  };
}

function hashHex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, "auto");
  const dateRegionServiceKey = hmac(dateRegionKey, "s3");

  return hmac(dateRegionServiceKey, "aws4_request");
}

function encodeKey(key: string) {
  return trimSlashes(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function safeMetadataValue(value: string | undefined) {
  if (!value) return undefined;

  return value.replace(/[^\x20-\x7E]/g, "").slice(0, 512);
}

function signedHeadersFor(
  method: "GET" | "PUT",
  url: URL,
  payloadHash: string,
  extraHeaders: Record<string, string>,
) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };
  const sortedHeaderNames = Object.keys(headers)
    .map((header) => header.toLowerCase())
    .sort();
  const canonicalHeaders = sortedHeaderNames
    .map((header) => `${header}:${headers[header].trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const signedHeaders = sortedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    url.pathname,
    url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const config = getR2Config();
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");
  const signature = hmacHex(
    getSigningKey(config.secretAccessKey, dateStamp),
    stringToSign,
  );

  return {
    ...headers,
    authorization: [
      "AWS4-HMAC-SHA256",
      `Credential=${config.accessKeyId}/${credentialScope},`,
      `SignedHeaders=${signedHeaders},`,
      `Signature=${signature}`,
    ].join(" "),
  };
}

function objectUrl(key: string) {
  const config = getR2Config();
  const url = new URL(`${config.endpoint}/${config.bucket}/${encodeKey(key)}`);

  return { config, url };
}

function normalizeToolPrefix(tool: string) {
  const normalized = trimSlashes(tool)
    .replace(/[^a-z0-9/_-]/gi, "")
    .replace(/\/+/g, "/");

  return normalized || "uploads";
}

export function createR2ObjectKeyForTool(tool: string, extension: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const cleanExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const prefix = normalizeToolPrefix(tool);

  return `${prefix}/${year}/${month}/${day}/${randomUUID()}.${cleanExtension}`;
}

export function createR2ObjectKey(extension: string) {
  return createR2ObjectKeyForTool("image-resizer", extension);
}

export function getR2PublicUrl(key: string) {
  const config = getR2Config();

  if (!config.publicUrl) return undefined;

  return `${config.publicUrl}/${encodeKey(key)}`;
}

export async function uploadR2Object({
  key,
  body,
  contentType,
  metadata,
}: UploadObjectInput) {
  const { url } = objectUrl(key);
  const payloadHash = hashHex(body);
  const requestBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(requestBody).set(body);
  const extraHeaders: Record<string, string> = {
    "content-type": contentType,
  };

  for (const [name, value] of Object.entries(metadata ?? {})) {
    const safeValue = safeMetadataValue(value);
    if (safeValue) extraHeaders[`x-amz-meta-${name.toLowerCase()}`] = safeValue;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: signedHeadersFor("PUT", url, payloadHash, extraHeaders),
    body: requestBody,
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(
      `R2 upload failed with ${response.status}${message ? `: ${message}` : ""}`,
    );
  }
}

export async function fetchR2Object(key: string) {
  const { url } = objectUrl(key);
  const payloadHash = hashHex("");
  const response = await fetch(url, {
    method: "GET",
    headers: signedHeadersFor("GET", url, payloadHash, {}),
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(
      `R2 fetch failed with ${response.status}${message ? `: ${message}` : ""}`,
    );
  }

  return response;
}
