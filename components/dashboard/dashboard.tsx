"use client";

import { useState } from "react";
import { ProductListResponse } from "dodopayments/resources/index.mjs";
import { User } from "@supabase/supabase-js";
import {
  SelectSubscription,
  SelectUser,
} from "@/lib/drizzle/schema";
import { toast } from "sonner";
import { changePlan } from "@/actions/change-plan";
import { SubscriptionManagement } from "./subscription-management";
import { cancelSubscription } from "@/actions/cancel-subscription";
import { AccountManagement } from "./account-management";

export function Dashboard(props: {
  products: ProductListResponse[];
  user: User;
  userSubscription: {
    subscription: SelectSubscription | null;
    user: SelectUser;
  };
}) {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handlePlanChange = async (productId: string) => {
    if (props.userSubscription.user.currentSubscriptionId) {
      const res = await changePlan({
        subscriptionId: props.userSubscription.user.currentSubscriptionId,
        productId,
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success("Plan changed successfully");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      window.location.reload();
      return;
    }

    try {
      setIsCheckoutLoading(true);
      const response = await fetch(`${window.location.origin}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_cart: [{
            product_id: productId,
            quantity: 1,
          }],
          customer: {
            customer_id: props.userSubscription.user.dodoCustomerId,
            email: props.user.email,
            name: props.user.user_metadata.name,
          },
          return_url: `${window.location.origin}/profile`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { checkout_url } = await response.json();
      window.location.href = checkout_url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout process");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      <AccountManagement
        className="w-full"
        user={props.user}
        userSubscription={props.userSubscription}
      />

      <SubscriptionManagement
        className="w-full"
        products={props.products}
        currentPlan={props.userSubscription.subscription}
        updatePlan={{
          currentPlan: props.userSubscription.subscription,
          onPlanChange: handlePlanChange,
          triggerText: props.userSubscription.user.currentSubscriptionId
            ? "Change Plan"
            : "Choose Plan",
          products: props.products,
        }}
        cancelSubscription={{
          products: props.products,
          title: "Cancel Subscription",
          description: "Are you sure you want to cancel your subscription?",
          leftPanelImageUrl:
            "https://img.freepik.com/free-vector/abstract-paper-cut-shape-wave-background_474888-4649.jpg?semt=ais_hybrid&w=740&q=80",
          plan: props.userSubscription.subscription,
          warningTitle: "You will lose access to your account",
          warningText:
            "If you cancel your subscription, you will lose access to your account and all your data will be deleted.",
          onCancel: async () => {
            if (props.userSubscription.subscription) {
              await cancelSubscription({
                subscriptionId: props.userSubscription.subscription.subscriptionId,
              });
            }
            toast.success("Subscription cancelled successfully");
            window.location.reload();
          },
          onKeepSubscription: async (planId) => {
            console.log("keep subscription", planId);
          },
        }}
      />

      {/* keep TS from considering state unused; also signals future UX (disable buttons) */}
      {isCheckoutLoading ? null : null}
    </div>
  );
}
