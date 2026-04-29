import type { Metadata } from 'next';
import { MobilePageClient } from './mobile-client';

export const metadata: Metadata = {
  title: 'IdeaFuel Mobile: Catch ideas the moment they hit',
  description:
    "Most great ideas show up in the car, on the trail, in the shower. IdeaFuel's mobile app is built for that exact moment, and it doesn't stop at capture.",
  openGraph: {
    title: 'IdeaFuel Mobile: Catch ideas the moment they hit',
    description:
      "Most great ideas show up in the car, on the trail, in the shower. IdeaFuel's mobile app is built for that exact moment, and it doesn't stop at capture.",
    url: 'https://ideafuel.ai/mobile',
    siteName: 'IdeaFuel',
    type: 'website',
  },
};

export default function MobilePage() {
  return <MobilePageClient />;
}
