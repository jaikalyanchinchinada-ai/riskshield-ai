import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/client";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signupSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password } = signupSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return apiError("An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        role: "analyst",
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
