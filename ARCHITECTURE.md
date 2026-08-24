# Greenback Cash — Code Architecture

Sections 1–4 describe the system. **Sections 5–10 are the ones to read before you
write code** — they cover which layer a thing goes in and what it should look like.

---

## 1. Topology

| Component | Runs on | Responsibility |
|---|---|---|
| Next.js | Vercel | PWA, ops console, all business logic |
| FastAPI | Container host | Receipt image processing + extraction |
| Supabase | Supabase | Postgres, auth, storage, realtime |

```
Browser ──► Next.js (Vercel) ──► Supabase
                │
                ├──► FastAPI (container) ──► Gemini
                │         └──► callback ──► Next.js
                │
                └──► Payout provider, Twilio, APNs

Browser ◄──► Apple / Google Wallet   (native OS, geofencing)
```

---

## 2. Repo layout

```
greenback/
├── apps/web/              Next.js — PWA, ops console, all domain logic
├── supabase/              Migrations, seed, local config
├── scripts/               Repo tooling
└── .github/workflows/
```

Planned, not yet present:

```
├── services/ocr/          FastAPI — image processing + extraction
├── packages/contracts/    Shared schema → TS types + Pydantic models
├── corpus/                Benchmark receipts + labels (git-lfs)
└── docs/adr/              Architecture decision records
```

**Tooling: pnpm workspaces.** No Turborepo or Nx — there is one JS app, and the
Python service will build in a Docker image outside the pnpm graph. The workspace
currently tracks `apps/*` only; `packages/*` gets added back when
`packages/contracts` arrives, because that is the first package with two consumers
(TypeScript and Python). Until then there is no `packages/` directory, deliberately
— see the repo layout note in `README.md`.

CI scoping uses path filters: one workflow watching `apps/web/**`, another watching
`services/ocr/**` once it exists.

---

## 3. `apps/web` — structure

```
middleware.ts     session refresh + ops route gate

app/                            ROUTING AND PRESENTATION ONLY
  (auth)/
    onboarding/     age gate → phone → verify → profile → consent → done
  (consumer)/
    home/           balance, payout progress, scan CTA, nearby offers
    capture/        camera, client-side quality checks, upload
    receipts/       list + live status
    wallet/         pass status, add-to-wallet, re-issue
    cash-out/       method, soft-KYC step, confirmation
  ops/
    review-queue/   exceptions/  float/
    overrides/      disputes/    deletions/
  api/                          external callers only
    receipts/               upload
    ocr/callback/           FastAPI posts results here
    wallet/apple/v1/        Apple PassKit web service
    payout/webhook/         provider settlement callbacks
    cron/                   scheduled jobs

components/                     PROPS IN, MARKUP OUT
  ui/             primitives — Button, Field, PointsBadge
  layout/         AppShell, TabBar, OpsNav
  feedback/       FormMessage, EmptyState, ErrorState

lib/                            EVERYTHING ELSE, BY DOMAIN
  onboarding/  step machine, guards          ← reference implementation
  auth/        session, OTP send/verify
  accounts/    the account record
  consent/     platform-level capture
  receipts/    upload, dedupe, status state machine
  matching/    catalog + campaign matching, confidence routing
  ledger/      credit, debit, balance
  campaigns/   eligibility, budget lock       (engine only, no UI)
  wallet/      pass generation, coordinate selection, push
  payout/      provider interface, soft-KYC, cash-out orchestration
  float/       coverage ratio, snapshots
  deletion/    request state machine, subprocessor adapters
  audit/       append-only writer
  ocr-client/  calls FastAPI — the only place that does

  supabase/    client.ts / server.ts / admin.ts / database.types.ts (generated)
  config/      env.ts (public) / serverEnv.ts (secrets, validated at boot)
  errors/      Result type, AppError
  observability/  logger.ts
  utils/       formatters — money, dates

tests/                          MIRRORS lib/ ONE FOR ONE
  onboarding/rules.test.ts      ↔  lib/onboarding/rules.ts
```

> `ops/` is a real URL segment, not an `(ops)` route group. A route group produces
> no path prefix, which would leave `middleware.ts` with nothing to match on. The
> gate depends on ops screens living under `/ops/*`. `(auth)` and `(consumer)` are
> genuine groups — they share chrome without adding a segment.

