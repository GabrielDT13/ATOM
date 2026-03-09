import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { fetchServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await fetchServerSession();
  if (session?.authenticated && session.user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
