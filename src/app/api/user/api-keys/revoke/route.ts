/**
 * API Route: Revoke API Key
 */

import { NextResponse } from "next/server";
import { getAuthenticatedUser, revokeApiKey } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function POST() {
  try {
    await getAuthenticatedUser();
    await revokeApiKey();

    // Redirect back to API keys page
    return redirect("/dashboard/api-keys");
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
