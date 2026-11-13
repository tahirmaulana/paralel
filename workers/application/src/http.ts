export const json = (
  body: unknown,
  init: ResponseInit = {},
): Response => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
};

export const methodNotAllowed = (allowed: readonly string[]): Response =>
  json(
    {
      error: "METHOD_NOT_ALLOWED",
    },
    {
      status: 405,
      headers: {
        allow: allowed.join(", "),
      },
    },
  );

export const notFound = (): Response =>
  json(
    {
      error: "NOT_FOUND",
    },
    {
      status: 404,
    },
  );
