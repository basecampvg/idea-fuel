import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  LoadingScreen,
} from '../../components/ui';
import { SUBSCRIPTION_TIER_LABELS, SUBSCRIPTION_TIER_DESCRIPTIONS } from '@forge/shared';

export default function SettingsScreen() {
  const { user: authUser, signOut, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();
  const { data: subscription, isLoading: subLoading } = trpc.user.subscription.useQuery();

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleUpdateProfile = () => {
    setIsSaving(true);
    updateUser.mutate({ name });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  if (userLoading || subLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Profile */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="mb-4 flex-row items-center">
              {user?.image ? (
                <View className="h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                  {/* Image would go here */}
                  <View className="h-full w-full items-center justify-center bg-blue-100">
                    <Text className="text-xl font-medium text-blue-600">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Text className="text-xl font-medium text-blue-600">
                    {user?.name?.[0] || user?.email?.[0] || 'U'}
                  </Text>
                </View>
              )}
              <View className="ml-4">
                <Text className="font-medium text-gray-900">
                  {user?.name || 'No name set'}
                </Text>
                <Text className="text-sm text-gray-500">{user?.email}</Text>
              </View>
            </View>

            <Input
              label="Display Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />

            <Input
              label="Email"
              value={user?.email || ''}
              editable={false}
              hint="Email cannot be changed"
            />

            <Button onPress={handleUpdateProfile} isLoading={isSaving}>
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan and features</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-lg font-medium text-gray-900">
                    {subscription?.tier
                      ? SUBSCRIPTION_TIER_LABELS[subscription.tier]
                      : 'Free'}{' '}
                    Plan
                  </Text>
                  <Badge
                    variant={
                      subscription?.tier === 'ENTERPRISE'
                        ? 'success'
                        : subscription?.tier === 'PRO'
                        ? 'info'
                        : 'default'
                    }
                    className="ml-2"
                  >
                    {subscription?.tier || 'FREE'}
                  </Badge>
                </View>
                <Text className="mt-1 text-sm text-gray-500">
                  {subscription?.tier
                    ? SUBSCRIPTION_TIER_DESCRIPTIONS[subscription.tier]
                    : 'Basic features'}
                </Text>
              </View>
            </View>

            {subscription?.features && (
              <View className="mt-4 space-y-2">
                <View className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3">
                  <Text className="text-sm text-gray-500">Ideas Limit</Text>
                  <Text className="font-medium text-gray-900">
                    {subscription.features.maxIdeas === -1
                      ? 'Unlimited'
                      : subscription.features.maxIdeas}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3">
                  <Text className="text-sm text-gray-500">Reports per Idea</Text>
                  <Text className="font-medium text-gray-900">
                    {subscription.features.maxReportsPerIdea}
                  </Text>
                </View>
              </View>
            )}

            <Button variant="outline" className="mt-4" disabled>
              Upgrade (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-lg border border-gray-200 p-4"
              onPress={handleSignOut}
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={20} color="#374151" />
                <View className="ml-3">
                  <Text className="font-medium text-gray-900">Sign out</Text>
                  <Text className="text-sm text-gray-500">
                    Sign out of your account on this device
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Account Info */}
        <View className="py-4">
          <Text className="text-center text-sm text-gray-500">
            Member since{' '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
