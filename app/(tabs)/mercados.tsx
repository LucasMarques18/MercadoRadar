import { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { buscarMercados, atualizarNomeMercado, removerMercado } from "../../database/db";
import { useRouter } from "expo-router";

type Mercado = {
    id: number;
    nome: string;
    nome_original: string;
    cnpj: string;
    criado_em: string;
    total_notas: number;
    total_gasto: number;
    ultima_visita: string;
};

export default function MercadoScreen() {
    const router = useRouter();
    const [mercados, setMercados] = useState<Mercado[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [mercadoEditando, setMercadoEditando] = useState<Mercado | null>(null);
    const [novoNome, setNovoNome] = useState('');

    useEffect(() => {
        carregarMercados();
    }, []);

    const carregarMercados = async () => {
        setCarregando(true);
        try {
            const dados = await buscarMercados();
            setMercados(dados);
        } catch (e) {
            console.error('Erro ao carregar mercados:', e);
        } finally {
            setCarregando(false);
        }
    };

    const abrirEdicao = (mercado: Mercado) => {
        setMercadoEditando(mercado);
        setNovoNome(mercado.nome);
        setModalVisivel(true);
    };

    const salvarEdicao = () => {
        if (!mercadoEditando) return;
        if (novoNome.trim() === '') {
            Alert.alert('Atenção', 'O nome não pode ser vazio.');
            return;
        }
        if (novoNome.trim() === mercadoEditando.nome) {
            setModalVisivel(false);
            return
        }
        try {
            atualizarNomeMercado(mercadoEditando.id, novoNome.trim());
            carregarMercados();
            setModalVisivel(false);
        } catch (e: any) {
            Alert.alert('Nome ja existe', e.message);
        }
    };

    const confirmarRemover = (mercado: Mercado) => {
        Alert.alert(
            'Remover mercado', 
            `Deseja remover "${mercado.nome}"?\n\nIsso tambem removera todas as ${mercado.total_notas} notas associadas juntas de seus itens\n\nEssa ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover', 
                    style: 'destructive', 
                    onPress: () => {
                        removerMercado(mercado.id);
                        carregarMercados();
                    }
                }
            ]
        );
    };

    const formatarData = (data: string) => {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
        });
    };

    const renderMercado = ({ item }: { item: Mercado }) => (
        <View style={styles.mercadoCard}>

            {/* Cabeçalho do card */}
            <View style={styles.cardHeader}>
                <View style={styles.mercadoIcone}>
                <Text style={styles.mercadoIconeTexto}>🏪</Text>
                </View>
                <View style={styles.mercadoInfo}>
                <Text style={styles.mercadoNome} numberOfLines={2}>{item.nome}</Text>
                {item.nome_original && item.nome_original !== item.nome && (
                    <Text style={styles.mercadoNomeOriginal} numberOfLines={1}>
                    {item.nome_original}
                    </Text>
                )}
                <Text style={styles.mercadoData}>
                    Última visita: {formatarData(item.ultima_visita)}
                </Text>
                </View>
            </View>

            {/* Estatísticas */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                <Text style={styles.statNum}>{item.total_notas}</Text>
                <Text style={styles.statLabel}>Notas</Text>
                </View>
                <View style={styles.statDivisor} />
                <View style={styles.statItem}>
                <Text style={styles.statNum}>
                    R$ {(item.total_gasto ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Total gasto</Text>
                </View>
            </View>

            {/* Botões de ação */}
            <View style={styles.cardRodape}>
                <TouchableOpacity
                style={styles.btnVerNotas}
                onPress={() => router.push({
                    pathname: '/historico',
                    params: {
                        mercado_id: item.id, 
                        mercado_nome: item.nome
                    }
                })}
                >
                <Text style={styles.btnVerNotasTexto}>🧾 Ver notas</Text>
                </TouchableOpacity>
                <View style={styles.acoesDir}>
                <TouchableOpacity
                    style={styles.btnEditar}
                    onPress={() => abrirEdicao(item)}
                >
                    <Text style={styles.btnEditarTexto}>✏️ Renomear</Text>
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

        {/* Cabeçalho */}
        <View style={styles.header}>
            <Text style={styles.headerTitulo}>🏪 Mercados</Text>
            <Text style={styles.headerSubtitulo}>
            {mercados.length} {mercados.length === 1 ? 'mercado cadastrado' : 'mercados cadastrados'}
            </Text>
        </View>

        {/* Lista */}
        {mercados.length === 0 ? (
            <View style={styles.centro}>
            <Text style={styles.vazioIcone}>🏪</Text>
            <Text style={styles.vazioTexto}>Nenhum mercado cadastrado ainda.</Text>
            <Text style={styles.vazioDesc}>Escaneie uma nota fiscal para começar!</Text>
            </View>
        ) : (
            <FlatList
            data={mercados}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMercado}
            contentContainerStyle={styles.lista}
            onRefresh={carregarMercados}
            refreshing={carregando}
            />
        )}

        {/* Modal de edição */}
        <Modal
            visible={modalVisivel}
            transparent
            animationType="slide"
            onRequestClose={() => setModalVisivel(false)}
        >
            <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                <Text style={styles.modalTitulo}>Renomear Mercado</Text>
                <Text style={styles.modalDesc}>
                Todas as notas deste mercado serão atualizadas com o novo nome.
                </Text>

                <Text style={styles.inputLabel}>Novo nome</Text>
                <TextInput
                style={styles.input}
                value={novoNome}
                onChangeText={setNovoNome}
                autoFocus
                selectTextOnFocus
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
                    <Text style={styles.btnConfirmarTexto}>Salvar</Text>
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
  },
  headerTitulo: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitulo: { color: '#a5d6a7', fontSize: 13, marginTop: 4 },
  lista: { padding: 16 },
  mercadoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  mercadoIcone: {
    width: 48,
    height: 48,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mercadoIconeTexto: { fontSize: 24 },
  mercadoInfo: { flex: 1 },
  mercadoNome: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  mercadoNomeOriginal: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
    fontStyle: 'italic',
    },
  mercadoData: { fontSize: 12, color: '#888', marginTop: 3 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  statDivisor: { width: 1, height: 30, backgroundColor: '#ddd' },
  cardRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  btnVerNotas: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnVerNotasTexto: { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  acoesDir: { flexDirection: 'row', gap: 8 },
  btnEditar: {
    backgroundColor: '#fff8e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnEditarTexto: { fontSize: 13, color: '#f57f17', fontWeight: '600' },
  btnRemover: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnRemoverTexto: { fontSize: 14 },
  centro: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', gap: 12, padding: 32,
  },
  vazioIcone: { fontSize: 48 },
  vazioTexto: { fontSize: 15, color: '#555', fontWeight: '600' },
  vazioDesc: { fontSize: 13, color: '#aaa', textAlign: 'center' },
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
    fontSize: 18, fontWeight: 'bold',
    color: '#333', marginBottom: 8, textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13, color: '#888',
    textAlign: 'center', marginBottom: 20, lineHeight: 18,
  },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12,
    fontSize: 15, backgroundColor: '#fafafa',
  },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 20 },
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