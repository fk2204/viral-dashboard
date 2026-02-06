/**
 * Input validation with logical constraints
 */

import { Category, Platform } from "@/types";

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

interface FeedbackMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clickThroughRate?: number;
  watchTimeSeconds?: number;
}

interface ValidatedFeedbackData {
  conceptId: string;
  category: Category;
  platform: Platform;
  metrics: FeedbackMetrics;
  estimatedRpm?: number;
  sponsorInterest?: boolean;
  notes?: string;
}

const VALID_CATEGORIES: readonly Category[] = [
  "news",
  "absurd",
  "luxury",
  "emotional",
  "tech",
  "cartoon",
  "gaming",
  "fitness",
  "food",
  "finance",
  "music",
  "relationships",
] as const;

const VALID_PLATFORMS: readonly Platform[] = [
  "tiktok",
  "youtube-shorts",
  "instagram-reels",
] as const;

/**
 * Validate feedback request with comprehensive checks
 */
export function validateFeedbackRequest(
  body: unknown
): ValidationResult<ValidatedFeedbackData> {
  const errors: ValidationError[] = [];

  // Type guard
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be an object" }],
    };
  }

  const data = body as Record<string, unknown>;

  // Required: conceptId
  if (!data.conceptId || typeof data.conceptId !== "string") {
    errors.push({
      field: "conceptId",
      message: "conceptId is required and must be a string",
    });
  }

  // Required: category
  if (!data.category || typeof data.category !== "string") {
    errors.push({
      field: "category",
      message: "category is required and must be a string",
    });
  } else if (!VALID_CATEGORIES.includes(data.category as Category)) {
    errors.push({
      field: "category",
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
    });
  }

  // Required: platform
  if (!data.platform || typeof data.platform !== "string") {
    errors.push({
      field: "platform",
      message: "platform is required and must be a string",
    });
  } else if (!VALID_PLATFORMS.includes(data.platform as Platform)) {
    errors.push({
      field: "platform",
      message: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}`,
    });
  }

  // Required: metrics object
  if (!data.metrics || typeof data.metrics !== "object") {
    errors.push({
      field: "metrics",
      message: "metrics is required and must be an object",
    });
  } else {
    const metrics = data.metrics as Record<string, unknown>;

    // Validate individual metric fields
    const numericFields = ["views", "likes", "comments", "shares"];
    const optionalNumericFields = ["saves", "clickThroughRate", "watchTimeSeconds"];

    for (const field of numericFields) {
      if (typeof metrics[field] !== "number") {
        errors.push({
          field: `metrics.${field}`,
          message: `${field} is required and must be a number`,
        });
      } else if (metrics[field] < 0) {
        errors.push({
          field: `metrics.${field}`,
          message: `${field} cannot be negative`,
        });
      }
    }

    for (const field of optionalNumericFields) {
      if (metrics[field] !== undefined) {
        if (typeof metrics[field] !== "number") {
          errors.push({
            field: `metrics.${field}`,
            message: `${field} must be a number`,
          });
        } else if (metrics[field] < 0) {
          errors.push({
            field: `metrics.${field}`,
            message: `${field} cannot be negative`,
          });
        }
      }
    }

    // Logical constraints
    if (
      typeof metrics.views === "number" &&
      typeof metrics.likes === "number" &&
      metrics.likes > metrics.views
    ) {
      errors.push({
        field: "metrics.likes",
        message: "likes cannot exceed views",
      });
    }

    if (
      typeof metrics.views === "number" &&
      typeof metrics.shares === "number" &&
      metrics.shares > metrics.views
    ) {
      errors.push({
        field: "metrics.shares",
        message: "shares cannot exceed views",
      });
    }

    if (
      typeof metrics.views === "number" &&
      typeof metrics.comments === "number" &&
      metrics.comments > metrics.views
    ) {
      errors.push({
        field: "metrics.comments",
        message: "comments cannot exceed views",
      });
    }

    if (
      typeof metrics.views === "number" &&
      typeof metrics.saves === "number" &&
      metrics.saves > metrics.views
    ) {
      errors.push({
        field: "metrics.saves",
        message: "saves cannot exceed views",
      });
    }

    // Engagement sanity check: total engagement should not exceed 200% of views
    if (
      typeof metrics.views === "number" &&
      typeof metrics.likes === "number" &&
      typeof metrics.comments === "number" &&
      typeof metrics.shares === "number"
    ) {
      const saves = typeof metrics.saves === "number" ? metrics.saves : 0;
      const totalEngagement =
        metrics.likes + metrics.comments + metrics.shares + saves;
      const maxEngagement = metrics.views * 2;

      if (totalEngagement > maxEngagement) {
        errors.push({
          field: "metrics",
          message: `Total engagement (${totalEngagement}) exceeds 200% of views (${maxEngagement}). Please verify your data.`,
        });
      }
    }

    // clickThroughRate validation
    if (
      typeof metrics.clickThroughRate === "number" &&
      (metrics.clickThroughRate < 0 || metrics.clickThroughRate > 100)
    ) {
      errors.push({
        field: "metrics.clickThroughRate",
        message: "clickThroughRate must be between 0 and 100",
      });
    }
  }

  // Optional: estimatedRpm
  if (data.estimatedRpm !== undefined) {
    if (typeof data.estimatedRpm !== "number") {
      errors.push({
        field: "estimatedRpm",
        message: "estimatedRpm must be a number",
      });
    } else if (data.estimatedRpm < 0) {
      errors.push({
        field: "estimatedRpm",
        message: "estimatedRpm cannot be negative",
      });
    }
  }

  // Optional: sponsorInterest
  if (data.sponsorInterest !== undefined && typeof data.sponsorInterest !== "boolean") {
    errors.push({
      field: "sponsorInterest",
      message: "sponsorInterest must be a boolean",
    });
  }

  // Optional: notes
  if (data.notes !== undefined && typeof data.notes !== "string") {
    errors.push({
      field: "notes",
      message: "notes must be a string",
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Safe to cast since we validated all required fields above
  return {
    valid: true,
    data: {
      conceptId: data.conceptId as string,
      category: data.category as Category,
      platform: data.platform as Platform,
      metrics: data.metrics as FeedbackMetrics,
      estimatedRpm: data.estimatedRpm as number | undefined,
      sponsorInterest: data.sponsorInterest as boolean | undefined,
      notes: data.notes as string | undefined,
    },
  };
}

/**
 * Validate trend generation request
 */
export function validateTrendRequest(
  body: unknown
): ValidationResult<{ sources?: string[] }> {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be an object" }],
    };
  }

  const data = body as Record<string, unknown>;

  // Optional: sources array
  if (data.sources !== undefined) {
    if (!Array.isArray(data.sources)) {
      errors.push({
        field: "sources",
        message: "sources must be an array",
      });
    } else if (!data.sources.every((s) => typeof s === "string")) {
      errors.push({
        field: "sources",
        message: "all sources must be strings",
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: data as { sources?: string[] },
  };
}

/**
 * Validate concept generation request
 */
export function validateGenerateRequest(
  body: unknown
): ValidationResult<{ count?: number; categories?: Category[] }> {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body must be an object" }],
    };
  }

  const data = body as Record<string, unknown>;

  // Optional: count
  if (data.count !== undefined) {
    if (typeof data.count !== "number") {
      errors.push({
        field: "count",
        message: "count must be a number",
      });
    } else if (data.count < 1 || data.count > 20) {
      errors.push({
        field: "count",
        message: "count must be between 1 and 20",
      });
    }
  }

  // Optional: categories array
  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) {
      errors.push({
        field: "categories",
        message: "categories must be an array",
      });
    } else if (
      !data.categories.every((c) => VALID_CATEGORIES.includes(c as Category))
    ) {
      errors.push({
        field: "categories",
        message: `Invalid categories. Must be from: ${VALID_CATEGORIES.join(", ")}`,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: data as { count?: number; categories?: Category[] },
  };
}
