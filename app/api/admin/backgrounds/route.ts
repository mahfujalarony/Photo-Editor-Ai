import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { getDb } from '@/lib/mongodb';
import { uploadR2Object, createR2ObjectKeyForTool, getR2PublicUrl } from '@/lib/r2';
import { authOptions } from "@/lib/auth";
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== "mahfujalamrony07@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string || file.name;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const key = createR2ObjectKeyForTool('backgrounds', ext);

    await uploadR2Object({
      key,
      body: buffer,
      contentType: file.type,
    });

    const url = getR2PublicUrl(key) || `/api/admin/backgrounds/${key}`;
    
    const db = await getDb();
    const result = await db.collection('backgrounds').insertOne({
      name,
      key,
      url,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId, url, key });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const backgrounds = await db.collection('backgrounds').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(backgrounds);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== "mahfujalamrony07@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'No id provided' }, { status: 400 });

    const db = await getDb();
    const result = await db.collection('backgrounds').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Background not found' }, { status: 404 });
    }

    // Note: We might also want to delete from R2, but deleting from db removes it from the UI.
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
