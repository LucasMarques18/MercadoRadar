import { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    buscarItensDaNota, 
    atualizarItemNota, 
    removerItemNota
} from '../database/db';

type Item = {
    id: number; 
    nome: string;
    codigo: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    produto_id: number;
};

export default function NotaScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const notaId = Number(id);

    const [itens, setItens] = useState<Item[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [itemEditando, setItemEditando] = useState<Item | null>(null);

    useEffect(() => {
        carregarItens();
    }, []);

    const carregarItens = () => {
        setCarregando(true);
        try {
            const dados = buscarItensDaNota(notaId);
            setItens(dados);
        } catch (e) {
            console.error('Erro ao carregar itens:', e);
        } finally {
            setCarregando(false);
        }
    };

    const abrirEdicao = (item: Item) => {
        setItemEditando({ ...item });
        setModalVisivel(true);
    };

    const salvarEdicao = () => {
        if (!itemEditando) return;
        try {
            atualizarItemNota(
                itemEditando.id, 
                itemEditando.nome, 
                itemEditando.quantidade, 
                itemEditando.valor_unitario,
                notaId
            );
            carregarItens();
            setModalVisivel(false);
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        }
    };

    const confirmarRemover = (item: Item) => {
        Alert.alert(
            'Remover item', 
            `Deseja remover "${item.nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover', 
                    style: 'destructive', 
                    onPress: () => {
                        removerItemNota(item.id, notaId);
                        carregarItens();
                    }
                }
            ]
        );
    };

    const totalNota = itens.reduce((acc, i) => acc + i.valor_total, 0);

    const renderItem = ({ item }: { item: Item }) => (
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
                onPress={() => abrirEdicao(item)}
            >
                <Text style={styles.btnEditarTexto}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.btnRemover}
                onPress={() => confirmarRemover(item)}
            >
                <Text style={styles.btnRemoverTexto}>🗑️</Text>
            </TouchableOpacity>
            </View>
        </View>
        </View>
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
            <View>
            <Text style={styles.headerTitulo}>Detalhes da Nota</Text>
            <Text style={styles.headerSubtitulo}>{itens.length} produtos</Text>
            </View>
        </View>

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

        <FlatList
            data={itens}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.lista}
        />

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
  headerSubtitulo: { color: '#a5d6a7', fontSize: 13, marginTop: 2 },
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
  lista: { paddingHorizontal: 16, paddingBottom: 32 },
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
  btnEditar: { backgroundColor: '#e8f5e9', padding: 6, borderRadius: 6 },
  btnEditarTexto: { fontSize: 16 },
  btnRemover: { backgroundColor: '#ffebee', padding: 6, borderRadius: 6 },
  btnRemoverTexto: { fontSize: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  btnCancelarTexto: { color: '#666', fontSize: 15 },
  btnConfirmar: {
    flex: 1, padding: 14, borderRadius: 10,
    backgroundColor: '#2e7d32', alignItems: 'center',
  },
  btnConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});