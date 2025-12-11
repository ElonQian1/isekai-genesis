import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database;

export async function initDB() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0
    );
  `);
  
  console.log('Database initialized');
}

export function getDB() {
  return db;
}
