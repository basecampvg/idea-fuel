# Next.js 15 App Router: Layout Patterns Research

## Research Summary
Documentation gathered for implementation plan regarding nested layouts, route groups, dynamic segments, and client-side data fetching patterns in Next.js 15 App Router.

---

## 1. Nested Layouts with Client Components

### Can layout.tsx be 'use client'?

**Yes, but it's NOT recommended.** Layouts can be Client Components, but doing so has significant limitations:

#### Implications of Client Component Layouts:
- ❌ **Cannot perform async data fetching** (no async/await in component)
- ❌ **Cannot access server-only APIs** (cookies(), headers() from next/headers)
- ❌ **Cannot export metadata** or generateMetadata()
- ⚠️ **All child components imported directly become Client Components**

#### Key Insight: Children Remain Server Components
**Important**: While the layout itself becomes a Client Component, **children passed via props remain Server Components**. This is because React serializes child Server Components as HTML before passing them to the Client Component boundary.

### Recommended Pattern: Composition with Provider Wrapper

**Instead of making the entire layout a Client Component, extract interactive logic into a separate wrapper component:**

```tsx
// app/layout.tsx (Server Component)
import { ReactNode } from 'react'
import ClientLayoutWrapper from './client-layout-wrapper'

export default function RootLayout({ children }: { children: ReactNode }) {
  // Can do server-side data fetching here
  const serverData = await fetchSomeData()

  return (
    <html>
      <body>
        <ClientLayoutWrapper initialData={serverData}>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  )
}
```

```tsx
// app/client-layout-wrapper.tsx (Client Component)
'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ClientLayoutWrapper({
  children,
  initialData
}: {
  children: ReactNode
  initialData: any
}) {
  const pathname = usePathname()
  const [data, setData] = useState(initialData)

  // Can use hooks, fetch data, access browser APIs
  useEffect(() => {
    // Client-side logic here
  }, [pathname])

  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

### React Context in Layouts

**Recommended**: Place context providers in a separate Client Component, not directly in layout.tsx:

```tsx
// app/providers.tsx (Client Component)
'use client'

import { createContext, ReactNode } from 'react'

export const ThemeContext = createContext({})

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value="dark">
      {children}
    </ThemeContext.Provider>
  )
}
```

```tsx
// app/layout.tsx (Server Component)
import Providers from './providers'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

**Pattern for Passing Server Data to Client Context:**

```tsx
// app/layout.tsx (Server Component)
import UserProvider from './user-provider'

export default async function RootLayout({ children }) {
  // Fetch data on server
  const userPromise = fetchUser()

  return (
    <html>
      <body>
        <UserProvider userPromise={userPromise}>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
```

```tsx
// app/user-provider.tsx (Client Component)
'use client'

import { createContext, useContext, use } from 'react'

const UserContext = createContext<Promise<User> | null>(null)

export function UserProvider({
  children,
  userPromise
}: {
  children: React.ReactNode
  userPromise: Promise<User>
}) {
  return (
    <UserContext.Provider value={userPromise}>
      {children}
    </UserContext.Provider>
  )
}

// Hook to consume user data
export function useUser() {
  const userPromise = useContext(UserContext)
  if (!userPromise) throw new Error('useUser must be within UserProvider')

  // React 19 'use' hook unwraps the promise
  const user = use(userPromise)
  return user
}
```

**Key Takeaway**: Keep layouts as Server Components and wrap interactive elements (hooks, browser APIs) in separate Client Components.

---

## 2. Route Groups

### Syntax and Purpose

Route groups use parentheses `(groupName)` to organize routes **without affecting URL structure**.

```
app/
├── (marketing)/
│   ├── layout.tsx         # Marketing layout
│   ├── about/
│   │   └── page.tsx       # URL: /about
│   └── pricing/
│       └── page.tsx       # URL: /pricing
├── (dashboard)/
│   ├── layout.tsx         # Dashboard layout
│   ├── profile/
│   │   └── page.tsx       # URL: /profile
│   └── settings/
│       └── page.tsx       # URL: /settings
└── interview/
    └── page.tsx           # URL: /interview (no route group)
```

