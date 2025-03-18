/* eslint-disable camelcase -- not our code */

import { posthogClient } from '../../database/src/reporting/database-external-config.js';

/**
 * Interface for PostHog embedding metrics parameters
 */
interface EmbeddingMetricsParameters {
  baseUrl: string;
  error?: string;
  httpStatus?: number;
  input: string;
  inputTokens: number;
  isError: boolean;
  latencySeconds: number;
  model: string;
  provider: string;
  traceId: string;
}

/**
 * Definition Doc for param - https://posthog.com/docs/ai-engineering/observability?tab=Embedding
 * Log embedding metrics to PostHog
 * @param params - Embedding metrics parameters
 * @param params.baseUrl - The base URL of the LLM provider
 * @param params.error - Optional error message if the request failed
 * @param params.httpStatus - Optional HTTP status code of the response
 * @param params.input - Array of input texts to embed
 * @param params.inputTokens - Number of tokens in the input
 * @param params.isError - Boolean indicating if the request was an error
 * @param params.latencySeconds - Latency of the embedding in seconds
 * @param params.model - The model used for embedding
 * @param params.provider - The LLM provider name
 * @param params.traceId - Trace ID to group AI events
 */
export async function logEmbeddingMetrics({
  baseUrl,
  error,
  httpStatus,
  input,
  inputTokens,
  isError,
  latencySeconds,
  model,
  provider,
  traceId,
}: EmbeddingMetricsParameters): Promise<void> {
  try {
    // Type-safe properties object for PostHog metrics
    const properties = {
      $ai_base_url: baseUrl,
      $ai_error: error,
      $ai_http_status: httpStatus,
      $ai_input: input,
      $ai_input_tokens: inputTokens,
      $ai_is_error: isError,
      $ai_latency: latencySeconds,
      $ai_model: model,
      $ai_provider: provider,
      $ai_trace_id: traceId,
    };

    posthogClient.capture({
      distinctId: traceId,
      event: '$ai_embedding',
      properties,
    });
  } catch (error_) {
    // Log error but continue execution to prevent disrupting the main flow
    // eslint-disable-next-line no-console -- Error logging is required for observability
    console.error('Failed to log embedding metrics:', error_);
  }
}

/* eslint-enable camelcase -- not our code */
