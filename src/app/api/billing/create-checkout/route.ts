/**
 * API Route: Create Stripe Checkout Session
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const formData = await req.formData();
    const tier = formData.get("tier") as "STARTER" | "PRO" | "AGENCY";

    if (!tier || !["STARTER", "PRO", "AGENCY"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/dashboard?success=true&tier=${tier}`;
    const cancelUrl = `${baseUrl}/dashboard/billing?canceled=true`;

    const session = await createCheckoutSession(
      user.tenantId,
      tier,
      successUrl,
      cancelUrl
    );

    // Redirect to Stripe Checkout
    return NextResponse.redirect(session.url!);
  } catch (error) {
    console.error("Create checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
