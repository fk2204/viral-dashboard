/**
 * Sign In Page - Clerk Authentication
 */

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Viral Dashboard
          </h1>
          <p className="text-gray-400">
            AI-powered viral content generation
          </p>
        </div>
        <SignIn
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
