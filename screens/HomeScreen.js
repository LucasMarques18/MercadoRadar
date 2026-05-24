import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>📡 MercadoRadar</Text>
        <Text style={styles.subtitle}>Seu comparador de preços</Text>
      </View>

      {/* Botão principal — Escanear nota */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.scanIcon}>📷</Text>
        <Text style={styles.scanText}>Escanear Nota Fiscal</Text>
        <Text style={styles.scanDesc}>Aponte para o QR code do cupom</Text>
      </TouchableOpacity>

      {/* Cards de resumo */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Mercados</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Notas</Text>
        </View>
      </View>

      {/* Seção de últimas compras */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimas Compras</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Nenhuma compra registrada ainda.</Text>
          <Text style={styles.emptyDesc}>Escaneie sua primeira nota fiscal!</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 32,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#a5d6a7',
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#43a047',
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,        // sombra no Android
    shadowColor: '#000', // sombra no iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  scanText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanDesc: {
    fontSize: 13,
    color: '#c8e6c9',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  section: {
    margin: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 6,
  },
});