> **Not yet built:** `capture/`, `receipts/`, `wallet/`, `cash-out/`, every `ops/`
> screen, every `api/` route, and the `campaigns`, `float`, `deletion`, `audit`,
> `wallet`, `payout`, `ocr-client` domains. `float`, `deletion` and `audit` also
> need migrations before code.

### The rule

`app/` is screens and endpoints. `lib/` is logic.

- Pages call `lib/`. They don't query the database, hold business rules, or know
  about external providers.
- `lib/` talks to Supabase and external services. It's the only layer that does —
  and within `lib/`, only `queries.ts` and `service.ts` do. See §5.
- Components receive props and don't fetch.

### Deliberate exceptions

- **The capture flow is a client component** — camera, WASM quality checks,
  multi-segment state.
- **The receipt status screen subscribes to Supabase Realtime directly** — a live
  connection, not a fetch.

### Rendering

Server Components for balance, receipts, wallet, and all ops reads — they call
`lib/` directly, so no API round-trip and no loading flash on first paint. Client
islands only for the camera, the Realtime subscription, and interactive forms.

### Ops console

Same app, same domain, separate route subtree behind a role gate. Ops is the
internal Greenback team — Phase I has no brand-facing surface. Per PRD §2.1, ops
configures brand offers via direct SQL in Phase I, so the console covers review
queue, exception log, float HUD, overrides, disputes, and deletions. **No campaign
CRUD screens.** `brand/` is not created — Phase II.

Role is checked twice: middleware for the route boundary, and again server-side on
every ops operation. Middleware alone is a client-routing decision; the override
screen credits a real ledger.

---

## 4. How the two services communicate

**Async, webhook-style.**

```
1. Next.js creates the receipt record, calls FastAPI
2. FastAPI acknowledges immediately and queues the work internally
3. Next.js returns to the browser                    ← invocation ends, sub-second
4. Browser subscribes to the receipt record via Realtime
5. FastAPI processes on the container                ← no serverless duration limit
6. FastAPI calls back to Next.js with a signed payload
7. Next.js matches, credits, audits, updates status
8. Realtime pushes the update to the browser
```

**Why not synchronous.** Extraction can take longer than a serverless function's
maximum duration. A blocking call would be terminated mid-flight, leaving a
stranded receipt and a 504. In the async version every Vercel invocation is under a
second, and the long work happens on the container.

### Boundaries on `services/ocr`

1. **No Supabase credentials.** Next.js issues short-lived signed read URLs;
   FastAPI fetches over plain HTTP.
2. **No business logic.** No campaign matching, no budget checks, no ledger writes.
   It normalizes text; Next.js decides what things are worth.
3. **HTTP only, no shared imports.** It consumes `packages/contracts` as a
   dependency, not a relative path.

> **Open:** the original OCR spec included a matching module. Under these boundaries
> that doesn't exist — Python normalizes (units, tokenization, noise stripping),
> Next.js matches against the catalog. This is the one place the two designs
> disagree and should be settled explicitly.

---

## 5. Where does my code go?

Start here. Find your case, use that layer.

| What you're building | Where it goes |
|---|---|
| Reading data for a page | Server Component calls `lib/<domain>/queries.ts` |
| A form in our own UI that writes | **Server Action** in `app/<route>/actions.ts` |
| An external system calling us | **Route Handler** in `app/api/<name>/route.ts` |
| A scheduled job | Route Handler in `app/api/cron/<name>/` |
| A rule that needs no database | Pure function in `lib/<domain>/` |
| Something drawn on screen | `components/` — props in, no fetching |

**Server Actions are the default for writes.** Route Handlers exist for callers we
don't control: the OCR callback, payout webhooks, Apple PassKit, cron. If our own
React form is the caller, use an Action — there's no URL to secure, no fetch to
write, and no JSON contract to keep in sync.

### A domain folder

Each `lib/<domain>/` holds up to four kinds of file:

**Every domain uses the same six file names.** Open any two and they look alike:

