import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const bizId = "49991bab-1b95-4001-855a-e38372f9bf85";
const staff = await sql`SELECT id, name FROM staff WHERE business_id = ${bizId}`;
const services = await sql`SELECT id, name FROM services WHERE business_id = ${bizId}`;
const bookings = await sql`SELECT id, client_name, status FROM bookings WHERE business_id = ${bizId}`;
console.log({ staff: staff.length, services: services.length, bookings: bookings.length });
