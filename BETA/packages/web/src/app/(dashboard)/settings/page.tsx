'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { SUBSCRIPTION_TIER_LABELS, SUBSCRIPTION_TIER_DESCRIPTIONS } from '@forge/shared';

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage your account and preferences</p>
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-medium text-blue-600">
                  {user?.name?.[0] || user?.email?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{user?.name || 'No name set'}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
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
                <p className="text-lg font-medium text-gray-900">
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
              <p className="mt-1 text-sm text-gray-500">
                {subscription?.tier
                  ? SUBSCRIPTION_TIER_DESCRIPTIONS[subscription.tier]
                  : 'Basic features'}
              </p>
            </div>
            <Button variant="outline" disabled>
              Upgrade (Coming Soon)
            </Button>
          </div>

          {subscription?.features && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Ideas Limit</p>
                <p className="font-medium text-gray-900">
                  {subscription.features.maxIdeas === -1
                    ? 'Unlimited'
                    : subscription.features.maxIdeas}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Reports per Idea</p>
                <p className="font-medium text-gray-900">
                  {subscription.features.maxReportsPerIdea}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Report Tiers</p>
                <p className="font-medium text-gray-900">
                  {subscription.features.reportTierAccess.join(', ')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Interview Modes</p>
                <p className="font-medium text-gray-900">
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
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="font-medium text-gray-900">Sign out</p>
              <p className="text-sm text-gray-500">Sign out of your account on this device</p>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign out
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <p className="font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-700">
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
          <p className="text-center text-sm text-gray-500">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