```
lib/<domain>/
  index.ts      the public surface — the only file other domains may import
  types.ts      the nouns.        no infrastructure imports
  rules.ts      the decisions.    pure, no I/O, highest coverage bar
  schema.ts     zod contracts for anything entering the domain
  queries.ts    reads.            ← touches Supabase
  service.ts    writes.           ← touches Supabase
```

Not every domain needs all six — but when a file exists it has that name and that
job. Don't invent `helpers.ts`, `utils.ts` or `manager.ts`; if something doesn't
fit one of the six, that usually means it belongs in a different domain.

**The barrel rule.** Cross-domain imports go through `index.ts`:

```ts
import { getConsents } from "@/lib/consent";           // ✅ public surface
import { getConsents } from "@/lib/consent/queries";   // ❌ reaching inside
import { nextStep } from "./rules";                     // ✅ within a domain
```

If it isn't exported from `index.ts`, it's internal. This is what stops one
domain's refactor from breaking four others.

### Who may import whom

| From | May import | Must not |
|---|---|---|
| `app/**` | any `lib/*` barrel | another route's `_components/` |
| `lib/<d>/types.ts` | other domains' types | anything infrastructural |
| `lib/<d>/rules.ts` | own `types.ts` | Supabase, `next/*`, anything async |
| `lib/<d>/queries.ts` | `SupabaseClient` type, own types | another domain's internals |
| `lib/<d>/service.ts` | own files, other domains' barrels | `app/**` |
| `components/**` | domain **types** only | `queries.ts`, `service.ts`, Supabase |
| `lib/**` | — | `app/**`, ever |

The direction is one-way: `app/ → lib/<domain> → lib/config|errors`. If you find
yourself importing from `app/` inside `lib/`, the logic is in the wrong place.

### Not everything in `lib/` is pure — and that's the point

`lib/` is where I/O is **allowed and confined**. §3 says it's the only layer that
talks to Supabase; that is deliberate, and `queries.ts` and `service.ts` are the
files doing it. They are not pure and cannot be.

Purity isn't a goal in itself here. It's a technique for isolating *decisions*:

| File | Makes decisions? | Does I/O? | Coverage bar |
|---|---|---|---|
| `rules.ts` | Yes — what the domain means | No | High |
| `queries.ts` | No — fetches and maps | Yes | Low |
| `service.ts` | Yes, but needs the DB to decide | Yes | Medium, stubbed client |

The rule to follow: **push every judgement down into a pure function, and keep the
I/O layer thin and dumb.** `getConsents` should never grow an `if` about what
counts as valid consent — that belongs in `rules.ts`, where it is tested against an
array instead of a database.

You may reasonably ask why `queries.ts` isn't hidden behind a repository interface
so callers depend on an abstraction. Because it buys nothing we don't already have:
the client-as-parameter rule below gives tests their seam without a second layer of
indirection to maintain.

### The client-as-parameter rule

Every function in `queries.ts` and `service.ts` takes the Supabase client as its
**first argument** instead of importing one:

```ts
// lib/consent/queries.ts
export async function getConsents(
  supabase: SupabaseClient,
  accountId: string,
): Promise<Consent[]> { … }
```

Two reasons. Tests pass a stub instead of mocking module imports. And the caller
has to choose which client — which means choosing a security model on purpose
rather than by accident. See §6.

Queries return **domain types, never raw rows**. `snake_case` stops at the query
layer; map it there. `lib/accounts/queries.ts` shows the mapping.

### Building a page

**There is no SSR folder and no CSR folder.** Both live in the same directory. The
`"use client"` directive is the boundary — not the file's location.

Every `page.tsx` is a **Server Component**. Never put `"use client"` at the top of
a page. A page's job is three steps:

```tsx
// app/(auth)/onboarding/page.tsx  — Server Component, no directive
import { requireStep } from "@/lib/onboarding";
import { AgeGateForm } from "./_components/AgeGateForm";

export default async function AgeGatePage() {
  await requireStep("age-gate");     // 1. guard — redirects if they can't be here

  return (                           // 2. render; the form is a client island
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Confirm your age</h1>
      <AgeGateForm />
    </div>
  );
}
```

A page that needs data does the same with a fetch in the middle:

```tsx
const account = await getSessionAccount();            // 1. who is asking
const supabase = await createClient();
const consents = await getConsents(supabase, account.accountId);   // 2. fetch
const settled = hasRequiredConsents(consents);        // 3. decide — pure function
return <SomeForm settled={settled} />;                // 4. plain props down
```

