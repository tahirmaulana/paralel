import {
  SESSION_COOKIE_NAME,
} from "@paralel/auth";

const parseCookieHeader = (
  cookieHeader: string | null,
): ReadonlyMap<string, string> => {
  const values =
    new Map<string, string>();

  if (!cookieHeader) {
    return values;
  }

  for (
    const segment
    of cookieHeader.split(";")
  ) {
    const separatorIndex =
      segment.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const name =
      segment
        .slice(0, separatorIndex)
        .trim();

    const value =
      segment
        .slice(separatorIndex + 1)
        .trim();

    if (
      name.length > 0 &&
      value.length > 0
    ) {
      values.set(
        name,
        decodeURIComponent(value),
      );
    }
  }

  return values;
};

export const readSessionToken = (
  request: Request,
): string | null => {
  const cookies =
    parseCookieHeader(
      request.headers.get("cookie"),
    );

  return (
    cookies.get(
      SESSION_COOKIE_NAME,
    ) ?? null
  );
};
