import { z } from "zod/v4";

function parseCorsAllowlist(value) {
  return value
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(90000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  MAPS_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  MAPS_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(30),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  GOOGLE_MAPS_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_MAPS_EMBED_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_MAPS_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
})
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "test" && !value.GOOGLE_MAPS_API_KEY) {
      context.addIssue({
        code: "custom",
        message: "GOOGLE_MAPS_API_KEY is required",
        path: ["GOOGLE_MAPS_API_KEY"],
      });
    }
  })
  .transform(value => ({
    ...value,
    CORS_ALLOWED_ORIGINS: parseCorsAllowlist(value.CORS_ALLOWED_ORIGINS),
    GOOGLE_MAPS_API_KEY: value.GOOGLE_MAPS_API_KEY ?? "test-google-maps-key",
  }));

function parseEnvironment() {
  try {
    // eslint-disable-next-line node/no-process-env
    return envSchema.parse(process.env);
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "Missing environment variables:",
        error.issues.map(issue => issue.path.join(".")),
      );
    }
    else {
      console.error(error);
    }

    process.exit(1);
    throw error;
  }
}

export const env = parseEnvironment();
