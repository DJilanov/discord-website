import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as unknown as { foreverDb?: PrismaClient };

export const db =
  globalDb.foreverDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 10,
    }),
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalDb.foreverDb = db;
