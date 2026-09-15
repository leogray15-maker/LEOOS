/**
 * THE ARCANE ARCHIVES — a read-only copy.
 *
 * Every line below was **copied out** of Notion and now lives here. The
 * Signal Forge drafts from this copy and never from the live workspace,
 * which is the point: Notion is read-only for the entire network, and
 * the only way to be sure of that is for the drafting side never to hold
 * a handle that could write.
 *
 * Nothing in this file is written back. Refreshing it means copying the
 * pages out again and replacing what is here — the workspace is never
 * the thing being edited.
 *
 *   Workspace  2028 · The Arcane Archives
 *   Copied     2026-09-15, read-only (search + fetch)
 *
 * `COURSES` is the whole index as it stands. `MODULES` holds the ones
 * copied in full so far — the Forge drafts from those, and from anything
 * pasted into BEACON at runtime. The index is what tells the Forge what
 * it has *not* covered yet.
 */

/** Courses whose subject is a compound. The Forge will not draft these. */
const COMPOUND = true;

/**
 * The index. `fenced` marks a course the content rules put out of bounds
 * — cognitive-enhancement and peptide material, where a post would have
 * to pair a named compound with an outcome to say anything at all.
 */
export const COURSES = [
  { title: 'Mind HiJacking', url: 'https://app.notion.com/p/2677f6a404fe804c8b53e10177638ec3' },
  { title: 'Mindset Mastery', url: 'https://app.notion.com/p/2677f6a404fe804a9fccc156423ff112' },
  { title: 'Advanced Mindset Mastery', url: 'https://app.notion.com/p/2677f6a404fe80e699fdecef3da543e0' },
  { title: 'Productive Isolation', url: 'https://app.notion.com/p/2657f6a404fe802f8d8df4b24b9bd03b' },
  { title: 'Never Procrastinate Again', url: 'https://app.notion.com/p/2677f6a404fe80659c7ed148ab377d1c' },
  { title: 'First Principles / Mental Models', url: 'https://app.notion.com/p/2677f6a404fe8007aa3cc3f575c9d5f1' },
  { title: 'Entrepreneurship Mastery', url: 'https://app.notion.com/p/2677f6a404fe800d98d4f47dc636a634' },
  { title: 'The Journey To Getting Rich', url: 'https://app.notion.com/p/2677f6a404fe80f5a01dc15e5d3a2bb5' },
  { title: 'Escaping Hell', url: 'https://app.notion.com/p/2657f6a404fe80a39377f818f69088e8' },
  { title: 'Full Stoicism Course', url: 'https://app.notion.com/p/2677f6a404fe805ab4b5c4cd892a1028' },
  { title: 'Full Thinking Course', url: 'https://app.notion.com/p/2677f6a404fe802384fcdf86577e375e' },
  { title: 'Leadership Protocol', url: 'https://app.notion.com/p/2677f6a404fe80f8abe5fa8862d6b59d' },
  { title: 'The Glitched Brain Protocol', url: 'https://app.notion.com/p/2677f6a404fe802b919fcbf0b041f583' },
  { title: 'Discipline Mastery Protocol', url: 'https://app.notion.com/p/2677f6a404fe806293f5d55f7afaf658' },
  { title: 'The Reality Shifting Entrepreneur', url: 'https://app.notion.com/p/2677f6a404fe80868f23f0d4a9e4a10f' },
  { title: 'Mastering The Silent Grind', url: 'https://app.notion.com/p/2677f6a404fe8056a8b3d139dc8e31ec' },
  { title: 'Top 1%', url: 'https://app.notion.com/p/2317f6a404fe80bfa2cbe3ebed76076b' },
  { title: 'The Red Book', url: 'https://app.notion.com/p/2677f6a404fe8020acf2e1cbd9d800eb' },
  { title: 'Premium Archive', url: 'https://app.notion.com/p/2677f6a404fe808484cac7637b635c97' },
  { title: 'Rules For Life', url: 'https://app.notion.com/p/2677f6a404fe80b8bd14f7e1046381c7' },
  { title: 'The Secrets Of The Rich', url: 'https://app.notion.com/p/2677f6a404fe80b68ca1d3a0b89935cb' },
  { title: 'Dark Psych', url: 'https://app.notion.com/p/2827f6a404fe80b2a893d4fec7f346ca' },
  { title: 'Arcane Philosophies', url: 'https://app.notion.com/p/2377f6a404fe8051ada2e45ed5081b84' },
  { title: 'Deep Psy', url: 'https://app.notion.com/p/3027f6a404fe8082bbf6e48d25e3fa96' },

  { title: 'Copywriting Accelerator', url: 'https://app.notion.com/p/2657f6a404fe8063b28befa244d242fb' },
  { title: 'Copywriting Ebook', url: 'https://app.notion.com/p/2677f6a404fe80a5883bd11bf46f12df' },
  { title: 'Copywriting Mastery', url: 'https://app.notion.com/p/2677f6a404fe80c0ad50cad95fe64ad8' },
  { title: '30 Day: Build A Profitable Business', url: 'https://app.notion.com/p/2677f6a404fe808d8570d2e480640ed0' },
  { title: 'Make A Product That Prints', url: 'https://app.notion.com/p/2677f6a404fe800f961fc556fca02dd7' },
  { title: 'The Inbound Method', url: 'https://app.notion.com/p/2677f6a404fe803a8e7de03cb9780d01' },
  { title: 'The Sales Mastery Protocol', url: 'https://app.notion.com/p/2677f6a404fe80aebc39fc995d17b4ca' },
  { title: 'Advanced Content Playbook', url: 'https://app.notion.com/p/2677f6a404fe80e1b484fb5a002d6be0' },
  { title: 'Personal Brand Mastery', url: 'https://app.notion.com/p/2677f6a404fe8001a04ddb7ac6510f10' },
  { title: 'Human Behavioural / Emotion Vault', url: 'https://app.notion.com/p/2677f6a404fe808aa16dd9956de183e3' },
  { title: 'Diving Into The Writing Psychology', url: 'https://app.notion.com/p/2677f6a404fe80889e57fd29dd27764c' },

  { title: 'Terminate Playlist', url: 'https://app.notion.com/p/2677f6a404fe8023bd9ffa086c0964cd' },
  { title: 'Bulking Protocol', url: 'https://app.notion.com/p/2677f6a404fe80f38c4efd11bdff48de' },
  { title: 'Health Ascendance', url: 'https://app.notion.com/p/2677f6a404fe804b853ce30243211e3a', fenced: COMPOUND },
  { title: 'Biohacking', url: 'https://app.notion.com/p/2677f6a404fe809a999aef95cdf1bdec', fenced: COMPOUND },
  { title: 'Full Investing Guide', url: 'https://app.notion.com/p/2677f6a404fe800498ade17f513f47b0' },

  { title: 'Daily Quests', url: 'https://app.notion.com/p/2677f6a404fe8085ada4c31614f46332' },
  { title: 'Full AI Girl Course', url: 'https://app.notion.com/p/26d7f6a404fe8086a447d548edbcaaa8' },
  { title: 'Full Trading Course', url: 'https://app.notion.com/p/26d7f6a404fe80cd86c8cc94b01c2d8c' },
  { title: 'The Deep Work System', url: 'https://app.notion.com/p/3027f6a404fe806291f9ffd34e31e573', fenced: COMPOUND },
  { title: 'Efficiency Blueprint', url: 'https://app.notion.com/p/3027f6a404fe80fe9bfdc1bf1952ed30' },
];

