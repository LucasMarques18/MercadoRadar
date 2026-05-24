import { useState } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { salvarNota as salvarNoBanco } from "../database/db";

type Produto = {
    nome: string;
    codigo: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
}

export default function RevisaoScreen() {
    const { mercado, produtos, url_original: urlOriginal, cnpj } = useLocalSearchParams();
    const router = useRouter();

    const [itens, setItens] = useState<Produto[]>(
        JSON.parse(produtos as string)
    );
    const [salvando, setSalvando] = useState(false);

    const [modalVisivel, setModalVisivel] = useState(false);
    const [itemEditando, setItemEditando] = useState<Produto | null>(null);
    const [indiceEditando, setIndiceEditando] = useState<number>(-1);

    const abrirEdicao = (item: Produto, index: number) => {
        setItemEditando({ ...item });
        setIndiceEditando(index);
        setModalVisivel(true);
    };

    const salvarEdicao = () => {
        if (!itemEditando) return;

        const novosItens = [...itens];
        novosItens[indiceEditando] = {
            ...itemEditando, 
            valor_total: itemEditando.quantidade * itemEditando.valor_unitario
        };
        setItens(novosItens);
        setModalVisivel(false);
    };

    const removerItem = (index: number) => {
        Alert.alert(
            'Remover item', 
            `Deseja remover "${itens[index].nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover', 
                    style: 'destructive', 
                    onPress: () => {
                        const novosItens = itens.filter((_, i) => i !== index);
                        setItens(novosItens);
                    }
                }
            ]
        );
    };

    const totalNota = itens.reduce((acc, item) => acc + item.valor_total, 0);

    const confirmarSalvar = () => {
        Alert.alert(
            'Salvar nota', 
            `Salvar ${itens.length} produtos do ${mercado}?`, 
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salvar', onPress: salvarNota }
            ]
        );
    };

    const salvarNota = () => {
      setSalvando(true);

      try {
        const notaId = salvarNoBanco(
          mercado as string,
          urlOriginal as string, 
          cnpj as string,
          itens
        );

        Alert.alert(
          'Salvo com sucesso!', 
          `${itens.length} produtos salvos localmente.`,
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
        console.log('Itens salvos:', itens.length)
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Não foi possivel salvar.');
        console.error('Erro ao carregar notas:', error.message);
      } finally {
        setSalvando(false);
      }
    };

    const renderItem = ({ item, index }: { item: Produto, index: number }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemNome} numberOfLines={2}>{item.nome}</Text>
        <Text style={styles.itemDetalhe}>
          {item.quantidade}x R$ {item.valor_unitario.toFixed(2)}
        </Text>
      </View>
      <View style={styles.itemAcoes}>
        <Text style={styles.itemTotal}>R$ {item.valor_total.toFixed(2)}</Text>
        <View style={styles.botoesItem}>
          <TouchableOpacity
            style={styles.btnEditar}
            onPress={() => abrirEdicao(item, index)}
          >
            <Text style={styles.btnEditarTexto}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnRemover}
            onPress={() => removerItem(index)}
          >
            <Text style={styles.btnRemoverTexto}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <Text style={styles.btnVoltarTexto}>← Voltar</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitulo}>Revisar Nota</Text>
          <Text style={styles.headerMercado}>{mercado}</Text>
        </View>
      </View>

      {/* Resumo */}
      <View style={styles.resumo}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoNum}>{itens.length}</Text>
          <Text style={styles.resumoLabel}>Produtos</Text>
        </View>
        <View style={styles.resumoDivisor} />
        <View style={styles.resumoItem}>
          <Text style={styles.resumoNum}>R$ {totalNota.toFixed(2)}</Text>
          <Text style={styles.resumoLabel}>Total</Text>
        </View>
      </View>

      {/* Lista de produtos */}
      <FlatList
        data={itens}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <Text style={styles.listaHeader}>
            Toque em ✏️ para editar ou 🗑️ para remover
          </Text>
        }
      />

      {/* Botão salvar */}
      <View style={styles.rodape}>
        <TouchableOpacity
          style={[styles.btnSalvar, salvando && styles.btnSalvarDesabilitado]}
          onPress={confirmarSalvar}
          disabled={salvando || itens.length === 0}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnSalvarTexto}>💾 Confirmar e Salvar</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Modal de edição */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Editar Produto</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={itemEditando?.nome}
              onChangeText={v => setItemEditando(prev => prev ? { ...prev, nome: v } : null)}
            />

            <Text style={styles.inputLabel}>Quantidade</Text>
            <TextInput
              style={styles.input}
              value={String(itemEditando?.quantidade ?? '')}
              keyboardType="decimal-pad"
              onChangeText={v => setItemEditando(prev =>
                prev ? { ...prev, quantidade: parseFloat(v) || 0 } : null
              )}
            />

            <Text style={styles.inputLabel}>Valor Unitário (R$)</Text>
            <TextInput
              style={styles.input}
              value={String(itemEditando?.valor_unitario ?? '')}
              keyboardType="decimal-pad"
              onChangeText={v => setItemEditando(prev =>
                prev ? { ...prev, valor_unitario: parseFloat(v) || 0 } : null
              )}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnConfirmar}
                onPress={salvarEdicao}
              >
                <Text style={styles.btnConfirmarTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  headerTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerMercado: { color: '#a5d6a7', fontSize: 13, marginTop: 2 },
  resumo: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  resumoItem: { alignItems: 'center' },
  resumoNum: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  resumoLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  resumoDivisor: { width: 1, height: 40, backgroundColor: '#eee' },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  listaHeader: { fontSize: 12, color: '#aaa', marginBottom: 12, textAlign: 'center' },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  itemInfo: { flex: 1, marginRight: 12 },
  itemNome: { fontSize: 14, fontWeight: '600', color: '#333' },
  itemDetalhe: { fontSize: 12, color: '#888', marginTop: 4 },
  itemAcoes: { alignItems: 'flex-end', gap: 8 },
  itemTotal: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
  botoesItem: { flexDirection: 'row', gap: 8 },
  btnEditar: {
    backgroundColor: '#e8f5e9',
    padding: 6,
    borderRadius: 6,
  },
  btnEditarTexto: { fontSize: 16 },
  btnRemover: {
    backgroundColor: '#ffebee',
    padding: 6,
    borderRadius: 6,
  },
  btnRemoverTexto: { fontSize: 16 },
  rodape: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  btnSalvar: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSalvarDesabilitado: { backgroundColor: '#a5d6a7' },
  btnSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancelar: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  btnCancelarTexto: { color: '#666', fontSize: 15 },
  btnConfirmar: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
  },
  btnConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
