import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "Not found"));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status =
    err instanceof HttpError
      ? err.status
      : typeof err?.status === "number"
        ? err.status
        : 500;

  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(`${req.method} ${req.originalUrl} ${status}: ${err.message}`);
  }

  // Internal error details are never sent to the client
  const message = status >= 500 ? "Internal server error" : err.message;

  if (res.headersSent) return;
  res.status(status).json({ error: message });
};
