"use client";

import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { ProductListResponse } from "dodopayments/resources/index.mjs";
import { SelectSubscription } from "@/lib/drizzle/schema";
import { freePlan } from "@/lib/config/plans";
import TailwindBadge from "@/components/ui/tailwind-badge";
import { LoaderCircle, X } from "lucide-react";

function isProPlan(plan: ProductListResponse): boolean {
  // This starter typically has a single paid plan; treat it as "Pro".
  // Prefer explicit naming if available.
  return (plan.name ?? "").toLowerCase().includes("pro");
}

function proFeatures(plan: ProductListResponse): string[] {
  // Prefer features provided via product metadata; fallback to Verdle-specific defaults.
  try {
    const parsed = JSON.parse(plan.metadata?.features || "[]");
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string") && parsed.length) {
      return parsed as string[];
    }
  } catch {
    // ignore
  }
  return ["Create unlimited Verdles", "Ad-free experience"];
}

export interface UpdatePlanDialogProps {
  currentPlan: SelectSubscription | null;
  triggerText: string;
  onPlanChange: (planId: string) => Promise<void> | void;
  className?: string;
  title?: string;
  products: ProductListResponse[];
}

export function UpdatePlanDialog({
  currentPlan,
  onPlanChange,
  className,
  title,
  triggerText,
  products,
}: UpdatePlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(
    currentPlan ? currentPlan.productId : undefined
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleDialogClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-xl"
          disabled={!!currentPlan?.cancelAtNextBillingDate}
        >
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "space-y-3 max-h-[90vh] p-4  flex flex-col text-foreground gap-1",
          className
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between ">
          <DialogTitle className="text-base font-semibold">
            {title || "Choose Your Plan"}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm">
            <DialogClose asChild onClick={handleDialogClose}>
              <Button variant="ghost" className="rounded-md" size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-3">
          <RadioGroup value={selectedPlan} onValueChange={handlePlanChange}>
            <AnimatePresence mode="wait">
              <motion.div
                key={freePlan.name}
                onClick={() => handlePlanChange(freePlan.name)}
                className={`p-4  rounded-lg border transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ${
                  selectedPlan === freePlan.name
                    ? "border-primary bg-gradient-to-br from-muted/60 to-muted/30 shadow-md"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <RadioGroupItem
                      value={freePlan.name}
                      id={freePlan.name}
                      className="flex-shrink-0 pointer-events-none  w-fit"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label
                          htmlFor={freePlan.name}
                          className="font-medium cursor-pointer"
                        >
                          {freePlan.name}
                        </Label>

                        <TailwindBadge variant="blue" className="flex-shrink-0">
                          {freePlan.features.length} Features
                        </TailwindBadge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {freePlan.description}
                      </p>
                      {freePlan.features.length > 0 && (
                        <div className="pt-3">
                          <div className="flex flex-wrap gap-2">
                            {freePlan.features.map(
                              (feature: string, featureIndex: number) => (
                                <div
                                  key={featureIndex}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/20 border border-border/30 flex-shrink-0"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {feature}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-semibold">$0</div>
                    <div className="text-xs text-muted-foreground">
                      /month
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {selectedPlan === freePlan.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Button
                        className="w-full mt-4"
                        disabled={true}
                        onClick={async () => {
                          await onPlanChange(freePlan.name);
                          setIsOpen(false);
                        }}
                      >
                        {currentPlan
                          ? "Cancel Subscription to Downgrade"
                          : "Current Plan"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              {products &&
                products
                  .filter((plan) => {
                    if (plan.price_detail?.type === "one_time_price") {
                      return false;
                    }
                    return plan.price_detail?.payment_frequency_interval === "Month";
                  })
                  .sort(
                    (a, b) => {
                      const getPrice = (product: any) => {
                        if (!product.price_detail) return 0;
                        if (product.price_detail.type === 'usage_based_price') {
                          return product.price_detail.fixed_price;
                        }
                        return product.price_detail.price;
                      };
                      return Number(getPrice(a)) - Number(getPrice(b));
                    }
                  )
                  .map((plan) => (
                    <motion.div
                      key={plan.product_id}
                      onClick={() => handlePlanChange(plan.product_id)}
                      className={`p-4 rounded-lg border transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ${
                        selectedPlan === plan.product_id
                          ? "border-primary bg-gradient-to-br from-muted/60 to-muted/30 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 min-w-0 flex-1">
                          <RadioGroupItem
                            value={plan.product_id}
                            id={plan.product_id}
                            className="flex-shrink-0 pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label
                                htmlFor={plan.product_id}
                                className="font-medium cursor-pointer"
                              >
                                {isProPlan(plan) ? "Pro" : plan.name}
                              </Label>
                              {plan.description && (
                                <TailwindBadge
                                  variant="blue"
                                  className="flex-shrink-0"
                                >
                                  {
                                    proFeatures(plan).length
                                  }{" "}
                                  Features
                                </TailwindBadge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {plan.description}
                            </p>
                            {proFeatures(plan).length > 0 && (
                              <div className="pt-3">
                                <div className="flex flex-wrap gap-2">
                                  {proFeatures(plan).map(
                                    (feature: string, featureIndex: number) => (
                                      <div
                                        key={featureIndex}
                                        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/20 border border-border/30 flex-shrink-0"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          {feature}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-semibold">
                            ${Number(plan.price) / 100}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            /month
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {selectedPlan === plan.product_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            <Button
                              className="w-full mt-4"
                              disabled={
                                selectedPlan === currentPlan?.productId ||
                                isLoading
                              }
                              onClick={async () => {
                                setIsLoading(true);
                                await onPlanChange(plan.product_id);
                                setIsLoading(false);
                                setIsOpen(false);
                              }}
                            >
                              {isLoading && (
                                <LoaderCircle className="size-4 animate-spin text-muted-foreground dark:text-muted-foreground " />
                              )}
                              {selectedPlan === currentPlan?.productId
                                ? "Current Plan"
                                : currentPlan
                                ? "Subscribe"
                                : "Upgrade"}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
            </AnimatePresence>
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}
