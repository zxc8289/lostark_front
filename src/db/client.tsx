// src/db/client.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = "lostark";

if (!uri) {
  throw new Error("MONGODB_URI 환경변수가 설정되어 있지 않습니다.");
}

// Next.js 개발모드에서 핫리로드 때문에 global에 캐시
let clientPromise: Promise<MongoClient>;

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}

clientPromise = globalWithMongo._mongoClientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
