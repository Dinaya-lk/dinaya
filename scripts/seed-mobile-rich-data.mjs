import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);
const bizId = "49991bab-1b95-4001-855a-e38372f9bf85";

// Update business name to something realistic
await sql`UPDATE businesses SET name = 'Dinaya Luxury Salon & Spa', slug = 'dinaya-salon', plan = 'pro' WHERE id = ${bizId}`;

// Add more staff
const staffList = await sql`SELECT id, name FROM staff WHERE business_id = ${bizId}`;
let staff1 = staffList[0]?.id;
if (!staff1) {
  staff1 = randomUUID();
  await sql`INSERT INTO staff (id, business_id, name, is_active) VALUES (${staff1}, ${bizId}, 'Kasun Perera', true)`;
} else {
  await sql`UPDATE staff SET name = 'Kasun Perera' WHERE id = ${staff1}`;
}

const staff2 = randomUUID();
await sql`INSERT INTO staff (id, business_id, name, is_active) VALUES (${staff2}, ${bizId}, 'Amal Silva', true)`;

const staff3 = randomUUID();
await sql`INSERT INTO staff (id, business_id, name, is_active) VALUES (${staff3}, ${bizId}, 'Nisansala Fernando', true)`;

// Services
const servicesList = await sql`SELECT id, name FROM services WHERE business_id = ${bizId}`;
const s1 = servicesList[0]?.id;
const s2 = servicesList[1]?.id || s1;
const s3 = servicesList[2]?.id || s1;

// Clients
const c1 = randomUUID();
await sql`INSERT INTO clients (id, business_id, name, phone, email) VALUES (${c1}, ${bizId}, 'Rohan De Silva', '+94771122334', 'rohan@example.com')`;

const c2 = randomUUID();
await sql`INSERT INTO clients (id, business_id, name, phone, email) VALUES (${c2}, ${bizId}, 'Priya Jayawardena', '+94772233445', 'priya@example.com')`;

const c3 = randomUUID();
await sql`INSERT INTO clients (id, business_id, name, phone, email) VALUES (${c3}, ${bizId}, 'Saman Kumara', '+94773344556', 'saman@example.com')`;

const c4 = randomUUID();
await sql`INSERT INTO clients (id, business_id, name, phone, email) VALUES (${c4}, ${bizId}, 'Dinuka Perera', '+94774455667', 'dinuka@example.com')`;

// Bookings
const b1 = randomUUID();
await sql`INSERT INTO bookings (id, business_id, service_id, staff_id, client_id, client_name, client_email, client_phone, starts_at, ends_at, status, source)
VALUES (${b1}, ${bizId}, ${s1}, ${staff1}, ${c1}, 'Rohan De Silva', 'rohan@example.com', '+94771122334', ${new Date(Date.now() + 3600000).toISOString()}, ${new Date(Date.now() + 5400000).toISOString()}, 'confirmed', 'online')`;

const b2 = randomUUID();
await sql`INSERT INTO bookings (id, business_id, service_id, staff_id, client_id, client_name, client_email, client_phone, starts_at, ends_at, status, source)
VALUES (${b2}, ${bizId}, ${s2}, ${staff2}, ${c2}, 'Priya Jayawardena', 'priya@example.com', '+94772233445', ${new Date(Date.now() + 7200000).toISOString()}, ${new Date(Date.now() + 10800000).toISOString()}, 'pending', 'online')`;

const b3 = randomUUID();
await sql`INSERT INTO bookings (id, business_id, service_id, staff_id, client_id, client_name, client_email, client_phone, starts_at, ends_at, status, source)
VALUES (${b3}, ${bizId}, ${s3}, ${staff3}, ${c3}, 'Saman Kumara', 'saman@example.com', '+94773344556', ${new Date(Date.now() - 3600000).toISOString()}, ${new Date(Date.now() - 1800000).toISOString()}, 'completed', 'walk_in')`;

const b4 = randomUUID();
await sql`INSERT INTO bookings (id, business_id, service_id, staff_id, client_id, client_name, client_email, client_phone, starts_at, ends_at, status, source)
VALUES (${b4}, ${bizId}, ${s1}, ${staff1}, ${c4}, 'Dinuka Perera', 'dinuka@example.com', '+94774455667', ${new Date(Date.now() + 86400000).toISOString()}, ${new Date(Date.now() + 86400000 + 3600000).toISOString()}, 'confirmed', 'online')`;

console.log("Seeding complete for business:", bizId);
