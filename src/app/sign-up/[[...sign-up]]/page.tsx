import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-6">
      <div className="glass rounded-2xl p-2">
        <SignUp />
      </div>
    </div>
  );
}
