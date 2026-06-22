import { redirect } from "next/navigation";

import { AccessRequestForm } from "@/components/auth/access-request-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { fetchServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function RequestAccessPage() {
  const session = await fetchServerSession();
  if (session?.authenticated && session.user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <AccessRequestForm />
    </AuthShell>
  );
}
