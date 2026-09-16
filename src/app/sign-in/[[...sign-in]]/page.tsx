import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-6">
      <div className="glass rounded-2xl p-2">
        <SignIn />
      </div>
    </div>
  );
}
