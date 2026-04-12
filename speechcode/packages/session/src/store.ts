import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs, { type BindParams, type Database, type SqlJsStatic } from "sql.js";
import { DEFAULT_SETTINGS, STEP_MESSAGES } from "@speechcode/shared";
import type {
  AppSettings,
  DashboardData,
  DashboardSession,
  SaveSettingsInput,
  SessionRecord,
  SessionStatus,
  SessionStepRecord,
  StepStatus,
  TargetKind
} from "@speechcode/types";

const require = createRequire(
  typeof __filename !== "undefined"
    ? __filename
    : path.join(process.cwd(), "speechcode-session-loader.cjs")
);

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function toObject<T extends Record<string, unknown>>(row: T): T {
  return row;
}

export class SqliteSessionStore {
  private readonly dbPath: string;
  private database?: Database;

  constructor(dataDirectory: string) {
    this.dbPath = path.join(dataDirectory, "speechcode.sqlite");
  }

  async init(): Promise<void> {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    const sql = await initSqlJs({
      locateFile: (file: string) =>
        path.join(path.dirname(require.resolve("sql.js/dist/sql-wasm.wasm")), file)
    });

    this.database = this.loadDatabase(sql);
    this.database.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        raw_input TEXT NOT NULL,
        cleaned_prompt TEXT NOT NULL,
        target TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_steps (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      this.setSettingValue(key, value);
    }
    this.persist();
  }

  private loadDatabase(sql: SqlJsStatic): Database {
    if (!fs.existsSync(this.dbPath)) {
      return new sql.Database();
    }

    const file = fs.readFileSync(this.dbPath);
    return new sql.Database(file);
  }

  private get db(): Database {
    if (!this.database) {
      throw new Error("Session store has not been initialized.");
    }

    return this.database;
  }

  private persist(): void {
    fs.writeFileSync(this.dbPath, Buffer.from(this.db.export()));
  }

  private select<T extends Record<string, unknown>>(
    query: string,
    params: BindParams = {}
  ): T[] {
    const statement = this.db.prepare(query);
    statement.bind(params);
    const rows: T[] = [];

    while (statement.step()) {
      rows.push(toObject(statement.getAsObject() as T));
    }

    statement.free();
    return rows;
  }

  private run(query: string, params: BindParams = {}): void {
    this.db.run(query, params);
    this.persist();
  }

  private setSettingValue(key: string, value: unknown): void {
    const existing = this.select<{ key: string }>(
      "SELECT key FROM settings WHERE key = :key",
      { ":key": key }
    );

    if (existing.length > 0) {
      return;
    }

    this.db.run(
      "INSERT INTO settings (key, value) VALUES (:key, :value)",
      { ":key": key, ":value": JSON.stringify(value) }
    );
  }

  async getSettings(): Promise<AppSettings> {
    const rows = this.select<{ key: string; value: string }>(
      "SELECT key, value FROM settings"
    );

    const values = Object.fromEntries(
      rows.map((row) => [row.key, JSON.parse(row.value)])
    );

    return {
      ...DEFAULT_SETTINGS,
      ...values
    } as AppSettings;
  }

  async saveSettings(input: SaveSettingsInput): Promise<AppSettings> {
    for (const [key, value] of Object.entries(input)) {
      this.run(
        `
          INSERT INTO settings (key, value)
          VALUES (:key, :value)
          ON CONFLICT(key) DO UPDATE SET value = :value
        `,
        { ":key": key, ":value": JSON.stringify(value) }
      );
    }

    return this.getSettings();
  }

  async createSession(input: {
    rawInput: string;
    cleanedPrompt: string;
    target: TargetKind;
    mode: AppSettings["mode"];
    status: SessionStatus;
  }): Promise<SessionRecord> {
    const createdAt = now();
    const session: SessionRecord = {
      id: createId("session"),
      rawInput: input.rawInput,
      cleanedPrompt: input.cleanedPrompt,
      target: input.target,
      mode: input.mode,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    };

    this.run(
      `
        INSERT INTO sessions (
          id,
          raw_input,
          cleaned_prompt,
          target,
          mode,
          status,
          created_at,
          updated_at
        ) VALUES (
          :id,
          :raw_input,
          :cleaned_prompt,
          :target,
          :mode,
          :status,
          :created_at,
          :updated_at
        )
      `,
      {
        ":id": session.id,
        ":raw_input": session.rawInput,
        ":cleaned_prompt": session.cleanedPrompt,
        ":target": session.target,
        ":mode": session.mode,
        ":status": session.status,
        ":created_at": session.createdAt,
        ":updated_at": session.updatedAt
      }
    );

    return session;
  }

