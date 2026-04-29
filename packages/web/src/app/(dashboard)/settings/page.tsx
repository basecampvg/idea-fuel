'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRight, CreditCard } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useSubscription } from '@/components/subscription/use-subscription';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();

  const deleteAccount = trpc.user.delete.useMutation({
    onSuccess: async () => {
      // Clear all client state then sign out. The server has already
      // deleted the session; signOut redirects home.
      await signOut({ callbackUrl: '/' });
    },
    onError: (error) => {
      setDeleteError(error.message);
    },
  });

  const handleDeleteAccount = () => {
    setDeleteError(null);
    deleteAccount.mutate({ emailConfirmation: deleteConfirmation });
  };

  // Sync name state when user data loads
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const { data: subscription, isLoading: subLoading } = trpc.user.subscription.useQuery();
  const { isSubscribed, stripeCurrentPeriodEnd } = useSubscription();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const createPortal = trpc.billing.createPortalSession.useMutation();

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { url } = await createPortal.mutateAsync();
      window.location.href = url;
    } catch {
      setIsPortalLoading(false);
    }
  };

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

      {/* Founder Profile — dev-only */}
      {user?.role === 'SUPER_ADMIN' && <FounderProfileForm />}

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
            <div className="flex items-center gap-3">
              {isSubscribed && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  isLoading={isPortalLoading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              )}
              <Link href="/plans">
                <Button variant="accent" className="group">
                  View Plans
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {isSubscribed && stripeCurrentPeriodEnd && (
            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="text-sm text-muted-foreground">Current billing period ends</p>
              <p className="font-medium text-foreground">
                {stripeCurrentPeriodEnd.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

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

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            {!showDeleteDialog ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-destructive/80">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteConfirmation('');
                    setShowDeleteDialog(true);
                  }}
                >
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-destructive">
                    Are you sure? This cannot be undone.
                  </p>
                  <p className="mt-1 text-sm text-destructive/80">
                    Deleting your account permanently removes your projects,
                    ideas, interviews, reports, and billing data. Any blog
                    posts you've authored stay published with the author set
                    to &ldquo;Deleted user.&rdquo; If you have an active
                    subscription, it&rsquo;s canceled.
                  </p>
                  <p className="mt-2 text-sm text-destructive/80">
                    Type your email (<span className="font-mono">{user?.email}</span>) to
                    confirm:
                  </p>
                </div>
                <Input
                  type="email"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="your-email@example.com"
                  autoComplete="off"
                  disabled={deleteAccount.isPending}
                />
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteAccount.isPending ||
                      deleteConfirmation.trim().toLowerCase() !==
                        (user?.email ?? '').trim().toLowerCase()
                    }
                  >
                    {deleteAccount.isPending
                      ? 'Deleting…'
                      : 'Yes, permanently delete my account'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmation('');
                      setDeleteError(null);
                    }}
                    disabled={deleteAccount.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