### Use Case: Conditional Sidebar with Route Groups

**Perfect for showing sidebar on some pages but not others:**

```tsx
// app/(dashboard)/layout.tsx
// This layout applies to /profile, /settings, etc.
export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

```tsx
// app/interview/page.tsx
// This page is OUTSIDE the (dashboard) group
// So it doesn't get the sidebar layout
export default function InterviewPage() {
  return <div>Full-width interview page, no sidebar</div>
}
```

### Multiple Root Layouts with Route Groups

You can even have **multiple root layouts** for different sections:

```
app/
├── (marketing)/
│   └── layout.tsx         # One root layout
├── (app)/
│   └── layout.tsx         # Another root layout
└── layout.tsx             # Optional shared root
```

**Documentation Quote:**
> "Route groups are useful for organizing routes by site section, intent, or team (such as marketing pages or admin pages), enabling nested layouts in the same route segment level, creating multiple nested layouts in the same segment including multiple root layouts, and adding a layout to a subset of routes in a common segment."

---

## 3. Dynamic Route Segments with Nested Pages

### Pattern: `/ideas/[id]/market-analysis/page.tsx`

Dynamic segments flow through **all nested layouts and pages**.

```
app/
└── ideas/
    ├── [id]/
    │   ├── layout.tsx           # Has access to params.id
    │   ├── page.tsx             # Has access to params.id
    │   └── market-analysis/
    │       └── page.tsx         # Also has access to params.id
```

### Accessing Params in Nested Layouts

**Every layout and page in the nested hierarchy receives the same params:**

```tsx
// app/ideas/[id]/layout.tsx
export default async function IdeaLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div>
      <h1>Idea {id}</h1>
      {children}
    </div>
  )
}
```

```tsx
// app/ideas/[id]/market-analysis/page.tsx
export default async function MarketAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch data using the id
  const analysis = await fetchMarketAnalysis(id)

  return <div>{analysis.content}</div>
}
```

### Multiple Dynamic Segments

Nested dynamic segments accumulate in params:

```
app/shop/[category]/[product]/page.tsx
```

```tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ category: string; product: string }>
}) {
  const { category, product } = await params

  // URL: /shop/electronics/laptop
  // category = "electronics"
  // product = "laptop"

  return <div>...</div>
}
```

### Params as Promise (Next.js 15+)

**Critical**: In Next.js 15, `params` is now a **Promise** and must be awaited:

```tsx
// ✅ Correct (Next.js 15+)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>{id}</div>
}

// ❌ Old pattern (pre-Next.js 15)
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>
}
```

---

## 4. Code Splitting Behavior

### Automatic Code Splitting by Route

Next.js **automatically code-splits each page.tsx** in the App Router:

- Each `page.tsx` becomes its own JavaScript chunk
- Code is loaded on-demand when navigating to that route
- Reduces initial bundle size significantly

**From Documentation:**
> "Server Components enable automatic code-splitting by route segments. Instead of loading all code upfront, only the code needed for the current route is loaded, reducing initial load time."

### Nested Routes and Layouts

**Question**: Does code splitting work with multiple route segments under the same layout?

**Answer**: Yes! Each nested page.tsx is split into its own chunk:

```
app/ideas/[id]/
├── page.tsx              # Chunk: /ideas/[id]
├── market-analysis/
│   └── page.tsx          # Chunk: /ideas/[id]/market-analysis
└── interview/
    └── page.tsx          # Chunk: /ideas/[id]/interview
```

- Shared layout code loads once
- Each sub-page loads its own chunk on navigation

### Manual Lazy Loading with next/dynamic

For **Client Components** that need conditional loading:

```tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Load component only when needed
const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false // Optional: disable SSR for this component
})

