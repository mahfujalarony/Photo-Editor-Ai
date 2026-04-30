import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

function isUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!isUpload(image)) {
    return NextResponse.json(
      { error: "Please upload a valid image file." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(image.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, and WebP images are supported." },
      { status: 400 },
    );
  }

  if (image.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image must be smaller than 10MB." },
      { status: 400 },
    );
  }

  const backendFormData = new FormData();
  backendFormData.append("file", image, image.name || "upload.png");

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/remove-background`, {
      method: "POST",
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            (await backendResponse.text()) ||
            "Backend could not remove the background.",
        },
        { status: backendResponse.status },
      );
    }

    const imageBuffer = Buffer.from(await backendResponse.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");

    return NextResponse.json({
      image: `data:image/png;base64,${imageBase64}`,
      filename: "background-removed.png",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not connect to the background removal backend. Make sure FastAPI is running.",
      },
      { status: 502 },
    );
  }
}
