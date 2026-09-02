import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { loginSchema } from "@/lib/utils/validation";
import { apiError, handleApiError } from "@/lib/utils/api-error";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Same generic error whether the email doesn't exist or the password is
    // wrong — never reveal which one it was, that's a basic security practice.
    if (!user) {
      return apiError("Invalid email or password.", 401);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return apiError("Invalid email or password.", 401);
    }

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
