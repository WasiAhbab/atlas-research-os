-- Run once in Supabase SQL Editor. Keep atlas out of the exposed API schemas.
BEGIN;
CREATE SCHEMA atlas;
SET LOCAL search_path=atlas,public;
CREATE TABLE IF NOT EXISTS projects (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_path TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, path),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  checkpoint_json TEXT NOT NULL DEFAULT '{}',
  state_json TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  parent_session_id TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS findings (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  folder_path TEXT,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  source_urls_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  folder_path TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'filed', confidence REAL NOT NULL DEFAULT 1, rationale TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clarifications (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  suggested_path TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  resolution_path TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(finding_id) REFERENCES findings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT,
  project_id TEXT,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  severity TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS limitations (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT,
  project_id TEXT,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS providers (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  preset_id TEXT NOT NULL DEFAULT 'custom',
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  base_url TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL DEFAULT '',
  web_search_enabled INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'untested',
  last_error TEXT,
  last_tested_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_calls (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT PRIMARY KEY,
  session_id TEXT,
  project_id TEXT,
  provider_id TEXT,
  provider_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  model TEXT NOT NULL,
  success INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_clarifications (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, project_id TEXT NOT NULL,
      resource_id TEXT NOT NULL REFERENCES resources(id), reason TEXT NOT NULL,
      suggested_path TEXT NOT NULL, confidence REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      resolution_path TEXT, created_at TEXT NOT NULL, resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
      id TEXT PRIMARY KEY, project_id TEXT, session_id TEXT, source_id TEXT,
      title TEXT NOT NULL, detail TEXT NOT NULL, severity TEXT NOT NULL,
      destination TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
    );
    CREATE TABLE IF NOT EXISTS session_leases (
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
      session_id TEXT PRIMARY KEY REFERENCES sessions(id), owner TEXT NOT NULL,
      expires_at TEXT NOT NULL, pause_requested INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS session_history ON sessions(project_id, started_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS activity_history ON activity_logs(project_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS notification_history ON notifications(project_id, created_at DESC, id DESC);

ALTER TABLE app_settings ADD PRIMARY KEY(owner_id,key);
ALTER TABLE notifications ADD UNIQUE(owner_id,source_id);
CREATE TABLE search_index (
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 entity_type text NOT NULL,entity_id text NOT NULL,title text NOT NULL,body text NOT NULL,path text NOT NULL,
 document tsvector GENERATED ALWAYS AS (to_tsvector('english',coalesce(title,'') || ' ' || coalesce(body,'') || ' ' || coalesce(path,''))) STORED,
 PRIMARY KEY(owner_id,entity_type,entity_id)
);
CREATE INDEX search_document ON search_index USING gin(document);
CREATE TABLE research_jobs (
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 id text PRIMARY KEY, project_id text NOT NULL, session_id text NOT NULL,
 status text NOT NULL DEFAULT 'queued', generation integer NOT NULL DEFAULT 1,
 provider_id text NOT NULL DEFAULT 'auto', failed_providers text NOT NULL DEFAULT '[]',
 pause_requested integer NOT NULL DEFAULT 0, workflow_id text, updated_at text NOT NULL,
 UNIQUE(owner_id,session_id)
);
CREATE UNIQUE INDEX one_active_job_per_project ON research_jobs(owner_id,project_id) WHERE status IN ('queued','running');
CREATE TABLE api_limits(owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,bucket text NOT NULL,window_start timestamptz NOT NULL DEFAULT now(),requests int NOT NULL DEFAULT 1,PRIMARY KEY(owner_id,bucket));

ALTER TABLE api_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_limits FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON api_limits FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON projects FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX projects_owner ON projects(owner_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON folders FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX folders_owner ON folders(owner_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON sessions FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX sessions_owner ON sessions(owner_id);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON findings FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX findings_owner ON findings(owner_id);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON resources FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX resources_owner ON resources(owner_id);

ALTER TABLE clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON clarifications FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX clarifications_owner ON clarifications(owner_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON activity_logs FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX activity_logs_owner ON activity_logs(owner_id);

ALTER TABLE limitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON limitations FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX limitations_owner ON limitations(owner_id);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON decisions FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX decisions_owner ON decisions(owner_id);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON providers FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX providers_owner ON providers(owner_id);

ALTER TABLE provider_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_calls FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON provider_calls FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX provider_calls_owner ON provider_calls(owner_id);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON app_settings FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX app_settings_owner ON app_settings(owner_id);

ALTER TABLE resource_clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_clarifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON resource_clarifications FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX resource_clarifications_owner ON resource_clarifications(owner_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON notifications FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX notifications_owner ON notifications(owner_id);

ALTER TABLE session_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_leases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON session_leases FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX session_leases_owner ON session_leases(owner_id);

ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON search_index FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX search_index_owner ON search_index(owner_id);

ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON research_jobs FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE INDEX research_jobs_owner ON research_jobs(owner_id);
ALTER TABLE projects ADD UNIQUE(owner_id,id);
ALTER TABLE folders ADD UNIQUE(owner_id,id);
ALTER TABLE sessions ADD UNIQUE(owner_id,id);
ALTER TABLE findings ADD UNIQUE(owner_id,id);
ALTER TABLE resources ADD UNIQUE(owner_id,id);
ALTER TABLE clarifications ADD UNIQUE(owner_id,id);
ALTER TABLE activity_logs ADD UNIQUE(owner_id,id);
ALTER TABLE limitations ADD UNIQUE(owner_id,id);
ALTER TABLE decisions ADD UNIQUE(owner_id,id);
ALTER TABLE providers ADD UNIQUE(owner_id,id);
ALTER TABLE provider_calls ADD UNIQUE(owner_id,id);
ALTER TABLE resource_clarifications ADD UNIQUE(owner_id,id);
ALTER TABLE notifications ADD UNIQUE(owner_id,id);
ALTER TABLE research_jobs ADD UNIQUE(owner_id,id);
ALTER TABLE folders ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE sessions ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE findings ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE findings ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE resources ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE resources ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE clarifications ADD FOREIGN KEY(owner_id,finding_id) REFERENCES findings(owner_id,id) ON DELETE CASCADE;
ALTER TABLE resource_clarifications ADD FOREIGN KEY(owner_id,resource_id) REFERENCES resources(owner_id,id) ON DELETE CASCADE;
ALTER TABLE decisions ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE research_jobs ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE research_jobs ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE session_leases ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE clarifications ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE clarifications ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE resource_clarifications ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE resource_clarifications ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE limitations ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE limitations ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE provider_calls ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE provider_calls ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;
ALTER TABLE notifications ADD FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE;
ALTER TABLE notifications ADD FOREIGN KEY(owner_id,session_id) REFERENCES sessions(owner_id,id) ON DELETE CASCADE;

GRANT USAGE ON SCHEMA atlas TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA atlas TO authenticated;
REVOKE ALL ON SCHEMA atlas FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA atlas FROM anon;

CREATE TABLE documents(owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,id text PRIMARY KEY,project_id text NOT NULL,path text NOT NULL,body text NOT NULL,FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON documents FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON documents TO authenticated;
CREATE INDEX documents_owner ON documents(owner_id);
COMMIT;
