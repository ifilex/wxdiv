/**
 * App State Management, Router, Event Bus, SQLite Engine & API Client for WXDIV 3.0
 */

export interface StoreWatcher {
  id: string;
  path: string;
  callback: (newValue: any, oldValue: any) => void;
}

export interface ConditionWatcher {
  id: string;
  check: () => boolean;
  action: () => void;
  lastState?: boolean;
}

export interface SqliteTable {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

export class AppStore {
  private state: Record<string, any> = {};
  private watchers: StoreWatcher[] = [];
  private conditionWatchers: ConditionWatcher[] = [];
  private eventListeners: Map<string, Array<(payload?: any) => void>> = new Map();
  private elementClickHandlers: Map<string, () => void> = new Map();
  private formSubmitHandlers: Map<string, (data: any) => void> = new Map();
  private routeListeners: Array<(route: string, params: any) => void> = [];
  public onStateMutated?: () => void;

  // Routing
  public currentRoute: string = "home";
  public routeParams: Record<string, any> = {};

  // Relational SQLite Storage
  public activeDbName: string = "app.db";
  private databases: Map<string, Map<string, SqliteTable>> = new Map();

  // Auth & Token
  private currentUser: any = null;
  private authToken: string | null = null;

  constructor() {
    this.initDefaultState();
    this.loadPersistedAuth();
  }

  private initDefaultState() {
    this.state = {
      user: {
        id: "",
        nombre: "",
        email: "",
        logged: false,
      },
      app: {
        name: "DIV Multiplatform App",
        theme: "dark",
        version: "1.0.0",
      },
      data: {},
    };
  }

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  public store_create(name: string, initialData: Record<string, any>) {
    this.state[name] = { ...initialData };
    this.notifyWatchers(name, this.state[name], undefined);
    this.onStateMutated?.();
  }

  public store_get(path: string, defaultValue: any = undefined): any {
    if (!path) return this.state;
    const parts = path.split(".");
    let curr = this.state;
    for (const part of parts) {
      if (curr === undefined || curr === null) return defaultValue;
      curr = curr[part];
    }
    return curr !== undefined ? curr : defaultValue;
  }

  public store_set(path: string, value: any): void {
    if (!path) return;
    const parts = path.split(".");
    let curr = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!curr[part] || typeof curr[part] !== "object") {
        curr[part] = {};
      }
      curr = curr[part];
    }
    const lastKey = parts[parts.length - 1];
    const oldValue = curr[lastKey];
    curr[lastKey] = value;

