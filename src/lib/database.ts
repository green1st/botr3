import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'database', 'wallets.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Database directory created at: ${dbDir}`);
}

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to database at:', DB_PATH);
      }
    });
    this.initTables();
  }

  private initTables(): void {
    const createWalletsTable = `
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        encrypted_secret TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createMasterWalletTable = `
      CREATE TABLE IF NOT EXISTS master_wallet (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.serialize(() => {
      this.db.run(createWalletsTable, (err) => {
        if (err) console.error('Error creating wallets table:', err);
        else console.log('Wallets table checked/created.');
      });
      this.db.run(createMasterWalletTable, (err) => {
        if (err) console.error('Error creating master_wallet table:', err);
        else console.log('Master wallet table checked/created.');
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error running SQL:', sql, err);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  public get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error getting SQL:', sql, err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error getting all SQL:', sql, err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  public close(): void {
    this.db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed.');
    });
  }
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}


