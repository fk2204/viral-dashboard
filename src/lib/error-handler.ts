/**
 * Centralized error handling with structured logging
 */

export const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CONCEPT_NOT_FOUND: "CONCEPT_NOT_FOUND",
  REFLEXION_FAILED: "REFLEXION_FAILED",
  API_KEY_MISSING: "API_KEY_MISSING",
  TREND_FETCH_FAILED: "TREND_FETCH_FAILED",
  GENERATION_FAILED: "GENERATION_FAILED",
  STORAGE_ERROR: "STORAGE_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

interface ErrorContext {
  code?: ErrorCode;
  userId?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Custom application error with structured context
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    userMessage?: string,
    context?: ErrorContext
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    this.context = context || {};
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Log error with structured context
 */
export function logError(
  error: Error | AppError,
  context?: ErrorContext
): void {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    console.error({
      timestamp,
      level: "error",
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      userMessage: error.userMessage,
      context: { ...error.context, ...context },
      stack: error.stack,
    });
  } else {
    console.error({
      timestamp,
      level: "error",
      message: error.message,
      name: error.name,
      context,
      stack: error.stack,
    });
  }

  // TODO: Send to external logging service (Sentry, LogRocket, etc.)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Handle API errors and return consistent response
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = "An error occurred",
  context?: ErrorContext
): { error: string; statusCode: number; code?: ErrorCode } {
  // AppError - already structured
  if (error instanceof AppError) {
    logError(error, context);
    return {
      error: error.userMessage,
      statusCode: error.statusCode,
      code: error.code,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    logError(error, context);

    // Check for specific error patterns
    if (error.message.includes("API key")) {
      return {
        error: "API configuration error. Please check your environment variables.",
        statusCode: 500,
        code: ERROR_CODES.API_KEY_MISSING,
      };
    }

    if (error.message.includes("rate limit")) {
      return {
        error: "Rate limit exceeded. Please try again later.",
        statusCode: 429,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      };
    }

    if (error.message.includes("validation")) {
      return {
        error: error.message,
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
      };
    }

    return {
      error: defaultMessage,
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
    };
  }

  // Unknown error type
  console.error({
    timestamp: new Date().toISOString(),
    level: "error",
    message: "Unknown error type",
    error,
    context,
  });

  return {
    error: defaultMessage,
    statusCode: 500,
    code: ERROR_CODES.INTERNAL_ERROR,
  };
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  context?: ErrorContext
): AppError {
  return new AppError(
    message,
    ERROR_CODES.VALIDATION_FAILED,
    400,
    message,
    context
  );
}

/**
 * Create not found error
 */
export function createNotFoundError(
  resource: string,
  context?: ErrorContext
): AppError {
  const message = `${resource} not found`;
  return new AppError(
    message,
    ERROR_CODES.CONCEPT_NOT_FOUND,
    404,
    message,
    context
  );
}

/**
 * Create rate limit error
 */
export function createRateLimitError(
  resetTime?: number,
  context?: ErrorContext
): AppError {
  const message = resetTime
    ? `Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)}s`
    : "Rate limit exceeded. Please try again later.";

  return new AppError(
    message,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    429,
    message,
    context
  );
}

/**
 * Create API key missing error
 */
export function createApiKeyError(keyName: string): AppError {
  return new AppError(
    `${keyName} not configured`,
    ERROR_CODES.API_KEY_MISSING,
    500,
    "API configuration error. Please check your environment variables.",
    { keyName }
  );
}

/**
 * Create external API error
 */
export function createExternalApiError(
  service: string,
  originalError: Error,
  context?: ErrorContext
): AppError {
  return new AppError(
    `External API error: ${service}`,
    ERROR_CODES.EXTERNAL_API_ERROR,
    502,
    `Failed to fetch data from ${service}. Please try again later.`,
    { ...context, service, originalMessage: originalError.message }
  );
}
