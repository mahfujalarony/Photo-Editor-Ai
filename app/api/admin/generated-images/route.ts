import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";

import { getDb } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type GeneratedImageDocument = {
  _id: ObjectId;
  tool?: string;
  publicUrl?: string;
  originalPublicUrl?: string;
  mimeType?: string;
  size?: number;
  originalName?: string;
  outputName?: string;
  targetLabel?: string;
  extractedText?: string;
  width?: number;
  height?: number;
  cropApplied?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  createdAt?: Date;
};

function toNumber(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || session.user.email !== "mahfujalamrony07@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tool = searchParams.get("tool") || "all";
  const limit = Math.min(toNumber(searchParams.get("limit"), 60), 100);
  const page = Math.max(toNumber(searchParams.get("page"), 1), 1);
  const skip = (page - 1) * limit;

  try {
    const db = await getDb();
    const collection = db.collection<GeneratedImageDocument>("generated_images");
    const query = tool === "all" ? {} : { tool };
    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await collection.countDocuments(query);

    return NextResponse.json({
      total,
      items: docs.map((doc) => {
        const id = doc._id.toString();

        return {
          id,
          tool: doc.tool ?? tool,
          imageUrl: doc.publicUrl ?? `/api/admin/generated-images/${id}/file`,
          originalImageUrl: doc.originalPublicUrl ?? null,
          mimeType: doc.mimeType ?? "image/jpeg",
          size: doc.size ?? 0,
          originalName: doc.originalName ?? "",
          outputName: doc.outputName ?? "resized-image.jpg",
          targetLabel: doc.targetLabel ?? "",
          extractedText: doc.extractedText ?? "",
          width: doc.width ?? null,
          height: doc.height ?? null,
          cropApplied: Boolean(doc.cropApplied),
          user: doc.userName || doc.userEmail || "Guest user",
          createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
        };
      }),
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load generated images.",
      },
      { status: 500 },
    );
  }
}
