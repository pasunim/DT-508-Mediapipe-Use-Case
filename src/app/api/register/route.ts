import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_฀-๿]{3,30}$/; // alphanumeric + Thai, 3-30 chars

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, username, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const emailTrimmed = email.trim().toLowerCase().slice(0, 254);
  const usernameTrimmed = username.trim().slice(0, 30);

  if (!EMAIL_RE.test(emailTrimmed)) {
    return NextResponse.json({ error: "รูปแบบ Email ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!USERNAME_RE.test(usernameTrimmed)) {
    return NextResponse.json({ error: "Username ต้องมี 3-30 ตัวอักษร (ตัวอักษร ตัวเลข หรือ _)" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password ต้องมีความยาว 8-128 ตัวอักษร" }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: emailTrimmed }, { username: usernameTrimmed }] },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ error: "Email หรือ Username ถูกใช้แล้ว" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const colors = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  const user = await prisma.user.create({
    data: { email: emailTrimmed, username: usernameTrimmed, passwordHash, avatarColor },
    select: { id: true, username: true },
  });

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
}
