import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
