import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertResult = await db.collection("users").insertOne({
      name,
      email,
      passwordHash,
      role: "user",
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: insertResult.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("Failed to register user", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
