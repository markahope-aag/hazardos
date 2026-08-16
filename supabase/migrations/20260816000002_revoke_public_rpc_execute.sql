-- Revoke EXECUTE on the SECURITY DEFINER functions that an unauthenticated
-- caller could actually invoke.
--
-- The Supabase linter flagged roughly sixty functions as callable via
-- /rest/v1/rpc. Most of that is noise: the trigger functions (update_*_stats,
-- queue_*_event, guard_*_delete, the create_default_* trigger wrappers) return
-- `trigger`, and PostgREST refuses them with PGRST202, so they were never
-- reachable. Probing each one with the anon key narrowed the list to four that
-- genuinely execute for a caller who has never signed in:
--
--   refresh_report_views()               returned OK. Anyone could force a
--                                        materialized view refresh on demand,
--                                        repeatedly, which is a cheap way to
--                                        burn database CPU.
--   reset_query_performance_stats()      returned OK. Anyone could wipe the
--                                        query performance history the platform
--                                        admin screens rely on.
--   create_default_message_templates()   returned OK, and takes org_id as a
--                                        parameter, so the caller chooses which
--                                        organization to write template rows
--                                        into.
--   generate_lab_report_number()         returned "LR-2026-001", and also takes
--                                        org_id, so the caller can advance
--                                        another organization's lab report
--                                        sequence.
--
-- The anon key ships in the browser, so "unauthenticated" here means anyone at
-- all, not merely a logged-out user of ours.
--
-- reporting-service.ts already carries a comment saying refresh_report_views is
-- "locked to service_role per the security lockdown migration". It is not, which
-- suggests those grants were lost when the migration chain was squashed into the
-- 2026-08-03 baseline (grant and revoke state is easy to drop in a schema dump).
-- Worth keeping in mind if other lockdowns from that era are assumed to be live.
--
-- Callers checked before revoking, so nothing legitimate breaks:
--   refresh_report_views            -> reporting-service.ts uses createAdminClient()
--   reset_query_performance_stats   -> the platform-admin route uses createAdminClient()
--   create_default_message_templates-> only ever called by its new-org trigger
--   generate_lab_report_number      -> app/api/lab-reports uses context.supabase,
--                                      the signed-in user's client, so
--                                      `authenticated` KEEPS execute here and
--                                      only `anon` loses it.

REVOKE ALL ON FUNCTION "public"."refresh_report_views"() FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."reset_query_performance_stats"() FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."create_default_message_templates"("org_id" "uuid") FROM "anon", "authenticated";

-- Lab report creation runs as the signed-in user, so this one only loses anon.
REVOKE ALL ON FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") FROM "anon";
