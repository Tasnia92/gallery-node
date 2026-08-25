import mysql from 'mysql2/promise';

// Simple database pool. Values come from environment variables
// (see .env.example). The database and tables must already exist
// (see schema.sql).

const host = process.env.DB_HOST || 'localhost';
const name = process.env.DB_NAME || 'userdb';
const user = process.env.DB_USER || 'appuser';
const pass = process.env.DB_PASS || 'apppass';

export const pool = mysql.createPool({
  host,
  database: name,
  user,
  password: pass,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

export interface ImageRow {
  id: number;
  user_id: number;
  file_name: string;
  title: string;
  created_at: Date;
}
