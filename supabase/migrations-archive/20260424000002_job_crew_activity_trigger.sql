-- Attach the auto-activity trigger to job_crew.
--
-- The original bootstrap in 20260418000007 covered jobs, job_notes,
-- job_documents, and change orders but skipped crew assignments. The
-- result was that adding / removing / swapping a crew member never
-- reached activity_log and the job's activity tab stayed quiet even
-- though staffing had shifted. This migration plugs the gap; the
-- attach_activity_trigger helper was dropped after the bootstrap so
-- we invoke log_entity_activity directly.

DROP TRIGGER IF EXISTS trg_activity_job_crew ON job_crew;
CREATE TRIGGER trg_activity_job_crew
  AFTER INSERT OR UPDATE OR DELETE ON job_crew
  FOR EACH ROW EXECUTE FUNCTION log_entity_activity('job_crew');
