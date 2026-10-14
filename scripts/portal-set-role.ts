// Operator-only CLI; never expose as an API or client action.
import { z } from "zod";
import { db } from "../src/lib/portal/db";
import { privateHash } from "../src/lib/portal/crypto";
import { audit } from "../src/lib/portal/sessions";
async function main() {
  const [email, role] = process.argv.slice(2);
  const input = z
    .strictObject({
      email: z.email(),
      role: z.enum([
        "CLIENT",
        "ADMIN",
        "COMPLIANCE_OFFICER",
        "RELATIONSHIP_MANAGER",
      ]),
    })
    .parse({ email, role });
  try {
    await db().$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (
        !user ||
        !user.emailVerifiedAt ||
        !user.totpEnabledAt ||
        user.status === "SUSPENDED"
      )
        throw new Error(
          "Role changes require an existing verified, MFA-enabled, active account.",
        );
      await tx.user.update({
        where: { id: user.id },
        data: { role: input.role },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await audit(tx, user.id, `ROLE_${input.role}_ASSIGNED`, {
        networkHash: privateHash("operator-cli"),
        userAgent: "Approved operator CLI",
      });
    });
    console.log(
      "Role recorded. Existing sessions revoked; the user must sign in again.",
    );
  } finally {
    await db().$disconnect();
  }
}
void main().catch(() => {
  console.error(
    "Role change failed. Check account verification, MFA and operator configuration.",
  );
  process.exitCode = 1;
});
