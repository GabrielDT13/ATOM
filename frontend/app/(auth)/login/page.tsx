import { LoginForm } from "@/components/login-form";
import { Topbar } from "@/components/topbar";

export default function LoginPage() {
  return (
    <>
      <Topbar />
      <div className="main-container">
        <div className="login-page">
          <LoginForm />
        </div>
      </div>
    </>
  );
}
