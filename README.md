# Forge Automation

A monorepo setup for building web and mobile applications with shared code.

## Project Structure

```
Forge Automation/
├── packages/
│   ├── web/           # Next.js web app
│   ├── mobile/        # Expo React Native mobile app
│   └── shared/        # Shared code between web and mobile
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

- **Web**: Next.js 16 with TypeScript, Tailwind CSS, and App Router
- **Mobile**: Expo React Native with TypeScript and NativeWind (Tailwind CSS for React Native)
- **Shared**: TypeScript utilities, types, and constants
- **Package Manager**: pnpm with workspaces
- **Styling**: Tailwind CSS (web) and NativeWind (mobile)

## Getting Started

### Prerequisites

All dependencies are already installed:
- Node.js v24.12.0
- pnpm v10.28.0
- Git v2.52.0

### Development

Run both web and mobile dev servers simultaneously:
```bash
pnpm dev
```

Or run them separately:

**Web App:**
```bash
pnpm dev:web
# Opens at http://localhost:3000
```

**Mobile App:**
```bash
pnpm dev:mobile
# Shows QR code to scan with Expo Go app
```

### Testing the Setup

Both apps now import and use shared code from `@forge/shared`:
- `APP_NAME` constant
- `formatDate()` utility function

You can see this working in:
- [packages/web/app/page.tsx](packages/web/app/page.tsx)
- [packages/mobile/App.tsx](packages/mobile/App.tsx)

## Mobile Development

### Testing on Your Phone

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android)
2. Run `pnpm dev:mobile`
3. Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android)

### Testing on Emulator

- **Android**: Requires Android Studio and Android emulator setup
- **iOS**: Requires macOS with Xcode installed

## Available Scripts

From the root directory:

- `pnpm dev` - Run all dev servers in parallel
- `pnpm dev:web` - Run Next.js dev server
- `pnpm dev:mobile` - Run Expo dev server
- `pnpm build` - Build all packages
- `pnpm build:web` - Build Next.js app for production
- `pnpm type-check` - Run TypeScript type checking on all packages
- `pnpm lint` - Run ESLint on all packages

## Shared Package

The `@forge/shared` package contains:

- **Types** (`src/types/`): Shared TypeScript interfaces and types
- **Utils** (`src/utils/`): Common utility functions
- **Constants** (`src/constants/`): Shared constants and configuration

### Using Shared Code

Import from `@forge/shared` in both web and mobile:

```typescript
import { APP_NAME, formatDate, type User } from '@forge/shared';
```

## Adding New Packages

To add a dependency to a specific package:

```bash
# Web package
pnpm --filter web add package-name

# Mobile package
pnpm --filter mobile add package-name

# Shared package
pnpm --filter @forge/shared add package-name
```

## VS Code Extensions (Recommended)

- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint

## Next Steps

1. Start building your web app in [packages/web/app/](packages/web/app/)
2. Start building your mobile app in [packages/mobile/App.tsx](packages/mobile/App.tsx)
3. Add shared code to [packages/shared/src/](packages/shared/src/)
4. Set up environment variables with `.env.local` files
5. Configure API endpoints and authentication

## Tailwind CSS

- **Web**: Uses Tailwind CSS v4 with PostCSS
- **Mobile**: Uses NativeWind v4 (Tailwind classes for React Native)

Note: Not all Tailwind classes work in NativeWind. Refer to the [NativeWind documentation](https://www.nativewind.dev/) for supported utilities.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
