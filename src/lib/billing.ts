/**
 * Billing & Subscription Management - Stripe Integration
 *
 * Handles subscription creation, updates, and webhook events
 */

import Stripe from "stripe";
import { db } from "@/lib/db";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Subscription tiers with Stripe price IDs
// NOTE: Replace with actual Stripe price IDs after creating products
export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    amount: 4900, // $49.00
    quota: 10,
    features: [
      "10 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Basic analytics",
      "Email support",
    ],
  },
  PRO: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
    amount: 14900, // $149.00
    quota: 50,
    features: [
      "50 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Advanced analytics",
      "A/B variant testing",
      "Priority support",
    ],
  },
  AGENCY: {
    name: "Agency",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID || "price_agency",
    amount: 49900, // $499.00
    quota: 500,
    features: [
      "500 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Full analytics suite",
      "A/B variant testing",
      "Multi-user teams (coming soon)",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};

/**
 * Create Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  tenantId: string,
  tier: "STARTER" | "PRO" | "AGENCY",
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const tierInfo = SUBSCRIPTION_TIERS[tier];

  // Create or retrieve Stripe customer
  let customerId = tenant.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        tenantId: tenant.id,
      },
    });
    customerId = customer.id;

    await db.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: tierInfo.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId: tenant.id,
      tier,
    },
  });

  return session;
}

/**
 * Create Stripe billing portal session
 */
export async function createBillingPortalSession(
  tenantId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Handle subscription created event
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenantId = subscription.metadata.tenantId;
  const tier = subscription.metadata.tier as "STARTER" | "PRO" | "AGENCY";

  if (!tenantId || !tier) {
    console.error("Missing metadata in subscription:", subscription.id);
    return;
  }

  const tierInfo = SUBSCRIPTION_TIERS[tier];

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      monthlyQuota: tierInfo.quota,
      usedQuota: 0, // Reset quota on new subscription
      quotaResetAt: new Date(subscription.current_period_end * 1000),
    },
  });
}

/**
 * Handle subscription updated event
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    console.error("Tenant not found for subscription:", subscription.id);
    return;
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: subscription.status,
      quotaResetAt: new Date(subscription.current_period_end * 1000),
    },
  });
}

/**
 * Handle subscription deleted event
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    console.error("Tenant not found for subscription:", subscription.id);
    return;
  }

  // Downgrade to free tier
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionTier: "FREE",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      monthlyQuota: 10,
      usedQuota: 0,
    },
  });
}

/**
 * Handle invoice payment succeeded event (quota reset)
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  if (!invoice.subscription) {
    return;
  }

  const tenant = await db.tenant.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!tenant) {
    return;
  }

  // Reset quota on successful payment (monthly billing cycle)
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      usedQuota: 0,
      quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Handle invoice payment failed event
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  if (!invoice.subscription) {
    return;
  }

  const tenant = await db.tenant.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!tenant) {
    return;
  }

  // Update subscription status to past_due
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: "past_due",
    },
  });

  // TODO: Send email notification to user
  console.log(`Payment failed for tenant ${tenant.id}`);
}

/**
 * Get subscription details for tenant
 */
export async function getSubscriptionDetails(tenantId: string): Promise<{
  tier: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  quota: number;
  used: number;
} | null> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant) {
    return null;
  }

  let cancelAtPeriodEnd = false;

  if (tenant.stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(
      tenant.stripeSubscriptionId
    );
    cancelAtPeriodEnd = subscription.cancel_at_period_end;
  }

  return {
    tier: tenant.subscriptionTier,
    status: tenant.subscriptionStatus,
    currentPeriodEnd: tenant.quotaResetAt,
    cancelAtPeriodEnd,
    quota: tenant.monthlyQuota,
    used: tenant.usedQuota,
  };
}