  async addSessionStep(input: {
    sessionId: string;
    stepName: string;
    status: StepStatus;
    message?: string;
  }): Promise<SessionStepRecord> {
    const step: SessionStepRecord = {
      id: createId("step"),
      sessionId: input.sessionId,
      stepName: input.stepName,
      status: input.status,
      message: input.message ?? STEP_MESSAGES[input.stepName] ?? input.stepName,
      timestamp: now()
    };

    this.run(
      `
        INSERT INTO session_steps (
          id,
          session_id,
          step_name,
          status,
          message,
          timestamp
        ) VALUES (
          :id,
          :session_id,
          :step_name,
          :status,
          :message,
          :timestamp
        )
      `,
      {
        ":id": step.id,
        ":session_id": step.sessionId,
        ":step_name": step.stepName,
        ":status": step.status,
        ":message": step.message,
        ":timestamp": step.timestamp
      }
    );

    return step;
  }

  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    this.run(
      `
        UPDATE sessions
        SET status = :status, updated_at = :updated_at
        WHERE id = :id
      `,
      { ":status": status, ":updated_at": now(), ":id": sessionId }
    );
  }

  private mapSessionRow(row: {
    id: string;
    raw_input: string;
    cleaned_prompt: string;
    target: TargetKind;
    mode: AppSettings["mode"];
    status: SessionStatus;
    created_at: string;
    updated_at: string;
  }): SessionRecord {
    return {
      id: row.id,
      rawInput: row.raw_input,
      cleanedPrompt: row.cleaned_prompt,
      target: row.target,
      mode: row.mode,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapStepRow(row: {
    id: string;
    session_id: string;
    step_name: string;
    status: StepStatus;
    message: string;
    timestamp: string;
  }): SessionStepRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      stepName: row.step_name,
      status: row.status,
      message: row.message,
      timestamp: row.timestamp
    };
  }

  async getDashboardData(selectedSessionId?: string | null): Promise<DashboardData> {
    const sessions = this.select<{
      id: string;
      raw_input: string;
      cleaned_prompt: string;
      target: TargetKind;
      mode: AppSettings["mode"];
      status: SessionStatus;
      created_at: string;
      updated_at: string;
    }>("SELECT * FROM sessions ORDER BY datetime(updated_at) DESC").map((row) =>
      this.mapSessionRow(row)
    );

    const sessionIds = sessions.map((session) => session.id);
    const steps = sessionIds.length
      ? this.select<{
          id: string;
          session_id: string;
          step_name: string;
          status: StepStatus;
          message: string;
          timestamp: string;
        }>(
          `
            SELECT *
            FROM session_steps
            WHERE session_id IN (${sessionIds.map((_, index) => `:id${index}`).join(", ")})
            ORDER BY datetime(timestamp) ASC
          `,
          Object.fromEntries(sessionIds.map((id, index) => [`:id${index}`, id]))
        ).map((row) => this.mapStepRow(row))
      : [];

    const stepsBySession = new Map<string, SessionStepRecord[]>();
    for (const step of steps) {
      const existing = stepsBySession.get(step.sessionId) ?? [];
      existing.push(step);
      stepsBySession.set(step.sessionId, existing);
    }

    const dashboardSessions: DashboardSession[] = sessions.map((session) => ({
      ...session,
      steps: stepsBySession.get(session.id) ?? []
    }));

    const activeSessionId =
      selectedSessionId && dashboardSessions.some((session) => session.id === selectedSessionId)
        ? selectedSessionId
        : dashboardSessions[0]?.id ?? null;

    const currentStatus =
      dashboardSessions.find((session) => session.id === activeSessionId)?.steps.at(-1)?.message ??
      "Ready for your next request";

    return {
      sessions: dashboardSessions,
      selectedSessionId: activeSessionId,
      currentStatus
    };
  }
}
