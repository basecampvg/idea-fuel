import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { APP_NAME, formatDate } from '@forge/shared';
import "./global.css";

export default function App() {
  const currentDate = formatDate(new Date());

  return (
    <View className="flex-1 bg-white items-center justify-center p-4">
      <Text className="text-2xl font-bold mb-2">{APP_NAME}</Text>
      <Text className="text-sm text-gray-500 mb-4">{currentDate}</Text>
      <Text className="text-lg font-semibold">Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
