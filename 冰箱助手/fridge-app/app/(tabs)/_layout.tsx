import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => null}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="status" />
      <Tabs.Screen name="recipes" />
      <Tabs.Screen name="record" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
