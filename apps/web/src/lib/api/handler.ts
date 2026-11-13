import {
  createApiRequestContext,
  type ApiRequestContext,
} from './request-context';

import {
  errorResponse,
} from './error-response';

export type ApiHandler =
  (
    context: ApiRequestContext,
  ) => Promise<Response>;

export async function executeApiHandler(
  request: Request,
  handler: ApiHandler,
): Promise<Response> {
  const context =
    createApiRequestContext(
      request,
    );

  try {
    return await handler(context);
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        level: 'error',
        event:
          'api_request_failed',
        correlationId:
          context.correlationId,
        method:
          context.method,
        pathname:
          context.pathname,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
    );

    return errorResponse(
      error,
      context.correlationId,
    );
  }
}
