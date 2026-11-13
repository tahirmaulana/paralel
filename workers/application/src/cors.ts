const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const isAllowedOrigin = (
  origin: string | null,
): origin is string =>
  origin !== null &&
  ALLOWED_ORIGINS.has(origin);

export const assertAllowedOrigin = (
  request: Request,
): Response | null => {
  const origin = request.headers.get(
    "origin",
  );

  if (
    origin !== null &&
    !isAllowedOrigin(origin)
  ) {
    return new Response(
      JSON.stringify({
        error: "ORIGIN_NOT_ALLOWED",
      }),
      {
        status: 403,
        headers: {
          "content-type":
            "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }

  return null;
};

export const handlePreflight = (
  request: Request,
): Response | null => {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get(
    "origin",
  );

  if (!isAllowedOrigin(origin)) {
    return new Response(null, {
      status: 403,
    });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin":
        origin,
      "access-control-allow-methods":
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, idempotency-key",
      "access-control-allow-credentials":
        "true",
      "access-control-max-age":
        "86400",
      vary: "Origin",
    },
  });
};

export const withCors = (
  request: Request,
  response: Response,
): Response => {
  const origin = request.headers.get(
    "origin",
  );

  if (!isAllowedOrigin(origin)) {
    return response;
  }

  const headers = new Headers(
    response.headers,
  );

  headers.set(
    "access-control-allow-origin",
    origin,
  );
  headers.set(
    "access-control-allow-credentials",
    "true",
  );
  headers.append("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
