import type { DocsGuide } from "../types";

export const manageBookingsGuide: DocsGuide = {
  slug: "manage-bookings",
  title: "Manage bookings",
  description: "View, create, cancel, reschedule, and refund appointments.",
  category: "workspace",
  estimatedMinutes: 6,
  thumbnailMockupId: "dashboard-bookings",
  relatedGuides: ["dashboard-calendar", "client-manage-booking"],
  faqIds: ["client-books", "cancel-reschedule", "refund"],
  steps: [
    {
      title: "Open Bookings",
      body: "Go to Dashboard → Bookings to see upcoming and past appointments. Use filters to find a specific client or date.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightNav: "Bookings",
    },
    {
      title: "Create a manual booking",
      body: "Click New booking to add an appointment yourself — useful for phone or walk-in clients. Pick service, staff, time, and client details.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightTarget: "bookings-new-booking",
    },
    {
      title: "Open a booking",
      body: "Click any row to open the full booking detail: client contact, payment status, notes, and actions.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightTarget: "bookings-row",
    },
    {
      title: "Reschedule",
      body: "Choose Reschedule, pick a new date and time, and save. The client receives an updated confirmation email automatically.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightTarget: "bookings-reschedule",
    },
    {
      title: "Cancel",
      body: "Cancel removes the appointment from your calendar and notifies the client. Cancel upcoming bookings before deleting your account.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightTarget: "bookings-cancel",
    },
    {
      title: "Refund a payment",
      body: "For paid bookings, open the booking and use Record refund after you send the money back in PayHere, PayPal, or your bank. Full or partial amounts are stored on the booking — PayHere itself is not charged from this button.",
      visual: { type: "mockup", mockupId: "dashboard-bookings" },
      highlightTarget: "bookings-refund",
    },
  ],
};
