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

    return NextResponse.json({
      image: `data:image/png;base64,${imageBase64}`,
      filename: "background-removed.png",
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
