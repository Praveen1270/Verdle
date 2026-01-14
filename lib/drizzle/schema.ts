import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const users = pgTable("users", {
  supabaseUserId: text("supabase_user_id").primaryKey(),
  dodoCustomerId: text("dodo_customer_id").notNull(),
  currentSubscriptionId: text("current_subscription_id"),
  plan: planEnum("plan").notNull().default("free"),
  dailyCreateCount: integer("daily_create_count").notNull().default(0),
  lastCreateDate: date("last_create_date"),
  dailyStreak: integer("daily_streak").notNull().default(0),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  deletedAt: timestamp("deleted_at", {
    mode: "string",
    withTimezone: true,
  }),
});

export const subscriptions = pgTable("subscriptions", {
  subscriptionId: text("subscription_id").primaryKey().notNull(),
  userId: text("user_id").references(() => users.supabaseUserId),
  recurringPreTaxAmount: real("recurring_pre_tax_amount").notNull(),
  taxInclusive: boolean("tax_inclusive").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  productId: text("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  trialPeriodDays: integer("trial_period_days"),
  subscriptionPeriodInterval: text("subscription_period_interval"),
  paymentPeriodInterval: text("payment_period_interval"),
  subscriptionPeriodCount: integer("subscription_period_count"),
  paymentFrequencyCount: integer("payment_frequency_count"),
  nextBillingDate: timestamp("next_billing_date", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  previousBillingDate: timestamp("previous_billing_date", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email").notNull(),
  metadata: jsonb("metadata"),
  discountId: text("discount_id"),
  cancelledAt: timestamp("cancelled_at", {
    mode: "string",
    withTimezone: true,
  }),
  cancelAtNextBillingDate: boolean("cancel_at_next_billing_date"),
  billing: jsonb("billing").notNull(),
  onDemand: boolean("on_demand"),
  addons: jsonb("addons"),
});

export const payments = pgTable("payments", {
  paymentId: text("payment_id").primaryKey(),
  status: text("status").notNull(),
  totalAmount: real("total_amount").notNull(),
  currency: text("currency").notNull(),
  paymentMethod: text("payment_method"),
  paymentMethodType: text("payment_method_type"),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  subscriptionId: text("subscription_id").notNull(),
  brandId: text("brand_id").notNull(),
  digitalProductDelivered: boolean("digital_product_delivered"),
  metadata: jsonb("metadata"),
  webhookData: jsonb("webhook_data").notNull(),
  billing: jsonb("billing").notNull(),
  businessId: text("business_id").notNull(),
  cardIssuingCountry: text("card_issuing_country"),
  cardLastFour: text("card_last_four"),
  cardNetwork: text("card_network"),
  cardType: text("card_type"),
  discountId: text("discount_id"),
  disputes: jsonb("disputes"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  paymentLink: text("payment_link"),
  productCart: jsonb("product_cart"),
  refunds: jsonb("refunds"),
  settlementAmount: real("settlement_amount"),
  settlementCurrency: text("settlement_currency"),
  settlementTax: real("settlement_tax"),
  tax: real("tax"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }),
});

export const verdles = pgTable(
  "verdles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorUserId: text("creator_user_id")
      .notNull()
      .references(() => users.supabaseUserId),
    // Store only a hash (never the raw word)
    wordHash: text("word_hash").notNull(),
    // Encrypted secret word (server-side only; column access revoked for anon/authenticated in RLS migration)
    wordCiphertext: text("word_ciphertext").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    creatorIdx: index("verdles_creator_user_id_idx").on(t.creatorUserId),
  })
);

export const verdleAttempts = pgTable(
  "verdle_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    verdleId: uuid("verdle_id")
      .notNull()
      .references(() => verdles.id, { onDelete: "cascade" }),
    // For logged-in players
    playerUserId: text("player_user_id").references(() => users.supabaseUserId),
    // For anonymous players (store a random session id from cookie/localStorage)
    playerSessionId: text("player_session_id"),
    attemptsCount: integer("attempts_count").notNull(),
    won: boolean("won").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    verdleIdx: index("verdle_attempts_verdle_id_idx").on(t.verdleId),
    playerUserIdx: index("verdle_attempts_player_user_id_idx").on(t.playerUserId),
    playerSessionIdx: index("verdle_attempts_player_session_id_idx").on(
      t.playerSessionId
    ),
    // prevent duplicate “final result” rows for the same player on the same verdle
    uniqUserVerdle: uniqueIndex("verdle_attempts_verdle_user_uniq").on(
      t.verdleId,
      t.playerUserId
    ),
    uniqSessionVerdle: uniqueIndex("verdle_attempts_verdle_session_uniq").on(
      t.verdleId,
      t.playerSessionId
    ),
  })
);

export const dailyWords = pgTable("daily_words", {
  date: date("date").primaryKey().notNull(),
  wordHash: text("word_hash").notNull(),
  // Encrypted secret word (server-side only; column access revoked for anon/authenticated in RLS migration)
  wordCiphertext: text("word_ciphertext").notNull(),
});

// One attempt per user per day for Daily Verdle
export const dailyAttempts = pgTable(
  "daily_attempts",
  {
    date: date("date").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.supabaseUserId, { onDelete: "cascade" }),
    attemptsCount: integer("attempts_count").notNull(),
    won: boolean("won").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.userId] }),
  })
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  currentSubscription: one(subscriptions, {
    fields: [users.currentSubscriptionId],
    references: [subscriptions.subscriptionId],
  }),
  subscriptions: many(subscriptions),
  verdles: many(verdles),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.supabaseUserId],
  }),
}));

export const verdlesRelations = relations(verdles, ({ one, many }) => ({
  creator: one(users, {
    fields: [verdles.creatorUserId],
    references: [users.supabaseUserId],
  }),
  attempts: many(verdleAttempts),
}));

export const verdleAttemptsRelations = relations(verdleAttempts, ({ one }) => ({
  verdle: one(verdles, {
    fields: [verdleAttempts.verdleId],
    references: [verdles.id],
  }),
  playerUser: one(users, {
    fields: [verdleAttempts.playerUserId],
    references: [users.supabaseUserId],
  }),
}));

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export type SelectPayment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export type SelectVerdle = typeof verdles.$inferSelect;
export type InsertVerdle = typeof verdles.$inferInsert;

export type SelectVerdleAttempt = typeof verdleAttempts.$inferSelect;
export type InsertVerdleAttempt = typeof verdleAttempts.$inferInsert;

export type SelectDailyWord = typeof dailyWords.$inferSelect;
export type InsertDailyWord = typeof dailyWords.$inferInsert;

export type SelectDailyAttempt = typeof dailyAttempts.$inferSelect;
export type InsertDailyAttempt = typeof dailyAttempts.$inferInsert;
