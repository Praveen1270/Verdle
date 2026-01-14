import { DodoPaymentsEnvironment } from "@/lib/dodo-payments/client";
import { Checkout } from "@dodopayments/nextjs";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  const { origin } = new URL(req.url);
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    returnUrl: `${origin}/profile`,
    environment: process.env
      .DODO_PAYMENTS_ENVIRONMENT as DodoPaymentsEnvironment,
    type: "static",
  });

  return handler(req);
};

export const POST = async (req: NextRequest) => {
  const { origin } = new URL(req.url);
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    returnUrl: `${origin}/profile`,
    environment: process.env
      .DODO_PAYMENTS_ENVIRONMENT as DodoPaymentsEnvironment,
    type: "session",
  });

  return handler(req);
};
