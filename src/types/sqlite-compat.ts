import initSqlJs from "sql.js";
import * as fs from "node:fs";

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementSync {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): RunResult;
}

let SQL: any = null;

export async function ensureSqlJs(): Promise<any> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export class DatabaseSync {
  private db: any;
  private filePath: string | null = null;
  public inTransaction: boolean = false;

  constructor(location: string, sqlEngine?: any) {
    const engine = sqlEngine || SQL;
    if (!engine) {
      throw new Error("SqlJs engine not initialized before creating DatabaseSync instance");
    }

    if (location === ":memory:") {
      this.filePath = null;
      this.db = new engine.Database();
    } else {
      this.filePath = location;
      if (fs.existsSync(location)) {
        const buffer = fs.readFileSync(location);
        this.db = new engine.Database(buffer);
      } else {
        this.db = new engine.Database();
        this.persist();
      }
    }
  }

  public persist(): void {
    if (this.inTransaction) return; // Do not export while SQLite write transaction is active
    if (this.filePath && this.db) {
      try {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.filePath, buffer);
      } catch (err: any) {
        // Suppress busy export error while transaction commits
      }
    }
  }

  public close(): void {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
    }
  }

  public exec(sql: string): void {
    if (!this.db) return;
    this.db.run(sql);
    this.persist();
  }

  public prepare(sql: string): StatementSync {
    const db = this.db;
    const persistFn = () => this.persist();

    return {
      all(...params: any[]): any[] {
        const stmt = db.prepare(sql);
        try {
          if (params && params.length > 0) {
            stmt.bind(params);
          }
          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },
      get(...params: any[]): any {
        const stmt = db.prepare(sql);
        try {
          if (params && params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return null;
        } finally {
          stmt.free();
        }
      },
      run(...params: any[]): RunResult {
        const stmt = db.prepare(sql);
        try {
          if (params && params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          persistFn();

          let lastInsertRowid: number = 0;
          let changes: number = 0;
          try {
            const rowIdRes = db.exec("SELECT last_insert_rowid() AS id, changes() AS chg");
            if (rowIdRes && rowIdRes.length > 0 && rowIdRes[0].values.length > 0) {
              lastInsertRowid = rowIdRes[0].values[0][0];
              changes = rowIdRes[0].values[0][1];
            }
          } catch {
            // ignore
          }

          return {
            changes,
            lastInsertRowid,
          };
        } finally {
          stmt.free();
        }
      },
    };
  }
}