    this.notifyWatchers(path, value, oldValue);
    this.checkConditions();
    this.onStateMutated?.();
  }

  public store_update(path: string, updater: (currVal: any) => any): void {
    const current = this.store_get(path);
    this.store_set(path, updater(current));
  }

  public store_watch(path: string, callback: (newVal: any, oldVal: any) => void): string {
    const id = `watch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.watchers.push({ id, path, callback });
    return id;
  }

  public onDataChange(path: string, callback: (newVal: any, oldVal: any) => void): string {
    return this.store_watch(path, callback);
  }

  public unwatch(id: string): void {
    this.watchers = this.watchers.filter((w) => w.id !== id);
  }

  public watchCondition(check: () => boolean, action: () => void): string {
    const id = `cond_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.conditionWatchers.push({ id, check, action, lastState: false });
    return id;
  }

  private notifyWatchers(path: string, newVal: any, oldVal: any) {
    for (const w of this.watchers) {
      if (w.path === path || path.startsWith(w.path + ".") || w.path.startsWith(path + ".")) {
        try {
          w.callback(this.store_get(w.path), oldVal);
        } catch (e) {
          console.error("[AppStore] Error in watcher:", e);
        }
      }
    }
  }

  public checkConditions() {
    for (const cw of this.conditionWatchers) {
      try {
        const passes = cw.check();
        if (passes && !cw.lastState) {
          cw.lastState = true;
          cw.action();
        } else if (!passes) {
          cw.lastState = false;
        }
      } catch (e) {
        console.error("[AppStore] Error checking condition:", e);
      }
    }
  }

  // --------------------------------------------------------------------------
  // ROUTING & NAVIGATION
  // --------------------------------------------------------------------------

  public navigate(route: string, params: Record<string, any> = {}): void {
    this.currentRoute = route;
    this.routeParams = params;
    this.store_set("app.currentRoute", route);

    for (const cb of this.routeListeners) {
      try {
        cb(route, params);
      } catch (e) {
        console.error("[AppStore] Error in route listener:", e);
      }
    }
    this.emit("route_change", { route, params });
  }

  public onRouteChange(callback: (route: string, params: any) => void): void {
    this.routeListeners.push(callback);
  }

  // --------------------------------------------------------------------------
  // EVENT BUS & UI BINDINGS
  // --------------------------------------------------------------------------

  public onClick(elementId: string, callback: () => void): void {
    this.elementClickHandlers.set(elementId, callback);
  }

  public triggerClick(elementId: string): void {
    const fn = this.elementClickHandlers.get(elementId);
    if (fn) {
      try {
        fn();
      } catch (e) {
        console.error(`[AppStore] Error in onClick('${elementId}'):`, e);
      }
    }
  }

  public onSubmit(formId: string, callback: (data: any) => void): void {
    this.formSubmitHandlers.set(formId, callback);
  }

  public triggerSubmit(formId: string, data: any): void {
    const fn = this.formSubmitHandlers.get(formId);
    if (fn) {
      try {
        fn(data);
      } catch (e) {
        console.error(`[AppStore] Error in onSubmit('${formId}'):`, e);
      }
    }
  }

  public emit(event: string, payload?: any): void {
    const list = this.eventListeners.get(event);
    if (list) {
      for (const fn of list) {
        try {
          fn(payload);
        } catch (e) {
          console.error(`[AppStore] Error in event '${event}':`, e);
        }
      }
    }
  }

  public on(event: string, callback: (payload?: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: (payload?: any) => void): void {
    if (!callback) {
      this.eventListeners.delete(event);
    } else {
      const list = this.eventListeners.get(event);
      if (list) {
        this.eventListeners.set(
          event,
          list.filter((fn) => fn !== callback)
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // DATA PERSISTENCE (JSON & LocalStorage / Virtual FS)
  // --------------------------------------------------------------------------

  public save_json(filename: string, data: any): boolean {
    try {
      const key = `wxdiv_app_${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      this.store_set(`storage.${filename}`, data);
      return true;
    } catch (e) {
      console.error(`[AppStore] save_json failed for '${filename}':`, e);
      return false;
    }
  }

  public load_json(filename: string, defaultValue: any = null): any {
    try {
      const key = `wxdiv_app_${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`[AppStore] load_json failed for '${filename}', using fallback:`, e);
    }
    return defaultValue;
  }

  // --------------------------------------------------------------------------
  // RELATIONAL SQLITE ENGINE (Lightweight in-browser SQL)
  // --------------------------------------------------------------------------

  public load_sqlite(dbName: string = "app.db"): boolean {
    this.activeDbName = dbName;
    if (!this.databases.has(dbName)) {
      const dbTables = new Map<string, SqliteTable>();
      // Try restoring from storage
      const saved = this.load_json(`db_${dbName}`, null);
      if (saved && typeof saved === "object") {
        for (const [tblName, tblData] of Object.entries(saved as Record<string, SqliteTable>)) {
          dbTables.set(tblName, tblData);
        }
      }
      this.databases.set(dbName, dbTables);
    }
    return true;
  }

  public sqlite_query(sql: string, params: any[] = []): any[] {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();
    const db = this.databases.get(this.activeDbName) || new Map<string, SqliteTable>();
    this.databases.set(this.activeDbName, db);

    // 1. CREATE TABLE
    if (upper.startsWith("CREATE TABLE")) {
      const match = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const colsRaw = match[2].split(",").map((c) => c.trim().split(/\s+/)[0]);
        if (!db.has(tableName)) {
          db.set(tableName, { name: tableName, columns: colsRaw, rows: [] });
          this.persistSqliteDb();
        }
        return [];
      }
    }

    // 2. INSERT INTO
    if (upper.startsWith("INSERT INTO")) {
      const match = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        let colNames: string[] = [];
        if (match[2]) {
          colNames = match[2].split(",").map((c) => c.trim().replace(/['"`]/g, ""));
        }
        const valuesRaw = match[3].split(",").map((v) => {
          const val = v.trim();
          if (val === "?") return params.shift();
          if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
          if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
          if (val.toLowerCase() === "true") return true;
          if (val.toLowerCase() === "false") return false;
          if (!isNaN(Number(val))) return Number(val);
          return val;
        });

        const table = db.get(tableName) || { name: tableName, columns: colNames, rows: [] };
        if (!db.has(tableName)) db.set(tableName, table);

        const newRow: Record<string, any> = {};
        if (colNames.length > 0) {
          colNames.forEach((col, idx) => {
            newRow[col] = valuesRaw[idx];
          });
        } else {
          table.columns.forEach((col, idx) => {
            newRow[col] = valuesRaw[idx];
          });
        }
        if (!newRow.id) {
          newRow.id = table.rows.length + 1;
        }
        table.rows.push(newRow);
        this.persistSqliteDb();
        return [newRow];
      }
    }

    // 3. SELECT
    if (upper.startsWith("SELECT")) {
      const match = trimmed.match(/SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i);
      if (match) {
        const fields = match[1].trim();
        const tableName = match[2].trim();
        const whereClause = match[3]?.trim();
        const limit = match[5] ? parseInt(match[5], 10) : undefined;

        const table = db.get(tableName);
        if (!table) return [];

        let result = [...table.rows];

        // Simple WHERE filters: e.g. active = 1 or nombre = 'Juan'
        if (whereClause) {
          const eqMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<)\s*(.+)/);
          if (eqMatch) {
            const col = eqMatch[1].trim();
            const op = eqMatch[2].trim();
            let targetVal: any = eqMatch[3].trim().replace(/^['"]|['"]$/g, "");
            if (targetVal === "?") targetVal = params.shift();
            else if (!isNaN(Number(targetVal))) targetVal = Number(targetVal);

            result = result.filter((row) => {
              const val = row[col];
              if (op === "=") return String(val) === String(targetVal);
              if (op === "!=") return String(val) !== String(targetVal);
              if (op === ">") return Number(val) > Number(targetVal);
              if (op === "<") return Number(val) < Number(targetVal);
              return true;
            });
          }
        }

        if (limit) {
          result = result.slice(0, limit);
        }

        if (fields !== "*") {
          const wantedCols = fields.split(",").map((c) => c.trim());
          result = result.map((r) => {
            const projected: Record<string, any> = {};
            for (const col of wantedCols) {
              projected[col] = r[col];
            }
            return projected;
          });
        }

        return result;
      }
    }

    // 4. UPDATE
    if (upper.startsWith("UPDATE")) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*?))?$/i);
      if (match) {
        const tableName = match[1];
        const setAssignments = match[2].split(",").map((a) => a.trim());
        const whereClause = match[3]?.trim();

        const table = db.get(tableName);
        if (!table) return [];

        let affected = 0;
        for (const row of table.rows) {
          let matches = true;
          if (whereClause) {
            const eqMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*(=)\s*(.+)/);
            if (eqMatch) {
              const col = eqMatch[1];
              const val = eqMatch[3].trim().replace(/^['"]|['"]$/g, "");
              matches = String(row[col]) === String(val);
            }
          }

          if (matches) {
            for (const assign of setAssignments) {
              const [k, v] = assign.split("=").map((s) => s.trim());
              let valParsed: any = v.replace(/^['"]|['"]$/g, "");
              if (!isNaN(Number(valParsed))) valParsed = Number(valParsed);
              row[k] = valParsed;
            }
            affected++;
          }
        }

        this.persistSqliteDb();
        return [{ affectedRows: affected }];
      }
    }

    // 5. DELETE FROM
    if (upper.startsWith("DELETE FROM")) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*?))?$/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2]?.trim();
        const table = db.get(tableName);
        if (!table) return [];

        if (!whereClause) {
          const count = table.rows.length;
          table.rows = [];
          this.persistSqliteDb();
          return [{ deletedRows: count }];
        }

        const eqMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*(=)\s*(.+)/);
        if (eqMatch) {
          const col = eqMatch[1];
          const val = eqMatch[3].trim().replace(/^['"]|['"]$/g, "");
          const before = table.rows.length;
          table.rows = table.rows.filter((r) => String(r[col]) !== String(val));
          this.persistSqliteDb();
          return [{ deletedRows: before - table.rows.length }];
        }
      }
    }

    return [];
  }

  private persistSqliteDb() {
    try {
      const db = this.databases.get(this.activeDbName);
      if (!db) return;
      const serializable: Record<string, SqliteTable> = {};
      for (const [tblName, tblObj] of db.entries()) {
        serializable[tblName] = tblObj;
      }
      this.save_json(`db_${this.activeDbName}`, serializable);
    } catch (e) {
      console.error("[AppStore] Error persisting sqlite db:", e);
    }
  }

  // --------------------------------------------------------------------------
  // ASYNC FETCH & NETWORKING
  // --------------------------------------------------------------------------

  public async fetch_api(
    url: string,
    options: RequestInit = {},
    callback?: (data: any, error?: any) => void
  ): Promise<any> {
    try {
      const headers = new Headers(options.headers || {});
      if (this.authToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${this.authToken}`);
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (callback) {
        callback(data, null);
      }
      return data;
    } catch (err) {
      console.error(`[AppStore] fetch_api failed for '${url}':`, err);
      if (callback) {
        callback(null, err);
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATION & SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  public auth_login(user: string, token: string = "token_" + Date.now()): void {
    this.currentUser = {
      username: user,
      email: `${user}@divgames.app`,
      logged: true,
      lastLogin: new Date().toISOString(),
    };
    this.authToken = token;

    this.store_set("user", this.currentUser);
    this.save_json("auth_session.json", { user: this.currentUser, token: this.authToken });
    this.emit("auth_login", this.currentUser);
  }

  public auth_logout(): void {
    this.currentUser = null;
    this.authToken = null;
    this.store_set("user", { logged: false, nombre: "", email: "" });
    this.save_json("auth_session.json", null);
    this.emit("auth_logout");
    this.navigate("login");
  }

  public auth_get_user(): any {
    return this.currentUser;
  }

  public auth_get_token(): string | null {
    return this.authToken;
  }

  private loadPersistedAuth() {
    const session = this.load_json("auth_session.json", null);
    if (session && session.user && session.token) {
      this.currentUser = session.user;
      this.authToken = session.token;
      this.store_set("user", session.user);
    }
  }
}

export const appStore = new AppStore();
