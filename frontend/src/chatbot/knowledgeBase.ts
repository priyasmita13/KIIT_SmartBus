// Joe Bot Knowledge Base — all facts about KIIT SmartBus extracted from the website.

export interface KnowledgeEntry {
  keywords: string[];           // words / phrases that trigger this entry
  question: string;             // canonical phrasing the bot shows
  answer: string;               // response text
  category: 'navigation' | 'features' | 'buses' | 'routes' | 'seats' | 'contact' | 'account' | 'general';
  navigateTo?: string;          // optional route path to auto-navigate the user
}

const knowledge: KnowledgeEntry[] = [
  // ── Navigation ─────────────────────────────────────────────
  {
    keywords: ['home', 'main page', 'landing', 'start'],
    question: 'How do I go to the Home page?',
    answer: 'Click the **KIIT SmartBus** logo or the "Home" link in the navigation bar. The home page has an overview of all features, campus coverage, student testimonials and upcoming features.',
    category: 'navigation',
    navigateTo: '/',
  },
  {
    keywords: ['live tracker', 'track bus', 'where is bus', 'bus location', 'gps', 'map', 'locate bus'],
    question: 'How do I track buses in real-time?',
    answer: 'Go to **Live Bus Tracker** from the navigation bar (or tap "Track Live Buses" on the home page). The page uses your browser GPS to show your current location on a map, and will display nearby buses as their tracking comes online.',
    category: 'navigation',
    navigateTo: '/live-tracker',
  },
  {
    keywords: ['seat', 'seat availability', 'how many seats', 'check seats', 'empty seats', 'full bus'],
    question: 'How do I check seat availability?',
    answer: 'Visit the **Seat Availability** page from the nav bar. You can filter buses by route (Campus 1, 6, 15, 25). Each bus card shows available/total seats, occupancy percentage, a color-coded status (Available / Few Seats / Nearly Full / Full), the next stop, ETA, and a visual seat layout.',
    category: 'navigation',
    navigateTo: '/seat-availability',
  },
  {
    keywords: ['route', 'schedule', 'timetable', 'timing', 'when does bus', 'bus time', 'plan journey', 'route plan'],
    question: 'Where can I see routes and schedules?',
    answer: 'Navigate to **Route & Schedule**. You can plan a journey by selecting source and destination, or browse all routes:\n• **Main Circuit** — Campus 1 → 6 → 15 → 25 → 1 (every 10 min, 45 min loop)\n• **Express Route** — Campus 1 → 15 → 1 (every 15 min, 25 min journey)\n• **Hostel Shuttle** — Hostels → Campus 6 → Hostels (every 8 min, 20 min loop)',
    category: 'navigation',
    navigateTo: '/route-schedule',
  },
  {
    keywords: ['contact', 'help', 'support', 'report', 'issue', 'feedback', 'complaint', 'email', 'phone'],
    question: 'How do I contact support or report an issue?',
    answer: 'Go to **Contact / Help** page. You can:\n• **Email:** smartbus@kiit.ac.in\n• **Phone:** +91 674 272 7777\n• **Visit:** Transport Office, KIIT Campus 1\n• Or fill the contact form on the page. Response time is within 24 hours for email, immediate for phone calls.',
    category: 'navigation',
    navigateTo: '/contact',
  },
  {
    keywords: ['login', 'sign in', 'log in'],
    question: 'How do I log in?',
    answer: 'Click the **Login** button in the navigation bar (top-right). Enter your KIIT email and password to sign in. Only authorized KIIT students can access the platform.',
    category: 'account',
    navigateTo: '/login',
  },
  {
    keywords: ['signup', 'sign up', 'register', 'create account', 'new account'],
    question: 'How do I create an account?',
    answer: 'Click the **Sign Up** button in the navigation bar. Fill in your details including your KIIT email to register. After registration, you can log in to access features like your profile and admin panel (if authorized).',
    category: 'account',
    navigateTo: '/signup',
  },
  {
    keywords: ['profile', 'my account', 'my profile', 'account settings'],
    question: 'Where is my profile?',
    answer: 'After logging in, click **Profile** in the navigation bar. Your profile page shows your account details and settings. You must be logged in to access it.',
    category: 'account',
    navigateTo: '/profile',
  },
  {
    keywords: ['admin', 'admin panel', 'management', 'admin page'],
    question: 'How do I access the Admin Panel?',
    answer: 'The **Admin Panel** is only visible to users with the ADMIN role. If you are an admin, it will appear in the navigation bar after you log in.',
    category: 'account',
  },
  {
    keywords: ['logout', 'log out', 'sign out'],
    question: 'How do I log out?',
    answer: 'Click the **Logout** button in the top-right corner of the navigation bar. This will clear your session and redirect you to the login page.',
    category: 'account',
  },

  // ── Features ─────────────────────────────────────────────
  {
    keywords: ['features', 'what can', 'what does', 'what is smartbus', 'about', 'overview'],
    question: 'What features does KIIT SmartBus offer?',
    answer: 'KIIT SmartBus provides:\n• **Real-time Bus Tracking** — GPS-based live map of buses\n• **Seat Availability** — live occupancy with color-coded status\n• **Route Planning** — find best routes between campuses\n• **Smart Scheduling** — know exactly when to leave\n• **Mobile-first Design** — works great on phones\n• **Secure Login** — KIIT email authentication\n\nComing soon: Smart Notifications, SOS Emergency button, and AI Chatbot.',
    category: 'features',
  },
  {
    keywords: ['upcoming', 'coming soon', 'future', 'new features', 'beta'],
    question: 'What features are coming soon?',
    answer: 'These features are currently in development:\n• **Smart Notifications** — instant bus alerts on your phone\n• **SOS Emergency** — one-tap emergency button for safety\n• **AI Chatbot** — intelligent assistant for transport queries\n\nThey are expected in beta testing soon!',
    category: 'features',
  },
  {
    keywords: ['mobile', 'phone', 'app', 'responsive', 'data usage'],
    question: 'Does it work on mobile phones?',
    answer: 'Yes! KIIT SmartBus has a **mobile-first design**. It works on any device with a browser — phones, tablets, and desktops. It uses minimal data and is optimized for student-friendly usage.',
    category: 'features',
  },
  {
    keywords: ['safe', 'secure', 'security', 'data', 'privacy'],
    question: 'Is the platform secure?',
    answer: 'Yes. The platform uses **KIIT email authentication**, so only authorized KIIT students can access it. Session tokens are stored securely and cleared on logout.',
    category: 'features',
  },

  // ── Buses ────────────────────────────────────────────────
  {
    keywords: ['how many buses', 'total buses', 'bus count', 'number of buses', 'active buses'],
    question: 'How many buses are running?',
    answer: 'Currently there are **6 active buses** in the system: KB001, KB002, KB003, KB004, KB005, and KB006. Each has a capacity of **45 seats**.',
    category: 'buses',
  },
  {
    keywords: ['bus capacity', 'seats per bus', 'how many seats'],
    question: 'What is the seat capacity of each bus?',
    answer: 'Each bus has a total capacity of **45 seats**. You can check real-time availability on the Seat Availability page.',
    category: 'buses',
    navigateTo: '/seat-availability',
  },
  {
    keywords: ['bus status', 'color', 'indicator', 'legend', 'what does green mean'],
    question: 'What do the seat status colors mean?',
    answer: '• 🟢 **Available** — more than 50% seats free\n• 🟡 **Few Seats** — 20–50% seats free\n• 🟠 **Nearly Full** — less than 20% seats free\n• 🔴 **Full** — no seats available\n\nThe seat layout also shows green (available) and red (occupied) individual seat blocks.',
    category: 'buses',
    navigateTo: '/seat-availability',
  },
  {
    keywords: ['update frequency', 'how often', 'refresh', 'real time', 'data update'],
    question: 'How often is bus data updated?',
    answer: 'Bus locations are updated **every 30 seconds**. Seat availability data refreshes at the same interval. You can also manually refresh using the Refresh button on each page.',
    category: 'buses',
  },
  {
    keywords: ['late bus', 'delayed', 'running late'],
    question: 'What if a bus is running late?',
    answer: 'Late buses are marked with a **red indicator**. Updated arrival times are displayed in real-time. During peak hours, consider taking alternative routes or buses.',
    category: 'buses',
  },

  // ── Routes ───────────────────────────────────────────────
  {
    keywords: ['main circuit', 'full loop', 'campus 1 to campus 25'],
    question: 'Tell me about the Main Circuit route.',
    answer: '**Main Circuit (R001)**\nPath: Campus 1 → Library Junction → Campus 6 → Sports Complex → Campus 15 → Medical Center → Campus 25 → Campus 1\nFrequency: Every **10 minutes** | Duration: **45 minutes** | Buses: KB001, KB003, KB005',
    category: 'routes',
    navigateTo: '/route-schedule',
  },
  {
    keywords: ['express', 'fast route', 'quick', 'campus 1 to campus 15'],
    question: 'Tell me about the Express Route.',
    answer: '**Express Route (R002)**\nPath: Campus 1 → Academic Block A → Campus 15 → Campus 1\nFrequency: Every **15 minutes** | Duration: **25 minutes** | Buses: KB002, KB004\nThis is the fastest option between Campus 1 and Campus 15.',
    category: 'routes',
    navigateTo: '/route-schedule',
  },
  {
    keywords: ['hostel', 'shuttle', 'hostel shuttle', 'hostels area', 'campus 6'],
    question: 'Tell me about the Hostel Shuttle.',
    answer: '**Hostel Shuttle (R003)**\nPath: Hostels Area → Food Court → Campus 6 → Hostels Area\nFrequency: Every **8 minutes** | Duration: **20 minutes** | Bus: KB006\nThis is the most frequent route — great for getting to Campus 6 quickly from the hostels.',
    category: 'routes',
    navigateTo: '/route-schedule',
  },
  {
    keywords: ['operating hours', 'what time', 'when start', 'when stop', 'hours'],
    question: 'What are the bus operating hours?',
    answer: 'Bus service runs:\n• **Weekdays:** 7:00 AM – 10:00 PM\n• **Weekends:** 8:00 AM – 9:00 PM\n• **Holidays:** 9:00 AM – 6:00 PM\n\nPeak hours are 8–10 AM, 12–2 PM, and 5–7 PM (higher frequency during these times).',
    category: 'routes',
  },
  {
    keywords: ['peak hours', 'busy', 'rush hour', 'crowded'],
    question: 'When are peak hours?',
    answer: 'Peak hours with higher bus frequency:\n• **Morning:** 8:00 AM – 10:00 AM\n• **Lunch:** 12:00 PM – 2:00 PM\n• **Evening:** 5:00 PM – 7:00 PM\n\nBuses run more frequently during these times. Check seat availability to avoid crowded rides!',
    category: 'routes',
  },

  // ── Campus ───────────────────────────────────────────────
  {
    keywords: ['campus', 'campuses', 'campus coverage', 'which campus', 'campus list'],
    question: 'Which campuses does SmartBus cover?',
    answer: 'SmartBus covers 4 KIIT campuses:\n• **Campus 1 (Main)** — 15,000+ students\n• **Campus 6 (Engineering)** — 8,000+ students\n• **Campus 15 (Medical)** — 3,000+ students\n• **Campus 25 (Law & Management)** — 2,500+ students\n\nAll campuses are currently **Active** with a total of 28,500+ students served.',
    category: 'general',
  },
  {
    keywords: ['stops', 'bus stops', 'locations', 'pickup'],
    question: 'What are the bus stop locations?',
    answer: 'Major stops include:\n• Campus 1 (Main Campus)\n• Campus 6 (Engineering)\n• Campus 15 (Medical)\n• Campus 25 (Law & Management)\n• Main Gate\n• Library Junction\n• Sports Complex\n• Hostels Area\n• Medical Center\n• Academic Block A & B\n• Food Court\n• Admin Building',
    category: 'general',
  },
  {
    keywords: ['how many students', 'users', 'student count'],
    question: 'How many students use SmartBus?',
    answer: 'Over **28,500+ students** across all KIIT campuses are already using KIIT SmartBus for their daily transportation needs!',
    category: 'general',
  },
  {
    keywords: ['suggest route', 'new route', 'request route'],
    question: 'Can I suggest a new route?',
    answer: 'Yes! You can suggest new routes or stops through the **Contact / Help** page. Select "Route Suggestion" as the category in the contact form, or email **smartbus@kiit.ac.in** directly with your proposal.',
    category: 'general',
    navigateTo: '/contact',
  },

  // ── Contact ──────────────────────────────────────────────
  {
    keywords: ['support hours', 'when available', 'support time'],
    question: 'What are the support hours?',
    answer: 'Support availability:\n• **Monday – Friday:** 8:00 AM – 8:00 PM\n• **Saturday:** 9:00 AM – 5:00 PM\n• **Sunday:** 10:00 AM – 4:00 PM\n\nFor emergencies, call **+91 674 272 7777** (available 24/7).',
    category: 'contact',
  },
  {
    keywords: ['response time', 'how long', 'wait time', 'reply time'],
    question: 'How quickly will I get a response?',
    answer: '• **Email:** Within 24 hours\n• **Phone:** Immediate\n• **Technical Issues:** 2–4 hours\n\nUse phone for urgent matters!',
    category: 'contact',
  },
  {
    keywords: ['emergency', 'sos', 'urgent', 'safety'],
    question: 'What do I do in an emergency?',
    answer: 'For urgent transportation issues, call the **emergency number: +91 674 272 7777** (available 24/7). An SOS Emergency button feature is also coming soon to the app!',
    category: 'contact',
  },

  // ── About the Bot ────────────────────────────────────────
  {
    keywords: ['who are you', 'your name', 'joe', 'joe bot', 'chatbot', 'bot'],
    question: 'Who are you?',
    answer: "I'm **Joe Bot** 👋 — your friendly KIIT SmartBus assistant! I can help you navigate the website, answer questions about bus routes, schedules, seat availability, and campus transportation. Just type your question!",
    category: 'general',
  },
  {
    keywords: ['thank', 'thanks', 'thankyou', 'thank you', 'bye', 'goodbye'],
    question: 'Thanks!',
    answer: "You're welcome! 😊 Happy to help. Have a great ride on KIIT SmartBus! If you need anything else, just ask.",
    category: 'general',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'hii', 'hiii'],
    question: 'Hello!',
    answer: "Hey there! 👋 I'm Joe Bot, your SmartBus assistant. How can I help you today? You can ask me about bus routes, schedules, seat availability, or how to navigate the website!",
    category: 'general',
  },
];

export default knowledge;

// Quick-help suggestions shown in the chat
export const quickHelps = [
  'Track a bus',
  'Check seat availability',
  'Bus routes & schedules',
  'Operating hours',
  'Campus coverage',
  'Contact support',
];
