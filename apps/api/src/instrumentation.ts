import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

// Fail closed for local/test execution: tracing is inert unless OTLP is explicitly enabled.
process.env.OTEL_TRACES_EXPORTER ??= 'none';
process.env.OTEL_PROPAGATORS ??= 'tracecontext';
process.env.OTEL_NODE_RESOURCE_DETECTORS ??= 'none';
process.env.OTEL_LOG_LEVEL ??= 'none';
process.env.OTEL_SERVICE_NAME ??= 'ai-school-os-api';

const internalOutboundHosts = new Set(
  (process.env.OTEL_TRACE_OUTBOUND_HOSTS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const traceExporter = process.env.OTEL_TRACES_EXPORTER === 'otlp'
  ? new OTLPTraceExporter()
  : undefined;

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME,
  traceExporter,
  instrumentations: [
    new HttpInstrumentation({
      // Incoming spans are created manually so requestId can be attached safely and
      // the route is normalized before the span is closed.
      disableIncomingRequestInstrumentation: true,
      // Outbound context is propagated only to explicitly allow-listed internal hosts.
      ignoreOutgoingRequestHook: (request) => {
        const hostname = typeof request.hostname === 'string'
          ? request.hostname.toLowerCase()
          : undefined;
        return !hostname || !internalOutboundHosts.has(hostname);
      },
      // Never capture application headers into spans.
      headersToSpanAttributes: {},
      // Replace the built-in list with a deliberately broad application list.
      redactedQueryParams: [
        'api_key',
        'apikey',
        'auth',
        'authorization',
        'code',
        'credential',
        'email',
        'key',
        'password',
        'phone',
        'secret',
        'signature',
        'token',
        'user',
        'username'
      ]
    })
  ]
});

sdk.start();

export async function shutdownTelemetry() {
  await sdk.shutdown();
}
