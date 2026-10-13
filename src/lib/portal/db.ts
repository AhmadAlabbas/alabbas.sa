import "server-only";
import { PrismaClient } from "@prisma/client";
const singleton = globalThis as unknown as { portalDb?: PrismaClient };
export function db() {
  // Do not initialize a connection or require credentials while the portal is disabled/building.
  return (singleton.portalDb ??= new PrismaClient({ log: [] }));
}
