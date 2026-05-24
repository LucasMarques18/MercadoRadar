import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2e7d32',
        tabBarStyle: { paddingBottom: 8, height: 60 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="comparar"
        options={{
          tabBarLabel: 'Comparar',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="mercados"
        options={{
          tabBarLabel: 'Mercados',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏪</Text>,
        }}
      />
    </Tabs>
  );
}