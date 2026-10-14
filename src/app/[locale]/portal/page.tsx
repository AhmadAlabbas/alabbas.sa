import { redirect } from "next/navigation";
import { currentSession } from "@/lib/portal/sessions";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let session;
  try {
    session = await currentSession();
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }
  redirect(
    `/${locale}/portal/${session.user.role === "CLIENT" ? "dashboard" : "admin/kyc"}`,
  );
}
