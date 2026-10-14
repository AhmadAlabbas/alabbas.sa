import { z } from "zod";

// Format/checksum checks only; this is not government identity verification.
export function validSaudiId(value: string, kind: "NATIONAL_ID" | "IQAMA") {
  if (
    !/^[12]\d{9}$/.test(value) ||
    value[0] !== (kind === "NATIONAL_ID" ? "1" : "2")
  )
    return false;
  const sum = [...value].reduce((total, digit, index) => {
    const n = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (n > 9 ? n - 9 : n);
  }, 0);
  return sum % 10 === 0;
}
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(2)
    .max(max)
    .refine((v) => !/[\x00-\x1f\x7f]/.test(v));
export const kycDataSchema = z
  .strictObject({
    legalName: text(120),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const date = new Date(v + "T00:00:00Z");
        if (
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== v
        )
          return false;
        // Saudi local calendar date, independent of the server's timezone.
        const today = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const age =
          today.getUTCFullYear() -
          date.getUTCFullYear() -
          (today.toISOString().slice(5, 10) < v.slice(5, 10) ? 1 : 0);
        return age >= 18 && age <= 120;
      }),
    nationality: z.string().regex(/^[A-Z]{2}$/),
    residenceCountry: z.literal("SA"),
    city: text(80),
    occupation: text(100),
    idKind: z.enum(["NATIONAL_ID", "IQAMA"]),
    idNumber: z.string().regex(/^[12]\d{9}$/),
    sourceOfFunds: z.enum([
      "SALARY",
      "BUSINESS",
      "SAVINGS",
      "INHERITANCE",
      "OTHER",
    ]),
    sourceDetails: text(500),
    annualIncome: z.enum(["UNDER_100K", "100K_300K", "300K_1M", "OVER_1M"]),
    investableAssets: z.enum(["UNDER_100K", "100K_500K", "500K_2M", "OVER_2M"]),
    politicallyExposed: z.boolean(),
    objective: z.enum(["PRESERVATION", "INCOME", "GROWTH"]),
    horizon: z.enum(["UNDER_1Y", "1_3Y", "OVER_3Y"]),
    experience: z.enum(["NONE", "LIMITED", "EXPERIENCED"]),
    lossTolerance: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })
  .superRefine((data, ctx) => {
    if (!validSaudiId(data.idNumber, data.idKind))
      ctx.addIssue({
        code: "custom",
        path: ["idNumber"],
        message: "Invalid identity number",
      });
    if (data.idKind === "NATIONAL_ID" && data.nationality !== "SA")
      ctx.addIssue({
        code: "custom",
        path: ["nationality"],
        message: "Check nationality",
      });
  });
export type KycData = z.infer<typeof kycDataSchema>;
export function riskBand(data: KycData) {
  // Conservative constraints take precedence; classification is for staff review only.
  if (
    data.lossTolerance === "LOW" ||
    data.horizon === "UNDER_1Y" ||
    data.experience === "NONE"
  )
    return "CONSERVATIVE";
  return data.objective === "GROWTH" &&
    data.lossTolerance === "HIGH" &&
    data.horizon === "OVER_3Y" &&
    data.experience === "EXPERIENCED"
    ? "GROWTH"
    : "BALANCED";
}
export const kycSaveSchema = z.strictObject({
  version: z.number().int().min(0),
  data: kycDataSchema,
});
export const kycSubmitSchema = kycSaveSchema.extend({
  locale: z.enum(["en", "ar"]),
  consentVersion: z.literal("kyc-v1"),
  privacyConsent: z.literal(true),
  accuracyConsent: z.literal(true),
});
export const kycReviewSchema = z
  .strictObject({
    profileId: z.string().min(1).max(30),
    version: z.number().int().min(1),
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    reason: text(1000),
    checksConfirmed: z.boolean(),
    code: z.string().regex(/^\d{6}$/),
  })
  .refine((data) => data.decision !== "APPROVED" || data.checksConfirmed);
