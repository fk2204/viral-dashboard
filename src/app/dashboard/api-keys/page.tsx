/**
 * API Keys Management Page
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Key, Copy, Trash2, AlertCircle } from "lucide-react";

export default async function ApiKeysPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { tenant: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const hasApiKey = !!user.apiKey;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-gray-400">
            Generate API keys for programmatic access to the Viral Dashboard
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-400 mb-2">
                Security Warning
              </h3>
              <p className="text-yellow-200 text-sm">
                API keys provide full access to your account. Keep them secure
                and never share them publicly. If you suspect a key has been
                compromised, revoke it immediately.
              </p>
            </div>
          </div>
        </div>

        {/* API Key Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Your API Key</h2>
          </div>

          {hasApiKey ? (
            <div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
                <code className="text-green-400 text-sm font-mono break-all">
                  {user.apiKey}
                </code>
              </div>

              <div className="flex gap-4">
                <form action="/api/user/api-keys/copy" method="POST">
                  <input type="hidden" name="apiKey" value={user.apiKey!} />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.apiKey!);
                      alert("API key copied to clipboard!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Key
                  </button>
                </form>

                <form action="/api/user/api-keys/revoke" method="POST">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke Key
                  </button>
                </form>
              </div>

              <p className="text-sm text-gray-400 mt-4">
                This key was generated when you created your account. Keep it
                safe!
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-6">
                You don't have an API key yet. Generate one to access the Viral
                Dashboard API programmatically.
              </p>

              <form action="/api/user/api-keys/generate" method="POST">
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Generate API Key
                </button>
              </form>
            </div>
          )}
        </div>

        {/* API Documentation */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-4">
            API Documentation
          </h3>

          <div className="space-y-6">
            {/* Authentication */}
            <div>
              <h4 className="font-bold text-purple-400 mb-2">
                Authentication
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Include your API key in the Authorization header:
              </p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <code className="text-green-400 text-sm font-mono">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>
            </div>

            {/* Generate Concepts */}
            <div>
              <h4 className="font-bold text-purple-400 mb-2">
                Generate Concepts
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Generate 5 viral concepts from trending topics:
              </p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <code className="text-green-400 text-sm font-mono block mb-2">
                  POST /api/generate
                </code>
                <code className="text-gray-400 text-xs font-mono block">
                  curl -X POST https://viraldashboard.com/api/generate \<br />
                  {"  "}-H "Authorization: Bearer YOUR_API_KEY"
                </code>
              </div>
            </div>

            {/* Get Usage */}
            <div>
              <h4 className="font-bold text-purple-400 mb-2">Check Quota</h4>
              <p className="text-gray-400 text-sm mb-3">
                Check your current quota usage:
              </p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <code className="text-green-400 text-sm font-mono block mb-2">
                  GET /api/user/usage
                </code>
                <code className="text-gray-400 text-xs font-mono block">
                  curl https://viraldashboard.com/api/user/usage \<br />
                  {"  "}-H "Authorization: Bearer YOUR_API_KEY"
                </code>
              </div>
            </div>

            {/* List Concepts */}
            <div>
              <h4 className="font-bold text-purple-400 mb-2">
                List Concepts
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Get your previously generated concepts:
              </p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <code className="text-green-400 text-sm font-mono block mb-2">
                  GET /api/user/concepts
                </code>
                <code className="text-gray-400 text-xs font-mono block">
                  curl https://viraldashboard.com/api/user/concepts \<br />
                  {"  "}-H "Authorization: Bearer YOUR_API_KEY"
                </code>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Full API documentation available at:{" "}
              <a
                href="/docs/api"
                className="text-purple-400 hover:text-purple-300"
              >
                docs/api
              </a>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
