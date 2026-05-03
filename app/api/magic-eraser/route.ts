import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  createR2ObjectKeyForTool,
  getR2PublicUrl,
  uploadR2Object,
} from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);
const BACKEND_TIMEOUT_MS = 55_000;

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const mask = formData.get("mask");

    if (!isUpload(image) || !isUpload(mask)) {
      return errorResponse("Please upload both an image and a mask.", 400);
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return errorResponse("Only JPG, PNG and WebP images are supported.", 400);
    }

    if (image.size > MAX_FILE_SIZE) {
      return errorResponse("Image must be smaller than 25MB.", 400);
    }

    const backendFormData = new FormData();
    backendFormData.append("image", image, image.name || "image.jpg");
    backendFormData.append("mask", mask, "mask.jpg");

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, BACKEND_TIMEOUT_MS);

    let backendResponse: Response;

    try {
      backendResponse = await fetch(`${BACKEND_URL}/magic-eraser`, {
        method: "POST",
        body: backendFormData,
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return errorResponse(
        errorText.includes("error") ? JSON.parse(errorText).error || "Backend failed" : "Backend failed to process image",
        backendResponse.status,
      );
    }

    const imageBuffer = Buffer.from(await backendResponse.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const resultImageUrl = `data:image/jpeg;base64,${imageBase64}`;

    // R2 Upload logic
    try {
        const session = await getServerSession(authOptions);
        let ext = "jpg";
        const key = createR2ObjectKeyForTool("magic-eraser", ext);
        const originalKey = createR2ObjectKeyForTool("magic-eraser-original", ext);
        
        const outputName = image.name ? image.name.replace(/\.[^/.]+$/, `-erased.${ext}`) : `erased.${ext}`;
        const inputName = image.name || `original.${ext}`;

        // Upload original image
        const originalBuffer = Buffer.from(await image.arrayBuffer());
        await uploadR2Object({
          key: originalKey,
          body: originalBuffer,
          contentType: image.type || "image/jpeg",
          metadata: {
              tool: "magic-eraser",
              filename: inputName,
          },
        });

        // Upload result image
        await uploadR2Object({
          key,
          body: imageBuffer,
          contentType: "image/jpeg",
          metadata: {
              tool: "magic-eraser",
              filename: outputName,
          },
        });

        const db = await getDb();
        await db.collection("generated_images").insertOne({
          tool: "magic-eraser",
          r2Key: key,
          publicUrl: getR2PublicUrl(key),
          originalR2Key: originalKey,
          originalPublicUrl: getR2PublicUrl(originalKey),
          mimeType: "image/jpeg",
          size: imageBuffer.length,
          outputName,
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
          userName: session?.user?.name ?? null,
          createdAt: new Date(),
          downloadedAt: new Date(),
        });
    } catch (e) {
        console.error("Failed saving magic-eraser to db/R2", e);
    }

    return NextResponse.json({
      image: resultImageUrl,
      filename: "erased-image.jpg",
    });
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      return errorResponse("Image processing took too long.", 504);
    }
    return errorResponse("Failed to connect to the backend server.", 500);
  }
}
