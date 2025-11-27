// src/db/client.ts
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "app.db");

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// 외래키 활성화
db.pragma("foreign_keys = ON");

// 여기서 모든 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id    TEXT PRIMARY KEY,   -- Discord providerAccountId
    name  TEXT,
    email TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS parties (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    memo       TEXT,
    owner_id   TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS party_members (
    party_id  INTEGER NOT NULL,
    user_id   TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'member', -- 'owner' / 'member'
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (party_id, user_id),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ★ 내 숙제 페이지 전체 상태를 유저별로 들고 있는 테이블
  CREATE TABLE IF NOT EXISTS raid_task_state (
    user_id    TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);



