import type { FaqCategory, PopularHelpArticle } from "../types";

export const faqCategories: FaqCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "bi-rocket-takeoff",
    color: "emerald",
    colorClasses: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      icon: "bg-emerald-600",
      text: "text-emerald-700",
      accent: "bg-emerald-600",
      pillBg: "bg-emerald-50",
      pillText: "text-emerald-700",
      pillRing: "ring-emerald-200",
    },
    faqs: [
      {
        id: "create-booking-page",
        q: "How do I create my booking page?",
        a: "Sign up at dinaya.lk/register — it takes less than five minutes. Add your services, set your working hours, and your page goes live instantly at yourname.dinaya.lk. No technical knowledge needed.",
        guideSlug: "setup-booking-page",
      },
      {
        id: "is-free",
        q: "Is Dinaya really free?",
        a: "Every new business gets a 14-day free trial with no credit card. After that, choose Starter, Pro, Growth, or Managed Max. Dinaya never takes commission from your bookings.",
        guideSlug: "upgrade-plan",
      },
      {
        id: "business-types",
        q: "What kinds of businesses can use Dinaya?",
        a: "Any appointment-based business: salons, barbers, beauty therapists, dental clinics, tuition classes, personal trainers, yoga studios, physiotherapists, and more. If clients book time with you, Dinaya works for you.",
      },
      {
        id: "share-link",
        q: "How do I share my booking link with clients?",
        a: "Your link is at yourname.dinaya.lk. Put it in your Instagram bio, share it in WhatsApp, add it to your Facebook page — wherever your clients find you. One tap and they can book.",
        guideSlug: "share-booking-link",
      },
      {
        id: "customise-page",
        q: "Can I customise my booking page?",
        a: "Yes. Add your business name, photo, and description. List each of your services with duration and price. Set the working days and hours you want to accept bookings.",
        guideSlug: "setup-booking-page",
      },
      {
        id: "client-account",
        q: "Do my clients need to create an account?",
        a: "No. Clients book with just their name, phone number, and email — no sign-up required. This means less friction and more completed bookings for you.",
        guideSlug: "client-books-online",
      },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: "bi-calendar-check",
    color: "amber",
    colorClasses: {
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      icon: "bg-amber-500",
      text: "text-amber-700",
      accent: "bg-amber-500",
      pillBg: "bg-amber-50",
      pillText: "text-amber-700",
      pillRing: "ring-amber-200",
    },
    faqs: [
      {
        id: "manage-availability",
        q: "How do I manage my availability?",
        a: "Go to Dashboard → Availability. Set your working days and hours, add breaks, block off holidays, and set buffer time between appointments — so you're never double-booked.",
        guideSlug: "manage-availability",
      },
      {
        id: "block-holidays",
        q: "Can I block time off or add holidays?",
        a: "Yes. In your availability settings you can block any date or date range. Blocked dates won't appear on your booking page, so clients can't book those slots.",
        guideSlug: "manage-availability",
      },
      {
        id: "client-books",
        q: "What happens when a client books?",
        a: "You get an instant notification by email. The client gets a confirmation email with all the details. Both of you also receive a reminder before the appointment.",
        guideSlug: "manage-bookings",
      },
      {
        id: "cancel-reschedule",
        q: "Can I cancel or reschedule a booking?",
        a: "Yes, from Dashboard → Bookings. Find the booking, click to open it, and choose Cancel or Reschedule. The client is notified automatically by email.",
        guideSlug: "manage-bookings",
      },
      {
        id: "buffer-time",
        q: "How does buffer time work?",
        a: "Buffer time adds a gap after each appointment before the next one can be booked. Set it per service — for example, 15 minutes after a haircut to clean up before the next client.",
        guideSlug: "add-services",
      },
      {
        id: "double-booked",
        q: "Will I get double-booked?",
        a: "No. When a client picks a time, the slot is reserved immediately. Dinaya won't show that slot to anyone else, so double bookings are impossible.",
        guideSlug: "client-books-online",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: "bi-credit-card",
    color: "blue",
    colorClasses: {
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      icon: "bg-blue-600",
      text: "text-blue-700",
      accent: "bg-blue-600",
      pillBg: "bg-blue-50",
      pillText: "text-blue-700",
      pillRing: "ring-blue-200",
    },
    faqs: [
      {
        id: "online-payments",
        q: "How do online payments work?",
        a: "Dinaya uses PayHere, Sri Lanka's leading payment gateway. When a client books, they can pay a deposit or the full amount online by card. Funds are settled to your bank account by PayHere on a regular schedule.",
        guideSlug: "connect-payhere",
      },
      {
        id: "deposit",
        q: "Can I collect a deposit instead of the full amount?",
        a: "Yes. In your service settings, choose whether clients pay a fixed deposit, a percentage of the total, or the full amount upfront. This dramatically reduces no-shows.",
        guideSlug: "connect-payhere",
      },
      {
        id: "payment-fees",
        q: "What are the payment fees?",
        a: "Dinaya charges zero transaction fees. PayHere applies their standard local rates — typically around 3.3% + LKR 30 per card transaction. We pass this through at cost with no markup.",
        guideSlug: "connect-payhere",
      },
      {
        id: "refund",
        q: "How do I issue a refund?",
        a: "Open the booking in Dashboard → Bookings, refund the client in PayHere (or your bank / LankaQR), then tap Record refund on the booking. Full or partial amounts are fine. PayHere usually takes 5–7 working days; Dinaya stores the record so your books stay in sync.",
        guideSlug: "manage-bookings",
      },
      {
        id: "receipt",
        q: "Do clients get a receipt?",
        a: "Yes. When a client pays online they receive an instant email receipt with the booking and payment details. You also see the payment status in your dashboard.",
        guideSlug: "dashboard-payments",
      },
      {
        id: "payment-safe",
        q: "Is it safe for clients to pay through my page?",
        a: "Yes. PayHere is PCI-DSS compliant and used by thousands of Sri Lankan businesses. Card details are never stored on our servers — they go directly to PayHere's secure environment.",
        guideSlug: "connect-payhere",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: "bi-person-circle",
    color: "violet",
    colorClasses: {
      bg: "bg-violet-50",
      ring: "ring-violet-200",
      icon: "bg-violet-500",
      text: "text-violet-700",
      accent: "bg-violet-500",
      pillBg: "bg-violet-50",
      pillText: "text-violet-700",
      pillRing: "ring-violet-200",
    },
    faqs: [
      {
        id: "change-business",
        q: "How do I change my business name or details?",
        a: "Go to Dashboard → Settings. You can update your business name, description, profile photo, and contact details any time. Changes appear on your booking page immediately.",
        guideSlug: "dashboard-settings",
      },
      {
        id: "change-slug",
        q: "Can I change my booking link (yourname.dinaya.lk)?",
        a: "Your link is set when you register and can be changed once from Settings → Account. After that, contact support — we'll handle it manually to make sure no existing links break.",
        guideSlug: "dashboard-settings",
      },
      {
        id: "reset-password",
        q: "How do I reset my password?",
        a: "On the login page, click 'Forgot password'. Enter your email and we'll send a reset link within a minute. Check your spam folder if it doesn't arrive.",
        guideSlug: "accept-staff-invite",
      },
      {
        id: "multi-staff-locations",
        q: "Can I have multiple staff or locations?",
        a: "Yes. Starter and Pro include 1 branch, Growth supports 3 branches, and Managed Max can be customized. Staff can be assigned to specific branches, and clients pick a branch when booking online.",
        guideSlug: "manage-locations",
      },
      {
        id: "delete-account",
        q: "How do I delete my account?",
        a: "Go to Settings → Account → Delete account. This permanently removes your page, all bookings, and your data. If you have upcoming bookings, please cancel them first to notify your clients.",
        guideSlug: "dashboard-settings",
      },
      {
        id: "client-data",
        q: "What data do you store about my clients?",
        a: "We store the name, email, and phone number that clients provide when booking. We don't sell this data. See our Privacy Policy for the full details on how data is handled and stored.",
      },
    ],
  },
];

export const popularHelpArticles: PopularHelpArticle[] = [
  { icon: "bi-rocket-takeoff", label: "Set up your booking page", cat: "getting-started", guideSlug: "setup-booking-page" },
  { icon: "bi-credit-card", label: "How online payments work", cat: "payments", guideSlug: "connect-payhere" },
  { icon: "bi-calendar-x", label: "Cancel or reschedule a booking", cat: "bookings", guideSlug: "manage-bookings" },
  { icon: "bi-shield-lock", label: "Client data & privacy", cat: "account", faqId: "client-data" },
  { icon: "bi-calendar2-range", label: "Block holidays & days off", cat: "bookings", guideSlug: "manage-availability" },
  { icon: "bi-percent", label: "Collecting a deposit", cat: "payments", guideSlug: "connect-payhere" },
];

export function findFaqById(id: string) {
  for (const cat of faqCategories) {
    const faq = cat.faqs.find((f) => f.id === id);
    if (faq) return { category: cat, faq };
  }
  return null;
}
