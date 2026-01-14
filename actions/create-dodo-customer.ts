"use server";

import { dodoClient } from "@/lib/dodo-payments/client";
import { ServerActionRes } from "@/types/server-action";
import { Customer } from "dodopayments/resources/index.mjs";

export async function createDodoCustomer(props: {
  email: string;
  name?: string;
}): ServerActionRes<Customer> {
  try {
    // Log environment for debugging
    const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
    console.log("Dodo API Environment:", process.env.DODO_PAYMENTS_ENVIRONMENT);
    console.log("Dodo API Key exists:", !!apiKey);
    console.log("Dodo API Key length:", apiKey?.length || 0);
    console.log("Dodo API Key prefix:", apiKey?.substring(0, 10) + "...");
    
    const customer = await dodoClient.customers.create({
      email: props.email,
      name: props.name ? props.name : props.email.split("@")[0],
    });

    return { success: true, data: customer };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Dodo API Error:", errorMessage);
    console.error("Full error:", error);
    return { success: false, error: `Failed to create customer: ${errorMessage}` };
  }
}
