import DodoPayments from "dodopayments";

export type DodoPaymentsEnvironment = "live_mode" | "test_mode";

// Trim the API key to remove any accidental whitespace
const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
const environment = (process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() || "test_mode") as DodoPaymentsEnvironment;

export const dodoClient = new DodoPayments({
  bearerToken: apiKey!,
  environment: environment,
});