export default function Analytics() {
  const [showChart, setShowChart] = useState(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && <HeavyChart />}
    </div>
  )
}
```

**Key Points:**
- Server Components: Automatically code-split by route
- Client Components: Use `next/dynamic` for lazy loading
- Layouts: Loaded once and reused across navigation

---

## 5. usePathname() in Layouts

### Pattern: Conditional Sidebar Rendering

Use `usePathname()` in a **Client Component** to conditionally render UI based on current route:

```tsx
// app/conditional-sidebar.tsx (Client Component)
'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'

export default function ConditionalSidebar({ children }) {
  const pathname = usePathname()

  // Hide sidebar on interview pages
  const showSidebar = !pathname.includes('/interview')

  return (
    <div className="flex">
      {showSidebar && <Sidebar />}
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

```tsx
// app/layout.tsx (Server Component)
import ConditionalSidebar from './conditional-sidebar'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConditionalSidebar>
          {children}
        </ConditionalSidebar>
      </body>
    </html>
  )
}
```

### Active Navigation Links

Classic pattern for highlighting active navigation:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav>
      <Link
        className={`link ${pathname === '/' ? 'active' : ''}`}
        href="/"
      >
        Home
      </Link>

      <Link
        className={`link ${pathname === '/about' ? 'active' : ''}`}
        href="/about"
      >
        About
      </Link>
    </nav>
  )
}
```

### Breadcrumbs Example

```tsx
'use client'

import { usePathname } from 'next/navigation'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav>
      {segments.map((segment, index) => (
        <span key={index}>
          {' > '}
          {segment}
        </span>
      ))}
    </nav>
  )
}
```

### Important Caveat: Layouts Don't Re-render on Navigation

**From Documentation:**
> "Layouts do not rerender on navigation, so they cannot access search params which would otherwise become stale."

**Solution**: Use `usePathname()` or `useSearchParams()` in **Client Components** within the layout, which DO re-render on navigation.

---

## 6. refetchInterval with tRPC/React Query in Layout

### Setup: tRPC Provider in Layout

```tsx
// app/layout.tsx (Server Component)
import { TRPCReactProvider } from '@/lib/trpc/client'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  )
}
```

```tsx
// lib/trpc/client.tsx (Client Component)
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import type { AppRouter } from '@/server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()

export function TRPCReactProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

### Pattern: Polling in Layout Component

**Create a Client Component that wraps child routes and polls for data:**

```tsx
// app/(dashboard)/layout-with-polling.tsx (Client Component)
'use client'

import { trpc } from '@/lib/trpc/client'
import { ReactNode } from 'react'

export default function DashboardLayoutWithPolling({
  children
}: {
  children: ReactNode
}) {
  // Poll for user stats every 30 seconds
  const { data: stats } = trpc.user.stats.useQuery(undefined, {
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
  })

  return (
    <div className="flex">
      <Sidebar stats={stats} />
      <main>{children}</main>
    </div>
  )
}
```

```tsx
// app/(dashboard)/layout.tsx (Server Component)
import DashboardLayoutWithPolling from './layout-with-polling'

export default function DashboardLayout({ children }) {
  return <DashboardLayoutWithPolling>{children}</DashboardLayoutWithPolling>
}
```

### refetchInterval Options

Since `UseTRPCQueryOptions` extends `@tanstack/react-query`'s `UseQueryOptions`, you can use any React Query options:

```tsx
const { data } = trpc.research.getProgress.useQuery(
  { ideaId: '123' },
  {
    // Fixed interval (number in ms)
    refetchInterval: 5000,

    // Or dynamic interval (function)
    refetchInterval: (data) => {
      // Stop polling when complete
      if (data?.status === 'COMPLETE') return false
      return 5000
    },

    // Continue polling when tab is in background
    refetchIntervalInBackground: true,

    // Only fetch when component is mounted
    enabled: true,

    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  }
)
```

### Type Issue Warning

**Known Issue**: When using `refetchInterval` as a function with `select` that changes the result type, TypeScript may error. Workaround: use a number instead of function, or avoid `select` type transformation.

