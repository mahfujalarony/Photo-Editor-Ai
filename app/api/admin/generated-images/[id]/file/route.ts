import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { fetchR2Object } from "@/lib/r2";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GeneratedImageDocument = {
  _id: ObjectId;
  r2Key?: string;
  publicUrl?: string;
  mimeType?: string;
  outputName?: string;
};

function contentDisposition(filename: string) {
  const safeName = filename.replace(/["\r\n]/g, "") || "resized-image.jpg";

  return `inline; filename="${safeName}"`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid image id." }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection<GeneratedImageDocument>("generated_images").findOne({
    _id: new ObjectId(id),
  });

  if (!doc?.r2Key) {
    return NextResponse.json({ error: "Generated image not found." }, { status: 404 });
  }

  if (doc.publicUrl) {
    return NextResponse.redirect(doc.publicUrl);
  }

  const r2Response = await fetchR2Object(doc.r2Key);

  return new Response(r2Response.body, {
    headers: {
      "cache-control": "private, max-age=300",
      "content-disposition": contentDisposition(doc.outputName ?? "resized-image.jpg"),
      "content-type":
        r2Response.headers.get("content-type") ?? doc.mimeType ?? "image/jpeg",
    },
  });
}