The page holds no business rules, writes no queries inline, and names no Supabase
tables. It orchestrates. If a page grows an `if` about what something *means*, that
`if` belongs in `lib/`.

### If you're coming from a React SPA

In a client-side React app (CRA, Vite, React Native) the chain is:

```
Component → useAuth() hook → repository → fetch("/api/...") → server → DB
```

Every link exists for one reason: **the browser cannot reach the database**, so you
need an HTTP hop, and you need a hook to manage the loading/error/data states that
hop creates.

In the App Router the page already runs on the server. The hop is gone, and most of
the chain goes with it:

```
page.tsx (server) → lib/queries.ts → Supabase
```

| What you'd write in an SPA | Here |
|---|---|
| `useAuth()` hook | `getSessionAccount()`, called in the page |
| Repository / service class | `lib/<domain>/queries.ts` — same idea, runs on the server |
| `fetch("/api/balance")` | Nothing. The page calls the function directly |
| An `/api/balance` route | Only if an external system calls it |
| `useState` for loading | None. The page awaits before any HTML is sent |
| `useEffect(fetchOnMount)` | Delete it. Fetch in the server page |
| Global auth context/provider | The session cookie, read per request |

**Reads: before and after.**

```tsx
// SPA — three states, a hook, an endpoint, a spinner
function Profile() {
  const { user } = useAuth();
  const { data, loading, error } = useAccount(user.id);
  if (loading) return <Spinner />;
  if (error) return <Error />;
  return <p>{data.displayName}</p>;
}
```

```tsx
// App Router — no hook, no endpoint, no spinner, no loading state
export default async function ProfilePage() {
  const session = await getSessionAccount();
  const supabase = await createClient();
  const account = await findAccountByUserId(supabase, session.userId);
  return <p>{account.displayName}</p>;
}
```

The second one cannot render a stale or half-loaded state, because the data is
resolved before the HTML exists.

**Writes: the Server Action replaces the endpoint.**

```tsx
// actions.ts
"use server";
export async function createProfileAction(prev: FormState, formData: FormData) {
  const user = await getSessionUser();
  const parsed = CreateAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter your name." };
  await createAccount(createAdminClient(), user.userId, parsed.data);
  redirect("/onboarding/consent");
}
```

```tsx
// _components/ProfileForm.tsx
"use client";
import { useActionState } from "react";

export function ProfileForm() {
  const [state, action, pending] = useActionState(createProfileAction, idleState);
  return (
    <form action={action}>
      <input name="displayName" />
      <button disabled={pending}>Continue</button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

No `fetch`, no URL, no JSON contract, no `useEffect`. The function is imported and
called; Next.js handles the network.

**So where do hooks survive?** Three places, all genuinely browser-side:

1. **Form state** — `useActionState` for pending/error, as above.
2. **Realtime** — `useEffect` to open and tear down the subscription (§3).
3. **Device APIs** — the camera capture flow (§3).

Do not build a `useAuth()` hook. On the server, `getSessionAccount()` is the answer.
If a client component needs to know who's signed in, its server parent passes it
down as a prop.

### When a component needs `"use client"`

Add the directive only when the component needs one of these:

- `useState`, `useEffect`, `useReducer`, or any hook
- an event handler — `onClick`, `onChange`, `onSubmit`
- a browser API — camera, `localStorage`, geolocation
- a Supabase Realtime subscription
- a third-party library that uses hooks internally

**Push it as far down the tree as you can.** `"use client"` is contagious
downward: everything a client component imports becomes client code and ships to
the browser. One interactive button does not make the page interactive — extract
the button.

| | Server Component (default) | Client Component |
|---|---|---|
| Can be `async` / await | Yes | No |
| Can call `lib/` queries | Yes | **No** |
| Can use hooks and handlers | No | Yes |
| Ships JavaScript to browser | No | Yes |
| Can read secrets / server env | Yes | **Never** |

A client component that needs data gets it as **props from a server parent**, or
uses a Server Action to write. It does not fetch on mount. The two deliberate
exceptions are named in §3: the camera capture flow and the Realtime status
subscription.

### Where components live

```
components/
  ui/         primitives — Button, Field        shared by 2+ routes
  feedback/   FormMessage, EmptyState

