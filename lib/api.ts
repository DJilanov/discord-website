import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/security";

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "A record with this identifier already exists." },
      { status: 409 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
