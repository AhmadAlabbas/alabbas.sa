import { redirect } from "next/navigation";
import { currentSession } from "@/lib/portal/sessions";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await currentSession();
  redirect(
    `/${locale}/portal/${session.user.role === "CLIENT" ? "kyc" : "admin/kyc"}`,
  );
}