app/(auth)/onboarding/
  page.tsx                        server
  layout.tsx                      shared chrome for the flow
  actions.ts                      every server action for this route subtree
  _components/AgeGateForm.tsx     used only here
```

A folder prefixed with `_` is private — Next.js does not turn it into a route. Use
it for anything a single route owns. Promote to `components/` on the **second**
consumer, not in anticipation of one.

Components take props and render. They don't fetch, don't import Supabase, and
don't hold business rules.

### Creating an API route

Route Handlers are for callers we don't control — the OCR callback, payout
webhooks, Apple PassKit, cron. **If our own React form is the caller, write a
Server Action instead.**

Every handler follows the same shape:

```ts
// app/api/ocr/callback/route.ts
export async function POST(request: Request) {
  // 1. authenticate the CALLER — there is no browser session here
  if (!verifySignature(request)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  // 2. parse and validate
  const parsed = OcrCallbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  // 3. delegate — no business logic in this file
  const result = await applyExtraction(admin, parsed.data);

  // 4. map result to status, and acknowledge fast
  return Response.json({ ok: result.ok }, { status: result.ok ? 200 : 409 });
}
```

Rules:

- **A Route Handler has no session.** Middleware protects browser navigation, not
  machine callers. Verify a signature or shared secret explicitly.
- **No business logic in `route.ts`** — it parses, delegates, formats a response.
- **Never import one route handler from another.** Shared behaviour goes in `lib/`.
- **Webhooks must be idempotent** — see §4 and the ledger rule in §10.

### What belongs in `lib/`

`lib/` is everything that is not a screen or an endpoint:

| Belongs in `lib/` | Does **not** |
|---|---|
| Business rules and calculations | JSX |
| Supabase reads and writes | Hooks, `useState` |
| Calls to external providers | Route definitions |
| Zod schemas | `Response` / `NextResponse` |
| Domain types | HTTP status codes |

One folder per domain, named for the domain and never for the technical role — the
list is in §3. If you can't name the domain a file belongs to, that usually means
the logic belongs inside an existing one.

---

## 6. Which Supabase client — and the one that can hurt you

Three clients. Picking wrong is the most expensive mistake available in this
codebase.

| File | Key | Runs | RLS |
|---|---|---|---|
| `lib/supabase/client.ts` | anon | Browser | **Enforced** |
| `lib/supabase/server.ts` | anon + session cookie | Server, as the user | **Enforced** |
| `lib/supabase/admin.ts` | service role | Server only | **Bypassed entirely** |

Reads on behalf of a signed-in user should use `server.ts`, where RLS scopes the
result automatically.

**Writes have to use `admin.ts`,** because the schema defines no customer-facing
INSERT or UPDATE policies — every write through the anon key is rejected. That's
deliberate (see the closing comment in the initial migration): Next.js is the
single writer.

The consequence is the thing to internalise:

> On the admin client, **RLS is not protecting you.** A query without an explicit
> `.eq("account_id", accountId)` returns every user's rows. The filter you type is
> the only boundary there is.

And resolve the account from the **session**, never from a form field. A user can
put any UUID in a form; they cannot forge a session cookie.

`admin.ts` starts with `import "server-only"`, so importing it from a client
component fails the build instead of shipping the key to a browser.

---

## 7. Validation

Parse at the boundary, then trust the value.

```ts
// lib/auth/schema.ts
export const OtpSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Include your country code."),
  token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});
export type OtpInput = z.infer<typeof OtpSchema>;
```

```ts
// app/(auth)/onboarding/actions.ts
"use server";

export async function verifyCodeAction(_prev: FormState, formData: FormData) {
  const parsed = OtpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  // …everything downstream receives OtpInput, never FormData
  const result = await verifyLoginCode(parsed.data);
}
```

Services take typed input. A function signature containing `FormData`, `unknown`,
or `any` below the action layer means validation leaked downward.

Shape and range belong in the schema. Rules that need the database — *has this
person already consented?* — belong in `service.ts`.

---

## 8. Errors

Expected failures are **return values**. Unexpected failures **throw**.

```ts
type Result =
  | { ok: true; payoutId: string }
  | { ok: false; reason: "below_minimum" | "insufficient_balance" };
