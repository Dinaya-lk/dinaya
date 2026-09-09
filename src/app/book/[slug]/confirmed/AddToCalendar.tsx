import Link from "next/link";
import { buildGoogleCalendarUrl } from "@/lib/calendar-ics";

interface Props {
  bookingId: string;
  slug: string;
  title: string;
  description: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  labels: {
    addToCalendar: string;
    downloadIcs: string;
    googleCalendar: string;
    appleCalendar: string;
  };
}

function GoogleCalendarLogo() {
  return (
    <svg viewBox="0 0 256 275" className="size-4 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="gcal-a" x1="83" x2="83" y1="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4fa0ff" />
          <stop offset="1" stopColor="#3186ff" />
        </linearGradient>
        <linearGradient id="gcal-b" x1="89.06" x2="89.06" y1="21.75" y2="96.39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a9a8ff" />
          <stop offset=".8" stopColor="#3c90ff" />
        </linearGradient>
        <filter id="gcal-blur" width="152" height="112" x="20" y="-4" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="6" />
        </filter>
      </defs>
      <mask id="gcal-mask-a" width="154" height="152" x="19" y="20" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
        <path fill="#3c90ff" d="M19.867 49.392C17.818 33.82 29.94 20 45.645 20h100.71c15.706 0 27.827 13.82 25.778 29.392L166 96l6.133 46.608C174.182 158.18 162.061 172 146.355 172H45.645c-15.706 0-27.827-13.82-25.778-29.392L26 96z" />
      </mask>
      <mask id="gcal-mask-b" width="154" height="152" x="19" y="20" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
        <path fill="#3186ff" d="M19.867 49.392C17.818 33.82 29.94 20 45.645 20h100.71c15.706 0 27.827 13.82 25.778 29.392L166 96l6.133 46.608C174.182 158.18 162.061 172 146.355 172H45.645c-15.706 0-27.827-13.82-25.778-29.392L26 96z" />
      </mask>
      <path fill="#bbe2ff" d="M20.824 48.078c0-26.641 21.596-48.239 48.238-48.239h117.917c26.641 0 48.238 21.598 48.238 48.239v50.918c0 26.641-21.597 48.239-48.238 48.239H69.062c-26.642 0-48.238-21.598-48.238-48.239z" />
      <path fill="#3c90ff" d="M.502 69.169c-3.432-26.082 16.871-49.23 43.177-49.23h168.683c26.306 0 46.609 23.148 43.178 49.23l-10.273 78.066l10.273 78.066c3.431 26.082-16.872 49.23-43.178 49.23H43.679c-26.307 0-46.609-23.148-43.177-49.23l10.272-78.066z" />
      <g mask="url(#gcal-mask-a)" transform="translate(-32.775 -13.56) scale(1.67495)">
        <path fill="url(#gcal-a)" d="M0 0h166v76H0z" transform="matrix(1 0 0 -1 13 172)" />
      </g>
      <g mask="url(#gcal-mask-b)" transform="translate(-32.775 -13.56) scale(1.67495)">
        <path fill="url(#gcal-b)" d="M32 27.2C32 16.596 40.596 8 51.2 8h89.6c10.604 0 19.2 8.596 19.2 19.2V96H32z" filter="url(#gcal-blur)" />
      </g>
      <path
        fill="#fff"
        d="M93.438 209.77q-10.521 0-18.051-3.421q-7.528-3.422-12.746-9.153q-5.133-5.82-7.273-11.379q-2.137-5.558-1.711-6.758a3.47 3.47 0 0 1 1.711-1.882l9.497-3.765q1.196-.598 2.395-.17q1.196.34 2.822 3.935q1.714 3.592 4.79 7.613a24 24 0 0 0 7.529 6.245q4.368 2.226 10.779 2.225q10.351 0 16.426-5.99q6.16-5.986 6.16-15.226q0-10.01-6.503-15.4q-6.5-5.476-17.195-5.476h-8.981a3.17 3.17 0 0 1-2.225-.853q-.853-.94-.855-2.139v-9.153q0-1.284.854-2.14a3.06 3.06 0 0 1 2.226-.94h7.783q9.583 0 15.4-5.22q5.817-5.218 5.816-13.517q.002-8.21-5.218-13.258t-14.371-5.049q-5.135.001-8.898 1.712a19.3 19.3 0 0 0-6.502 4.791a38.3 38.3 0 0 0-4.705 6.33q-1.964 3.252-3.165 3.593q-1.195.256-2.31-.426l-8.983-4.364q-1.11-.599-1.454-1.882q-.342-1.284 2.055-5.989q2.48-4.788 7.526-9.752a35.2 35.2 0 0 1 11.807-7.7q6.758-2.74 15.741-2.738q16.681.001 26.434 8.81q9.752 8.73 9.753 23.099q0 9.926-4.79 17.196q-4.706 7.27-13.347 10.268v.341q10.438 3.08 16.425 11.291c4.05 5.421 6.075 11.891 6.074 19.419q0 16.17-11.293 26.522q-11.29 10.35-29.429 10.35zm85.841-1.967q-1.452 0-2.567-1.112a3.78 3.78 0 0 1-1.026-2.652v-95.131l-19.249 13.859q-1.026.77-2.396.514a3.3 3.3 0 0 1-2.052-1.283l-5.561-7.871a3.32 3.32 0 0 1-.6-2.397q.258-1.365 1.369-2.136l34.133-24.382q.43-.343.942-.514q.515-.256 1.197-.256h7.188q1.455.001 2.31 1.027q.941.94.941 2.396v116.174q0 1.542-1.112 2.652a3.35 3.35 0 0 1-2.568 1.112z"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  );
}

export default function AddToCalendar({
  bookingId,
  slug,
  title,
  description,
  location,
  startsAt,
  endsAt,
  labels,
}: Props) {
  const googleUrl = buildGoogleCalendarUrl({
    title,
    description,
    location,
    startsAt,
    endsAt,
  });
  const icsUrl = `/api/bookings/${bookingId}/calendar.ics?slug=${encodeURIComponent(slug)}`;

  return (
    <div className="text-left">
      <p className="mb-3 text-[13px] font-medium text-muted-foreground">
        {labels.addToCalendar}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <GoogleCalendarLogo />
          {labels.googleCalendar}
        </Link>
        <a
          href={icsUrl}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <AppleLogo />
          {labels.appleCalendar}
        </a>
      </div>
    </div>
  );
}
