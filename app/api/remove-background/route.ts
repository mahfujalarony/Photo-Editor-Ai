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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);
const BACKEND_TIMEOUT_MS = 55_000;

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readBackendError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json();

      if (isRecord(payload)) {
        if (typeof payload.error === "string") return payload.error;
        if (typeof payload.detail === "string") return payload.detail;
      }

      return "Backend could not remove the background.";
    }

    const text = (await response.text()).trim();
    if (!text) return "Backend could not remove the background.";

    return text.length > 300 ? `${text.slice(0, 300)}...` : text;
  } catch {
    return "Backend could not remove the background.";
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!isUpload(image)) {
      return errorResponse("Please upload a valid image file.", 400);
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return errorResponse("Only JPG, PNG, and WebP images are supported.", 400);
    }

    if (image.size > MAX_FILE_SIZE) {
      return errorResponse("Image must be smaller than 10MB.", 400);
    }

    const backendFormData = new FormData();
    backendFormData.append("file", image, image.name || "upload.png");

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, BACKEND_TIMEOUT_MS);

    let backendResponse: Response;

    try {
      backendResponse = await fetch(`${BACKEND_URL}/remove-background`, {
        method: "POST",
        body: backendFormData,
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!backendResponse.ok) {
      return errorResponse(
        await readBackendError(backendResponse),
        backendResponse.status,
      );
    }

    const imageBuffer = Buffer.from(await backendResponse.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");

    const session = await getServerSession(authOptions);
    const key = createR2ObjectKeyForTool("remove-background", "png");
    const outputName = image.name 
      ? image.name.replace(/\.[^/.]+$/, "-bg-removed.png")
      : "background-removed.png";

    await uploadR2Object({
      key,
      body: imageBuffer,
      contentType: "image/png",
      metadata: {
        tool: "remove-background",
        filename: outputName,
      },
    });

    const db = await getDb();
    const result = await db.collection("generated_images").insertOne({
      tool: "remove-background",
      r2Key: key,
      publicUrl: getR2PublicUrl(key),
      mimeType: "image/png",
      size: imageBuffer.length,
      outputName,
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
      userName: session?.user?.name ?? null,
      createdAt: new Date(),
      downloadedAt: new Date(),
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      imageUrl: getR2PublicUrl(key) ?? `/api/admin/generated-images/${result.insertedId.toString()}/file`,
      image: `data:image/png;base64,${imageBase64}`,
      filename: outputName,
    });
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      return errorResponse(
        "Background removal took too long. Please try a smaller image.",
        504,
      );
    }

    return errorResponse(
      "Could not connect to the background removal backend. Make sure FastAPI is running.",
      502,
    );
  }
}