```

"Below the minimum payout" is a normal outcome the UI must render, not an
exception. A Postgres connection failure is an exception — let it throw and hit the
error boundary.

Never swallow an error to return a falsy value; a silent failure in the ledger is
worse than a crash.

---

## 9. Testing

Thresholds live in `apps/web/vitest.config.ts` and CI enforces them.

| Layer | Tested? |
|---|---|
| Pure logic (`lib/**/rules.ts`) | **Yes — the 90% bar applies** |
| `service.ts` | Yes, with a stub client |
| `queries.ts` | Only if it holds real mapping logic |
| Pages, actions, components | No — E2E covers the critical journeys |

Write the test in the same PR as the logic, not a follow-up.

`tests/ledger/balance.test.ts` and `tests/matchLineItems.test.ts` show the house
style: a fixture builder with overrides, so each test displays only the field it
cares about.

E2E (Playwright) is reserved for the few journeys that matter — auth, receipt
upload → points credited, wallet pass issuance. Don't add E2E for something a unit
test covers faster.

---

## 10. Conventions

- **Files**: components `PascalCase.tsx`; everything else `camelCase.ts`.
- **Domain types** live in `lib/types/` and are hand-written. **Generated Supabase
  types go in `lib/supabase/database.types.ts`** — infrastructure, not vocabulary.
  Keeping them apart is deliberate; see the rule below.
- **Generated row types never leave `queries.ts`.** Map a row to a domain type at
  the query boundary and pass the domain type inward. A service signature
  containing `Database["public"]["Tables"][…]["Row"]` means your column names have
  become your domain vocabulary, and every migration is now a refactor.
- **Only `lib/ledger/service.ts` will write to `ledger_entries`** (not built yet).
  No other domain
  credits or debits points directly — they call the ledger. One append-only,
  trigger-enforced, money-bearing table gets exactly one door.
- **Every points-crediting write is idempotent**, keyed on `receipt_id`. A retried
  OCR callback that credits twice is the most damaging bug this system can produce.
  Check before insert, in the ledger service — not in the caller.
- **Imports** use the `@/` alias (`@/lib/ledger/balance`), not `../../..`.
- **Money and points are integers.** Points are whole numbers; currency is
  `numeric(10,2)` in Postgres. No floats for money.
- **The ledger is append-only** — enforced by a trigger. Corrections are
  compensating `ADJUSTMENT` entries, never edits.
- **Every schema change is a new migration.** Never edit one that has been applied.

### Worked examples in the repo

**Onboarding is the reference implementation.** A five-step flow — age gate →
phone → verify → profile → consent → done — touching every layer. Read in order:

| # | Read this | To see |
|---|---|---|
| 1 | `app/(auth)/onboarding/page.tsx` | **Start here.** The shape every page follows |
| 2 | `lib/onboarding/rules.ts` | Pure logic. The entire flow decided by four booleans |
| 3 | `tests/onboarding/rules.test.ts` | What pure logic costs to test: no mocks, no database |
| 4 | `lib/onboarding/queries.ts` | The only place the flow touches the outside world |
| 5 | `lib/onboarding/guard.ts` | One line per page, no branching duplicated |
| 6 | `app/(auth)/onboarding/actions.ts` | Every mutation in the flow, all the same four steps |
| 7 | `_components/AgeGateForm.tsx` | The client island — `useActionState`, no fetching |
| 8 | `app/(auth)/onboarding/consent/page.tsx` | A form with **no** client component at all |
| 9 | `lib/accounts/service.ts` | The four-step write, and why it's idempotent |

The thing to take from it: **`rules.ts` decides, everything else obeys.** The five
pages contain no routing logic — they call `requireStep()`, which asks one tested
function. Adding a step means editing `types.ts` and `rules.ts`, not five files.

Supporting cast: `lib/auth/session.ts` (who is asking), `lib/supabase/admin.ts`
(the service-role rules), `lib/config/serverEnv.ts` (fail at boot, not at 3am),
`lib/errors/` (the shared `Result` type), `middleware.ts` (session + ops gate).