```tsx
// ⚠️ May cause TypeScript error
const { data } = trpc.idea.get.useQuery(
  { id },
  {
    refetchInterval: (data) => (data?.complete ? false : 5000),
    select: (data) => data.title, // Type transformation
  }
)

// ✅ Workaround: Use number or avoid select
const { data } = trpc.idea.get.useQuery(
  { id },
  {
    refetchInterval: 5000,
  }
)
```

### Conditional Polling Example

```tsx
'use client'

import { trpc } from '@/lib/trpc/client'

export default function ResearchProgress({ ideaId }: { ideaId: string }) {
  const { data: progress } = trpc.research.getProgress.useQuery(
    { ideaId },
    {
      // Poll every 5 seconds while research is in progress
      refetchInterval: (data) => {
        const inProgress = ['DISCOVERY', 'ANALYSIS', 'SYNTHESIS'].includes(
          data?.phase ?? ''
        )
        return inProgress ? 5000 : false
      },
      refetchIntervalInBackground: false,
    }
  )

  return (
    <div>
      {progress?.phase === 'COMPLETE' ? (
        <p>Research complete!</p>
      ) : (
        <p>Phase: {progress?.phase}...</p>
      )}
    </div>
  )
}
```

---

## Summary Table

| Pattern | Recommended Approach | Key Considerations |
|---------|---------------------|-------------------|
| **Client Component Layouts** | ❌ Avoid. Use composition with Client Component wrapper instead | Lose async fetching, server APIs, metadata |
| **React Context** | ✅ Create separate Client Component provider | Pass server data as props, children remain Server Components |
| **Route Groups** | ✅ Use `(groupName)` folders for conditional layouts | Doesn't affect URL structure, enables multiple layouts |
| **Dynamic Params** | ✅ Access via `params` prop (must await in Next.js 15) | Flows through all nested layouts/pages |
| **Code Splitting** | ✅ Automatic by route, use `next/dynamic` for Client Components | Each page.tsx is separate chunk |
| **usePathname()** | ✅ Use in Client Components within layout | Layout itself doesn't re-render, but Client Components do |
| **refetchInterval** | ✅ Use in Client Component that wraps children | Full React Query options supported |

---

## Key References

### Official Documentation
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/page)
- [Layouts](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
- [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)
- [Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)

### Community Resources
- [Best Practice: Should 'use client' be avoided in layout.tsx files?](https://github.com/vercel/next.js/discussions/76015)
- [Can Layouts be Client Components in Next.js?](https://www.alofthq.site/blog/can-layouts-be-client-components-in-nextjs)
- [tRPC React Query Integration](https://trpc.io/docs/client/react)
- [tRPC Next.js Setup](https://trpc.io/docs/client/nextjs)

---

## Implementation Recommendations

Based on this research, here's the recommended architecture for the Forge Automation BETA app:

### 1. Keep Layouts as Server Components
- `app/layout.tsx` should remain a Server Component
- Wrap interactive logic in separate Client Components

### 2. Use Route Groups for Conditional Sidebar
```
app/
├── (dashboard)/              # Has sidebar
│   ├── layout.tsx
│   ├── ideas/
│   └── reports/
└── interview/                # No sidebar
    └── page.tsx
```

### 3. Create Polling Wrapper for Active Research
```tsx
// app/(dashboard)/ideas/[id]/research-polling-wrapper.tsx
'use client'

export default function ResearchPollingWrapper({ ideaId, children }) {
  const { data } = trpc.research.getProgress.useQuery(
    { ideaId },
    { refetchInterval: 5000 }
  )

  return children
}
```

### 4. Conditional Sidebar with usePathname
```tsx
// app/conditional-layout.tsx
'use client'

export default function ConditionalLayout({ children }) {
  const pathname = usePathname()
  const showSidebar = !pathname.includes('/interview')

  return (
    <div className="flex">
      {showSidebar && <Sidebar />}
      <main>{children}</main>
    </div>
  )
}
```

This architecture maintains the benefits of Server Components while enabling client-side interactivity where needed.
