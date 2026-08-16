-- Finish the revoke started in 20260816000002, which had no effect.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- PUBLIC covers anon and authenticated. Revoking from those two roles while
-- PUBLIC still holds the privilege changes nothing, and verification confirmed
-- it: after that migration an unauthenticated caller still got
-- "LR-2026-001" out of generate_lab_report_number.
--
-- So revoke from PUBLIC as well, then grant back explicitly and only to the
-- roles that actually need it. Revoking from PUBLIC would otherwise take
-- service_role's access with it, which would break the admin-client callers in
-- reporting-service.ts and the platform-admin route.

REVOKE ALL ON FUNCTION "public"."refresh_report_views"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."refresh_report_views"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."reset_query_performance_stats"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reset_query_performance_stats"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_default_message_templates"("org_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_default_message_templates"("org_id" "uuid") TO "service_role";

-- Lab report creation runs as the signed-in user (app/api/lab-reports uses
-- context.supabase), so authenticated keeps this one and only anon loses it.
REVOKE ALL ON FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") TO "authenticated", "service_role";
