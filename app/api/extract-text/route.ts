import { NextResponse } from "next/server";

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
