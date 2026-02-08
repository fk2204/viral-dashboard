/**
 * Sign Up Page - Clerk Authentication
 */

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Viral Dashboard
          </h1>
          <p className="text-gray-400">
            Start generating viral content with AI
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-gray-800 shadow-2xl",
            },
          }}
        />
      </div>
    </div>
  );
}
