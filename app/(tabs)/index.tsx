import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  buscarGastosPorMercado,
  buscarMaioresVariacoes,
  buscarResumo,
  buscarUltimasNotas
} from '../../database/db';

type UltimaNota = {
  id: number;
  mercado: string;
  total: number;
  data_compra: string;
  total_itens: number;
};

type GastoMercado = {
  mercado: string;
  total_gasto: number;
  total_notas: number;
};

type Variacao = {
  produto: string;
  preco_minimo: number;
  preco_maximo: number;
  variacao: number;
  variacao_pct: number;
  mercado_barato: string;
  mercado_caro: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [resumo, setResumo] = useState({ mercados: 0, produtos: 0, notas: 0 });
  const [ultimasNotas, setUltimasNotas] = useState<UltimaNota[]>([]);
  const [gastos, setGastos] = useState<GastoMercado[]>([]);
  const [variacoes, setVariacoes] = useState<Variacao[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Recarrega dados toda vez que a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = () => {
    try {
      setResumo(buscarResumo());
      setUltimasNotas(buscarUltimasNotas(5));
      setGastos(buscarGastosPorMercado());
      setVariacoes(buscarMaioresVariacoes(5));
    } catch (e) {
      console.error('Erro ao carregar home:', e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
    setRefreshing(false);
  };

  const formatarData = (data: string) => {
    if (!data) return '—';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const totalMes = gastos.reduce((acc, g) => acc + g.total_gasto, 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e7d32']} />}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📡 MercadoRadar</Text>
          <Text style={styles.subtitle}>Seu comparador de preços</Text>
        </View>
        {totalMes > 0 && (
          <View style={styles.headerTotal}>
            <Text style={styles.headerTotalLabel}>gasto este mês</Text>
            <Text style={styles.headerTotalValor}>R$ {totalMes.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Botão principal */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/scanner')}
      >
        <Text style={styles.scanIcon}>📷</Text>
        <Text style={styles.scanText}>Escanear Nota Fiscal</Text>
        <Text style={styles.scanDesc}>Aponte para o QR code do cupom</Text>
      </TouchableOpacity>

      {/* Cards de resumo */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/(tabs)/mercados')}
        >
          <Text style={styles.statNum}>{resumo.mercados}</Text>
          <Text style={styles.statLabel}>Mercados</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/(tabs)/comparar')}
        >
          <Text style={styles.statNum}>{resumo.produtos}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/historico')}
        >
          <Text style={styles.statNum}>{resumo.notas}</Text>
          <Text style={styles.statLabel}>Notas</Text>
        </TouchableOpacity>
      </View>

      {/* Total gasto por mercado no último mês */}
      {gastos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Gasto por mercado — últimos 30 dias</Text>
          {gastos.map((g, i) => {
            const pct = totalMes > 0 ? (g.total_gasto / totalMes) * 100 : 0;
            return (
              <View key={i} style={styles.gastoItem}>
                <View style={styles.gastoHeader}>
                  <Text style={styles.gastoMercado} numberOfLines={1}>{g.mercado}</Text>
                  <Text style={styles.gastoValor}>R$ {g.total_gasto.toFixed(2)}</Text>
                </View>
                <View style={styles.barraFundo}>
                  <View style={[styles.barraPreenchida, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.gastoNotas}>{g.total_notas} {g.total_notas === 1 ? 'nota' : 'notas'}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Maiores variações de preço */}
      {variacoes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Maiores variações de preço</Text>
          <Text style={styles.sectionDesc}>Produtos com maior diferença entre mercados</Text>
          {variacoes.map((v, i) => (
            <TouchableOpacity
              key={i}
              style={styles.variacaoCard}
              onPress={() => router.push('/(tabs)/comparar')}
            >
              <View style={styles.variacaoInfo}>
                <Text style={styles.variacaoProduto} numberOfLines={2}>{v.produto}</Text>
                <View style={styles.variacaoMercados}>
                  <Text style={styles.variacaoBarato} numberOfLines={1}>
                    🏆 {v.mercado_barato}
                  </Text>
                  <Text style={styles.variacaoCaro} numberOfLines={1}>
                    💸 {v.mercado_caro}
                  </Text>
                </View>
              </View>
              <View style={styles.variacaoPrecos}>
                <View style={styles.variacaoBadge}>
                  <Text style={styles.variacaoPct}>+{v.variacao_pct}%</Text>
                </View>
                <Text style={styles.variacaoMin}>R$ {v.preco_minimo.toFixed(2)}</Text>
                <Text style={styles.variacaoSeta}>↕</Text>
                <Text style={styles.variacaoMax}>R$ {v.preco_maximo.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Últimas notas */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🧾 Últimas notas</Text>
          {ultimasNotas.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/historico')}>
              <Text style={styles.verTodas}>Ver todas →</Text>
            </TouchableOpacity>
          )}
        </View>

        {ultimasNotas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Nenhuma compra registrada ainda.</Text>
            <Text style={styles.emptyDesc}>Escaneie sua primeira nota fiscal!</Text>
          </View>
        ) : (
          ultimasNotas.map((nota) => (
            <TouchableOpacity
              key={nota.id}
              style={styles.notaCard}
              onPress={() => router.push({ pathname: '/nota', params: { id: nota.id } })}
            >
              <View style={styles.notaInfo}>
                <Text style={styles.notaMercado} numberOfLines={1}>{nota.mercado}</Text>
                <Text style={styles.notaData}>{formatarData(nota.data_compra)}</Text>
                <Text style={styles.notaItens}>{nota.total_itens} itens</Text>
              </View>
              <Text style={styles.notaTotal}>R$ {(nota.total ?? 0).toFixed(2)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#2e7d32',
    padding: 28,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#a5d6a7', marginTop: 4 },
  headerTotal: { alignItems: 'flex-end' },
  headerTotalLabel: { fontSize: 11, color: '#a5d6a7' },
  headerTotalValor: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scanButton: {
    backgroundColor: '#43a047',
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanIcon: { fontSize: 48, marginBottom: 8 },
  scanText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  scanDesc: { fontSize: 13, color: '#c8e6c9', marginTop: 4 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 16, alignItems: 'center', elevation: 2,
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#2e7d32' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  section: { margin: 16, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  sectionDesc: { fontSize: 12, color: '#aaa', marginTop: -8, marginBottom: 12 },
  verTodas: { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  // Gastos
  gastoItem: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 10, elevation: 1,
  },
  gastoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gastoMercado: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  gastoValor: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  barraFundo: {
    height: 6, backgroundColor: '#e8f5e9',
    borderRadius: 3, marginBottom: 6,
  },
  barraPreenchida: {
    height: 6, backgroundColor: '#2e7d32', borderRadius: 3,
  },
  gastoNotas: { fontSize: 11, color: '#aaa' },
  // Variações
  variacaoCard: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 10, elevation: 1,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  variacaoInfo: { flex: 1, marginRight: 12 },
  variacaoProduto: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  variacaoMercados: { gap: 2 },
  variacaoBarato: { fontSize: 11, color: '#2e7d32' },
  variacaoCaro: { fontSize: 11, color: '#c62828' },
  variacaoPrecos: { alignItems: 'center', gap: 2 },
  variacaoBadge: {
    backgroundColor: '#fff3e0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  variacaoPct: { fontSize: 13, fontWeight: 'bold', color: '#e65100' },
  variacaoMin: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  variacaoSeta: { fontSize: 12, color: '#aaa' },
  variacaoMax: { fontSize: 12, color: '#c62828', fontWeight: '600' },
  // Últimas notas
  notaCard: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 10, elevation: 1,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  notaInfo: { flex: 1, marginRight: 12 },
  notaMercado: { fontSize: 14, fontWeight: '600', color: '#333' },
  notaData: { fontSize: 12, color: '#888', marginTop: 3 },
  notaItens: { fontSize: 11, color: '#aaa', marginTop: 2 },
  notaTotal: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  // Empty state
  emptyState: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 32, alignItems: 'center', elevation: 1,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#555', fontWeight: '600' },
  emptyDesc: { fontSize: 13, color: '#aaa', marginTop: 6 },
});