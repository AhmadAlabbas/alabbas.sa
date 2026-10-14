import "server-only";
import { randomUUID } from "node:crypto";
export interface NafathProvider {
  start(subjectId: string): Promise<{ requestId: string; status: "PENDING" }>;
  status(requestId: string): Promise<"PENDING" | "REJECTED" | "VERIFIED">;
}
/** Development interface only; never used as a login or verification bypass. */
export class MockNafathProvider implements NafathProvider {
  async start(subjectId: string) {
    void subjectId;
    return { requestId: randomUUID(), status: "PENDING" as const };
  }
  async status(requestId: string) {
    void requestId;
    return "PENDING" as const;
  }
}
