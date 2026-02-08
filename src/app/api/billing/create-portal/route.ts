/**
 * API Route: Create Stripe Billing Portal Session
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/dashboard/billing`;

    const session = await createBillingPortalSession(user.tenantId, returnUrl);

    // Redirect to Stripe Billing Portal
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Create portal error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
