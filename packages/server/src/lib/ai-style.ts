/**
 * Shared style rules for AI services that produce user-facing copy.
 *
 * Any system prompt whose output is shown to the user (cluster panels,
 * note refinement, briefs, questions, business plans, interview
 * responses, etc.) must inject NO_EM_DASH_RULE near the top of the
 * prompt.
 *
 * Background: brand-wide editorial rule forbids em dashes anywhere
 * user-facing. Models trained on web text default to em dashes for
 * parenthetical beats unless explicitly told not to. Replacement is a
 * comma for in-line clauses, or a colon for label-and-elaboration pairs.
 */

export const NO_EM_DASH_RULE = `STYLE RULE (STRICT): Do not use em dashes (the "—" character) anywhere in your response. Do not use en dashes (the "–" character) as a substitute. Use a comma for in-line clauses, or a colon for label-and-elaboration pairs. This rule overrides the model's default punctuation preferences and applies to every sentence you write.`;
