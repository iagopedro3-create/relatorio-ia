-- Remove o schema single-tenant de 04/08/2026 (guardado em
-- supabase/legacy-single-tenant/) para dar lugar ao schema multi-tenant.
-- Nunca teve dado real (0 usuários, 0 linhas em 11/09/2026). Idempotente.
--
-- Já aplicada em produção (projeto axnfmsyfqlnsevucsiaz) em 11/09/2026 via
-- MCP, junto com as duas migrações seguintes.
drop view if exists public.enrollment_evaluation;
drop table if exists public.grade_entries cascade;
drop table if exists public.lesson_entries cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.teacher_assignments cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.students cascade;
drop table if exists public.classes cascade;
drop table if exists public.school_years cascade;
drop table if exists public.profiles cascade;
drop function if exists app.e_gestao();
drop function if exists app.minhas_turmas();
drop function if exists app.meu_papel();
drop function if exists public.e_gestao();
drop function if exists public.minhas_turmas();
drop function if exists public.meu_papel();
drop function if exists public.touch_updated_at();
drop type if exists public.attendance_status;
drop type if exists public.teacher_specialty;
drop type if exists public.evaluation_type;
drop type if exists public.school_level;
drop type if exists public.user_role;
