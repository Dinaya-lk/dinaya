import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
try {
  const users = await sql`SELECT id, email, name, role FROM users LIMIT 10`;
  console.log("Users:", users);
  const businesses = await sql`SELECT id, name, slug FROM businesses LIMIT 5`;
  console.log("Businesses:", businesses);
} catch (err) {
  console.error(err);
}
