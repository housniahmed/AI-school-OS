import type { NextFunction, Request, Response } from 'express';
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Span
} from '@opentelemetry/api';

const tracer = trace.getTracer('ai-school-os/http');

function safeRoute(req: Request): string {
  if (req.route?.path) return String(req.route.path);
  if (req.path === '/health' || req.path === '/metrics') return req.path;
  if (req.path.startsWith('/api/')) return '/api/:unmatched';
  return '/:unmatched';
}

function finishSpan(span: Span, req: Request, res: Response) {
  span.setAttribute('http.response.status_code', res.statusCode);
  span.setAttribute('http.route', safeRoute(req));
  span.setAttribute('app.request_id', req.requestId);

  if (res.statusCode >= 500) {
    span.setStatus({ code: SpanStatusCode.ERROR });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export function requestTrace(req: Request, res: Response, next: NextFunction) {
  const extractedContext = propagation.extract(context.active(), req.headers);
  const span = tracer.startSpan(`${req.method} ${safeRoute(req)}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.request.method': req.method
    }
  }, extractedContext);

  const spanContext = trace.setSpan(extractedContext, span);
  let completed = false;

  const complete = () => {
    if (completed) return;
    completed = true;
    finishSpan(span, req, res);
  };

  res.once('finish', complete);
  res.once('close', complete);

  try {
    context.with(spanContext, () => next());
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    complete();
    throw error;
  }
}
