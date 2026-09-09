import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const uCount = await sql`SELECT count(*) FROM users`;
const bCount = await sql`SELECT count(*) FROM businesses`;
console.log({ users: uCount[0].count, businesses: bCount[0].count });
const bList = await sql`SELECT id, name, slug FROM businesses LIMIT 10`;
console.log(bList);
