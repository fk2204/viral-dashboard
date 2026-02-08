/**
 * Billing Page - Subscription Plans & Management
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    tier: "STARTER",
    price: "$49",
    quota: "10 concepts/month",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    features: [
      "10 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Pro",
    tier: "PRO",
    price: "$149",
    quota: "50 concepts/month",
    icon: Crown,
    color: "from-purple-500 to-fuchsia-500",
    popular: true,
    features: [
      "50 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Advanced analytics",
      "A/B variant testing",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    tier: "AGENCY",
    price: "$499",
    quota: "500 concepts/month",
    icon: Rocket,
    color: "from-fuchsia-500 to-pink-500",
    features: [
      "500 viral concepts per month",
      "5-source trend analysis",
      "Sora & Veo prompts",
      "Full analytics suite",
      "A/B variant testing",
      "Multi-user teams (soon)",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export default async function BillingPage() {
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

  const currentTier = user.tenant.subscriptionTier;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg">
            Scale your viral content generation with flexible pricing
          </p>
          {currentTier !== "FREE" && (
            <div className="mt-4">
              <p className="text-purple-400">
                Current plan: <span className="font-bold">{currentTier}</span>
              </p>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = plan.tier === currentTier;

            return (
              <div
                key={plan.tier}
                className={`relative bg-gray-800/50 backdrop-blur-sm border rounded-2xl p-8 ${
                  plan.popular
                    ? "border-purple-500 shadow-2xl shadow-purple-500/20"
                    : "border-gray-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${plan.color} mb-4`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-gray-400">{plan.quota}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <form action="/api/billing/create-checkout" method="POST">
                    <input type="hidden" name="tier" value={plan.tier} />
                    <button
                      type="submit"
                      className={`w-full py-3 bg-gradient-to-r ${plan.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
                    >
                      {currentTier === "FREE" ? "Get Started" : "Upgrade"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* Manage Subscription */}
        {currentTier !== "FREE" && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-4">
              Manage Your Subscription
            </h3>
            <p className="text-gray-400 mb-6">
              Update payment method, view invoices, or cancel subscription
            </p>
            <form action="/api/billing/create-portal" method="POST">
              <button
                type="submit"
                className="inline-block px-8 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
              >
                Open Billing Portal
              </button>
            </form>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="font-bold text-white mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-400 text-sm">
                Yes, you can cancel your subscription at any time from the
                billing portal. You'll retain access until the end of your
                billing period.
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="font-bold text-white mb-2">
                What happens if I exceed my quota?
              </h4>
              <p className="text-gray-400 text-sm">
                You'll need to upgrade your plan or wait for your quota to reset
                next month. No overage charges.
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="font-bold text-white mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-400 text-sm">
                We offer a 14-day money-back guarantee on all plans. Contact
                support if you're not satisfied.
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h4 className="font-bold text-white mb-2">
                Can I upgrade or downgrade?
              </h4>
              <p className="text-gray-400 text-sm">
                Yes, you can change plans at any time. Changes are prorated
                automatically by Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
