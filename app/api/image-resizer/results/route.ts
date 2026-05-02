import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { createR2ObjectKey, getR2PublicUrl, uploadR2Object } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";

  return "jpg";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("file");

    if (!isUpload(image)) {
      return errorResponse("Please upload a valid generated image.", 400);
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return errorResponse("Only JPG, PNG, and WebP generated images are supported.", 400);
    }

    if (image.size > MAX_FILE_SIZE) {
      return errorResponse("Generated image must be smaller than 25MB.", 400);
    }

    const session = await getServerSession(authOptions);
    const buffer = Buffer.from(await image.arrayBuffer());
    const key = createR2ObjectKey(extensionFromMime(image.type));
    const originalName = getString(formData, "originalName");
    const outputName = getString(formData, "outputName") || image.name;
    const createdAt = new Date();

    await uploadR2Object({
      key,
      body: buffer,
      contentType: image.type,
      metadata: {
        tool: "image-resizer",
        filename: outputName,
      },
    });

    const db = await getDb();
    const result = await db.collection("generated_images").insertOne({
      tool: "image-resizer",
      r2Key: key,
      publicUrl: getR2PublicUrl(key),
      mimeType: image.type,
      size: image.size,
      originalName,
      outputName,
      originalSize: getNumber(formData, "originalSize"),
      sourceSize: getNumber(formData, "sourceSize"),
      targetLabel: getString(formData, "targetLabel"),
      targetBytes: getNumber(formData, "targetBytes"),
      width: getNumber(formData, "width"),
      height: getNumber(formData, "height"),
      cropApplied: getString(formData, "cropApplied") === "true",
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
      userName: session?.user?.name ?? null,
      createdAt,
      downloadedAt: createdAt,
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      imageUrl:
        getR2PublicUrl(key) ??
        `/api/admin/generated-images/${result.insertedId.toString()}/file`,
    });
  } catch (caughtError) {
    return errorResponse(
      caughtError instanceof Error
        ? caughtError.message
        : "Could not save generated image.",
      500,
    );
  }
}