/**
 * Modules copied out in full. The Forge drafts from `text` — it never
 * reaches back to Notion for it.
 */
export const MODULES = [
  {
    id: 'eb-law-1',
    title: 'If Nothing Can Be Done In The Present, Ignore It',
    course: 'Efficiency Blueprint',
    section: '5 Laws Of Mental Domination',
    url: 'https://app.notion.com/p/3027f6a404fe808c958ff9df21f08066',
    text: `Most people waste hours, days, sometimes years thinking about problems they literally cannot solve right now. You're lying in bed at 2 AM worrying about a meeting next week. A flight delay that already happened. A business problem you can't fix until Monday. Nothing can be done. You're just burning mental energy and losing sleep, which makes tomorrow harder.

THE AIRPORT TEST. You're stuck in an airport due to a weather delay. Most people sit there stressed, checking their phone every 2 minutes. Complete waste. You can't control the weather. You can't make the plane leave faster. The productive move: pull out your laptop, work on something you were going to do next week. Turn dead time into productive time instead of anxiety time.

THE TRADING PARALLEL. You enter a trade. The market moves against you. Option 1: sit there refreshing the chart every 30 seconds, losing sleep. Option 2: accept the trade is open, you can't change it right now, and move on. The trader who can ignore what he can't control performs better. Traders are mentally exhausted not from trading, but from worrying about trades they already placed. Same with business. You launched a product. You sent the email. Refreshing your inbox 50 times won't make people respond faster.

HOW TO APPLY IT. When an issue pops into your head, ask one question: can I do something about this RIGHT NOW? If yes, do it immediately. If no, delete it from your mind. Most of what you worry about falls into the no category. Traffic. Someone's opinion of you. Market conditions. Your genetics. A delayed flight.

THE SLEEP TEST. You're about to sleep and your brain starts racing. None of it can be solved at midnight. You're sabotaging your sleep, which makes tomorrow worse, which makes you less capable of solving the actual problems when you can. Write it down if you must, then delete it until morning.

For the next 7 days, every time you catch yourself thinking about something, ask whether you can act on it now. Week 1 you'll catch yourself 20+ times a day. By week 4 it'll be under 5. By month 3 it's automatic.`,
  },
  {
    id: 'eb-law-3',
    title: 'True Mastery = Delegation',
    course: 'Efficiency Blueprint',
    section: '5 Laws Of Mental Domination',
    url: 'https://app.notion.com/p/3027f6a404fe805ebc42c084f0fe6115',
    text: `Most people think mastery means you're the best at something. Wrong. True mastery means you've systematized it so well that someone else can execute it at 80-90% of your level. When you can hand off a task and it still gets done properly, that's when you've actually mastered it. Until then you're just skilled. Not free.

Time is your only non-renewable resource. If you're still doing everything yourself, you're capped — there are only 24 hours in a day. Teach others to do what you do and you've multiplied your time.

THE BUSINESS REALITY. McDonald's doesn't need the founder flipping burgers; they systematized it so a 16-year-old can do it. Amazon doesn't need Bezos packing boxes. Your favourite creator doesn't edit their own videos. The goal is to work yourself out of the execution and into the strategy. You design the system. Others execute it.

THE TRADING APPLICATION. True mastery isn't being profitable yourself — it's being able to teach the strategy so clearly someone else could follow it and get similar results. If you can't explain your edge in simple terms, you don't understand it, you're getting lucky. When I started making money I couldn't explain why my setups worked. It was feel. That's not mastery, that's gambling with better instincts. Real mastery came when I could write the rules down clearly enough for someone else to follow: entry criteria, risk management, position sizing, exit rules.

THE DELEGATION TEST. Can you write the process down, hand it to someone with basic competence, and get 80%+ of your results? If yes, you've mastered it — delegate it. If no, systematize it further. Most people skip this because "no one can do it as well as me". That's ego, not mastery. If you can't teach it, you don't understand it well enough.

THE TIME FREEDOM EQUATION. Your time freedom is directly related to how much you can delegate. Doing everything yourself is zero freedom. 90% delegated is 90% freedom. The goal is to only do the things that only you can do: strategy, high-level decisions, creative direction, relationships. Everything else goes to people executing your systems.

Make a list of everything you do in a week. Circle the tasks only you can do. Everything else gets documented and delegated within 90 days. If you're not working toward this, you're choosing to stay the bottleneck.`,
  },
];

/** Compounds the shop carries. Named here so the fence can screen for them. */
export const COMPOUNDS = [
  'GHK-Cu', 'BPC-157', 'TB-500', 'KPV', 'MOTS-c', 'SS-31', 'VIP', 'Cerebrolysin',
  'NAD+', 'Semaglutide', 'Retatrutide', 'Tirzepatide', 'Ipamorelin', 'CJC-1295',
  'Tesamorelin', 'Melanotan', 'PT-141', 'Epitalon', 'Thymosin', 'Selank', 'Semax',
];
