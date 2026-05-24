import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { buscarHistoricoNotas, removerNota } from '../database/db';

type Nota = {
  id: number;
  mercado: string;
  total: number;
  data_compra: string;
  atualizado_em: string;
  total_itens: number;
};

export default function HistoricoScreen() {
  const router = useRouter();
  const { mercado_id, mercado_nome } = useLocalSearchParams();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = () => {
    setCarregando(true);
    try {
      const id = mercado_id ? Number(mercado_id) : undefined;
      const dados = buscarHistoricoNotas(id);
      setNotas(dados);
    } catch (e) {
      console.error('Erro ao carregar notas:', e);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarRemover = (nota: Nota) => {
    Alert.alert(
      '🗑️ Remover nota',
      `Deseja remover a nota do ${nota.mercado}?\n\nEssa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removerNota(nota.id);
            carregarNotas();
          }
        }
      ]
    );
  };

  const formatarData = (data: string) => {
    if (!data) return '—';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderNota = ({ item }: { item: Nota }) => (
    <TouchableOpacity
      style={styles.notaCard}
      onPress={() => router.push({ pathname: '/nota', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.notaHeader}>
        <View style={styles.notaInfo}>
          {/* Só mostra o nome do mercado se não estiver filtrando */}
          {!mercado_id && (
            <Text style={styles.notaMercado} numberOfLines={1}>{item.mercado}</Text>
          )}
          <Text style={styles.notaData}>🗓 {formatarData(item.data_compra)}</Text>
          {item.atualizado_em && item.atualizado_em !== item.data_compra && (
            <Text style={styles.notaAtualizado}>
              ✏️ Editado em {formatarData(item.atualizado_em)}
            </Text>
          )}
        </View>
        <View style={styles.notaResumo}>
          <Text style={styles.notaTotal}>R$ {(item.total ?? 0).toFixed(2)}</Text>
          <Text style={styles.notaItens}>{item.total_itens} itens</Text>
        </View>
      </View>

      <View style={styles.notaRodape}>
        <Text style={styles.notaVerDetalhes}>Ver detalhes →</Text>
        <TouchableOpacity
          style={styles.btnRemoverNota}
          onPress={() => confirmarRemover(item)}
        >
          <Text style={styles.btnRemoverNotaTexto}>🗑️ Remover</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <Text style={styles.btnVoltarTexto}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>
            {mercado_nome ? mercado_nome as string : 'Histórico de Notas'}
          </Text>
          <Text style={styles.headerSubtitulo}>{notas.length} notas registradas</Text>
        </View>
      </View>

      {notas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.vazioIcone}>🧾</Text>
          <Text style={styles.vazioTexto}>Nenhuma nota registrada ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={notas}
          keyExtractor={item => item.id.toString()}
          renderItem={renderNota}
          contentContainerStyle={styles.lista}
          onRefresh={carregarNotas}
          refreshing={carregando}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btnVoltar: { padding: 4 },
  btnVoltarTexto: { color: '#a5d6a7', fontSize: 15 },
  headerTextos: { flex: 1 },
  headerTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitulo: { color: '#a5d6a7', fontSize: 13, marginTop: 2 },
  lista: { padding: 16 },
  notaCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  notaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notaInfo: { flex: 1, marginRight: 12 },
  notaMercado: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  notaData: { fontSize: 12, color: '#888', marginTop: 4 },
  notaAtualizado: { fontSize: 11, color: '#aaa', marginTop: 2 },
  notaResumo: { alignItems: 'flex-end' },
  notaTotal: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  notaItens: { fontSize: 12, color: '#888', marginTop: 2 },
  notaRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notaVerDetalhes: { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  btnRemoverNota: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnRemoverNotaTexto: { fontSize: 12, color: '#c62828' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  vazioIcone: { fontSize: 48 },
  vazioTexto: { fontSize: 15, color: '#888' },
});