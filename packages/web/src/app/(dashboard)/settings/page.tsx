'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SUBSCRIPTION_TIER_LABELS, SUBSCRIPTION_TIER_DESCRIPTIONS } from '@forge/shared';
import { FounderProfileForm } from './components/founder-profile-form';

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();

  // Sync name state when user data loads
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const { data: subscription, isLoading: subLoading } = trpc.user.subscription.useQuery();

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      updateSession();
      alert('Profile updated successfully');
    },
    onError: (error) => {
      alert('Failed to update profile: ' + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateUser.mutate({ name });
  };

  if (userLoading || subLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  return (
    <div className="w-full max-w-[1120px] mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateProfile}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'Profile'}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                  {user?.name?.[0] || user?.email?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{user?.name || 'No name set'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />

            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              hint="Email cannot be changed"
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Founder Profile */}
      <FounderProfileForm />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize your visual preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground">Choose light or dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium text-foreground">
                  {subscription?.tier ? SUBSCRIPTION_TIER_LABELS[subscription.tier] : 'Free'} Plan
                </p>
                <Badge
                  variant={
                    subscription?.tier === 'ENTERPRISE'
                      ? 'success'
                      : subscription?.tier === 'PRO'
                      ? 'info'
                      : 'default'
                  }
                >
                  {subscription?.tier || 'FREE'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {subscription?.tier
                  ? SUBSCRIPTION_TIER_DESCRIPTIONS[subscription.tier]
                  : 'Basic features'}
              </p>
            </div>
            <Link href="/plans">
              <Button variant="accent" className="group">
                View Plans
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {subscription?.features && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">Spark Reports</p>
                <p className="font-medium text-foreground">
                  {subscription.features.reportLimits.SPARK}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">Light Reports</p>
                <p className="font-medium text-foreground">
                  {subscription.features.reportLimits.LIGHT}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">In-Depth Reports</p>
                <p className="font-medium text-foreground">
                  {subscription.features.reportLimits.IN_DEPTH}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">Report Tiers</p>
                <p className="font-medium text-foreground">
                  {subscription.features.reportTierAccess.join(', ')}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">Interview Modes</p>
                <p className="font-medium text-foreground">
                  {subscription.features.interviewModes.join(', ')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Sign out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign out
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-destructive/80">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" disabled>
              Delete (Contact Support)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-center text-sm text-muted-foreground">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
