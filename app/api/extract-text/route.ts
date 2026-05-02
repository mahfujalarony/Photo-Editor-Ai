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
  return NextResponse.json({ success: false, error }, { status });
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

      return "Backend could not extract text from this image.";
    }

    const text = (await response.text()).trim();
    if (!text) return "Backend could not extract text from this image.";

    return text.length > 300 ? `${text.slice(0, 300)}...` : text;
  } catch {
    return "Backend could not extract text from this image.";
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("file");

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
    backendFormData.append("file", image, image.name || "image.jpg");

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, BACKEND_TIMEOUT_MS);

    let backendResponse: Response;

    try {
      backendResponse = await fetch(`${BACKEND_URL}/extract-text`, {
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

    const payload: unknown = await backendResponse.json();

    if (!isRecord(payload)) {
      return errorResponse("Backend returned an invalid text extraction response.", 502);
    }

    // Save the image and the extracted text to R2 and Database
    if (payload.success && typeof payload.text === "string") {
      try {
        const session = await getServerSession(authOptions);
        const imageBuffer = Buffer.from(await image.arrayBuffer());
        
        let ext = "jpg";
        if (image.type === "image/png") ext = "png";
        if (image.type === "image/webp") ext = "webp";

        const key = createR2ObjectKeyForTool("image-to-text", ext);
        const outputName = image.name || `image-to-text.${ext}`;

        await uploadR2Object({
          key,
          body: imageBuffer,
          contentType: image.type,
          metadata: {
            tool: "image-to-text",
            filename: outputName,
          },
        });

        const db = await getDb();
        await db.collection("generated_images").insertOne({
          tool: "image-to-text",
          r2Key: key,
          publicUrl: getR2PublicUrl(key),
          mimeType: image.type,
          size: image.size,
          outputName,
          extractedText: payload.text, // Saving extracted text
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
          userName: session?.user?.name ?? null,
          createdAt: new Date(),
          downloadedAt: new Date(),
        });
      } catch (saveError) {
        // We log the error but don't block the actual extraction response
        console.error("Failed to save image to text record:", saveError);
      }
    }

    return NextResponse.json(payload);
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      return errorResponse("Text extraction took too long. Try a smaller image.", 504);
    }

    return errorResponse(
      "Could not connect to the text extraction backend. Make sure FastAPI is running.",
      502,
    );
  }
}
