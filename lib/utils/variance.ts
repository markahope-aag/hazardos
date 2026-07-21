/**
 * Shared job-completion variance threshold (percent).
 *
 * A cost/hours variance within ±this% is "on target"; beyond it is over/under
 * budget. Previously getVarianceSummary bucketed at ±5% while the review UI
 * colored rows at ±10%, so the summary counts disagreed with the visible row
 * colors (J28). Both now import this single value.
 */
export const VARIANCE_THRESHOLD_PCT = 10
