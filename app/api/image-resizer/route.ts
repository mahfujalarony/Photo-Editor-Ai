import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8000;
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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parsePositiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

async function readBackendError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json();

      if (
        payload &&
        typeof payload === "object" &&
        "detail" in payload &&
        typeof payload.detail === "string"
      ) {
        return payload.detail;
      }
    }

    const text = (await response.text()).trim();
    if (!text) return "Image processing failed.";

    return text.length > 300 ? `${text.slice(0, 300)}...` : text;
  } catch {
    return "Image processing failed.";
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("file");
    const mode = getString(formData, "mode");

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

    let endpoint = "";

    if (mode === "dimensions") {
      const width = parsePositiveInteger(getString(formData, "width"));
      const height = parsePositiveInteger(getString(formData, "height"));

      if (!width || !height) {
        return errorResponse("Width and height must be positive numbers.", 400);
      }

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        return errorResponse(
          `Width and height must be ${MAX_IMAGE_DIMENSION}px or smaller.`,
          400,
        );
      }

      backendFormData.append("width", width.toString());
      backendFormData.append("height", height.toString());
      endpoint = "/resize-image";
    } else if (mode === "filesize") {
      const targetKb = parsePositiveInteger(getString(formData, "target_kb"));

      if (!targetKb) {
        return errorResponse("Target size must be a positive number.", 400);
      }

      if (targetKb > MAX_FILE_SIZE / 1024) {
        return errorResponse("Target size must be 10MB or smaller.", 400);
      }

      backendFormData.append("target_kb", targetKb.toString());
      endpoint = "/compress-image";
    } else {
      return errorResponse("Choose resize by dimensions or file size.", 400);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, BACKEND_TIMEOUT_MS);

    let backendResponse: Response;

    try {
      backendResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
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

    const contentType = backendResponse.headers.get("content-type") ?? "image/jpeg";
    const disposition =
      backendResponse.headers.get("content-disposition") ??
      'attachment; filename="lumina-ai-processed.jpg"';

    return new Response(await backendResponse.arrayBuffer(), {
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
      },
    });
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.name === "AbortError") {
      return errorResponse("Image processing took too long. Try a smaller image.", 504);
    }

    return errorResponse(
      "Could not connect to the image processing backend. Make sure FastAPI is running.",
      502,
    );
  }
}
