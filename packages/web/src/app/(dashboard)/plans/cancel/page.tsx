'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlansCancelPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          No worries!
        </h1>
        <p className="text-muted-foreground mb-8">
          You can come back and upgrade anytime. Your current plan and all your data
          are still here waiting for you.
        </p>

        <Link href="/plans">
          <Button variant="outline" className="group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
