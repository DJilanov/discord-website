import { AuthError } from "@auth/core/errors";

interface MemberAuthErrorDetails {
  type: string;
  cause?: string;
  code?: string;
  oauthError?: string;
  status?: number;
}

const causeNames = new Set([
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ResponseBodyError",
  "OperationProcessingError",
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientValidationError",
  "PrismaClientInitializationError",
]);
const errorCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
  "OAUTH_RESPONSE_BODY_ERROR",
  "OAUTH_INVALID_RESPONSE",
  "OAUTH_PARSE_ERROR",
  "OAUTH_INVALID_REQUEST",
  "OAUTH_HTTP_REQUEST_FORBIDDEN",
  "OAUTH_UNSUPPORTED_OPERATION",
  "42501",
  "23505",
  "42P01",
  "42703",
  "23514",
]);
const oauthErrors = new Set([
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "access_denied",
  "server_error",
  "temporarily_unavailable",
]);

export function memberAuthErrorDetails(error: unknown): MemberAuthErrorDetails {
  const details: MemberAuthErrorDetails = {
    type: error instanceof AuthError ? error.type : "InternalError",
  };
  const pending: unknown[] = [error];
  const seen = new Set<object>();
  // Auth.js wraps provider/database errors in cause.err; messages and bodies
  // are deliberately excluded because they can include credentials or PII.
  while (pending.length && seen.size < 12) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const value = current as Record<string, unknown>;
    if (typeof value.name === "string" && causeNames.has(value.name))
      details.cause = value.name;
    if (
      typeof value.code === "string" &&
      (errorCodes.has(value.code) || /^P\d{4}$/.test(value.code))
    )
      details.code = value.code;
    if (typeof value.error === "string" && oauthErrors.has(value.error))
      details.oauthError = value.error;
    if (
      typeof value.status === "number" &&
      Number.isInteger(value.status) &&
      value.status >= 100 &&
      value.status <= 599
    )
      details.status = value.status;
    pending.push(value.cause, value.err);
  }
  return details;
}
