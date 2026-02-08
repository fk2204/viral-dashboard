/**
 * API Route: Generate API Key
 */

import { NextResponse } from "next/server";
import { getAuthenticatedUser, generateApiKey } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function POST() {
  try {
    await getAuthenticatedUser();
    await generateApiKey();

    // Redirect back to API keys page
    return redirect("/dashboard/api-keys");
  } catch (error) {
    console.error("Generate API key error:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }
}
