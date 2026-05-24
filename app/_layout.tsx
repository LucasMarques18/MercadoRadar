import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { inicializarBanco } from '../database/db';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      inicializarBanco();
    } catch (e) {
      console.error('Erro ao inicializar banco:', e);
    } finally {
      setPronto(true);
    }
  }, []);

  // Aguarda o banco estar pronto antes de renderizar as telas
  if (!pronto) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="revisao" options={{ presentation: 'card' }} />
      <Stack.Screen name="historico" options={{ presentation: 'card' }} />
      <Stack.Screen name='nota' options={{ presentation: 'card' }} />
    </Stack>
  );
}