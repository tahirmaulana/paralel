const APPLICATION_API_ORIGIN =
  "https://paralel-application.maulanataheer.workers.dev";

export const applicationApiUrl = (
  pathname: string,
): string => {
  if (!pathname.startsWith("/")) {
    throw new Error(
      "Application API pathname must start with '/'.",
    );
  }

  return `${APPLICATION_API_ORIGIN}${pathname}`;
};
