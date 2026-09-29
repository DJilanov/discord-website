import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Staff Sign In",
  "Staff access to WoW Forever Discord.",
  "/login",
  true,
);
export const dynamic = "force-dynamic";
export default async function LoginPage(): Promise<React.JSX.Element> {
  if (await getStaff()) redirect("/admin");
  return (
    <main className="login-page" id="main-content">
      <LoginForm />
    </main>
  );
}
