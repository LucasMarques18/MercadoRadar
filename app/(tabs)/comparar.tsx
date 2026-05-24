import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  atualizarCategoriaProduto,
  buscarComparativo as buscarDoBanco,
  buscarHistoricoPrecos
} from '../../database/db';

const LARGURA = Dimensions.get('window').width;

const CATEGORIAS = [
  '🥩 Carnes', '🥛 Laticínios', '🍞 Padaria', '🥤 Bebidas',
  '🧹 Limpeza', '🧴 Higiene', '🥫 Mercearia', '🍎 Hortifruti',
  '❄️ Congelados', '🍬 Doces', '🐾 Pet', '📦 Outros'
];

type MercadoPreco = {
  mercado: string;
  preco_medio: number;
  preco_minimo: number;
  preco_maximo: number;
  total_registros: number;
  ultima_compra: string;
};

type ProdutoComparativo = {
  nome: string;
  categoria: string;
  mercados: MercadoPreco[];
};

type HistoricoPreco = {
  data_compra: string;
  valor_unitario: number;
  mercado: string;
};

export default function CompararScreen() {
  const [produtos, setProdutos] = useState<ProdutoComparativo[]>([]);
  const [filtrados, setFiltrados] = useState<ProdutoComparativo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([]);

  // Modal de gráfico
  const [modalGrafico, setModalGrafico] = useState(false);
  const [produtoGrafico, setProdutoGrafico] = useState<string | null>(null);
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([]);

  // Modal de categoria
  const [modalCategoria, setModalCategoria] = useState(false);
  const [produtoCategoria, setProdutoCategoria] = useState<string | null>(null);

  useEffect(() => {
    buscarComparativo();
  }, []);

  useEffect(() => {
    let lista = produtos;

    if (categoriaSelecionada) {
      lista = lista.filter(p => p.categoria === categoriaSelecionada);
    }

    if (busca.trim() !== '') {
      lista = lista.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    setFiltrados(lista);
  }, [busca, produtos, categoriaSelecionada]);

  const buscarComparativo = () => {
    setCarregando(true);
    try {
      const registros = buscarDoBanco();

      const mapa: Record<string, ProdutoComparativo> = {};
      for (const reg of registros) {
        if (!mapa[reg.produto]) {
          mapa[reg.produto] = {
            nome: reg.produto,
            categoria: (reg as any).categoria || 'Outros',
            mercados: []
          };
        }
        mapa[reg.produto].mercados.push({
          mercado: reg.mercado,
          preco_medio: reg.preco_medio,
          preco_minimo: reg.preco_minimo,
          preco_maximo: reg.preco_maximo,
          total_registros: reg.total_registros,
          ultima_compra: reg.ultima_compra,
        });
      }

      const lista = Object.values(mapa);
      setProdutos(lista);
      setFiltrados(lista);

      // Monta categorias disponíveis
      const cats = [...new Set(lista.map(p => p.categoria).filter(Boolean))].sort();
      setCategoriasFiltro(cats);

    } catch (error) {
      console.error('Erro ao buscar comparativo:', error);
    } finally {
      setCarregando(false);
    }
  };

  const abrirGrafico = (nomeProduto: string) => {
    const historico = buscarHistoricoPrecos(nomeProduto);
    setHistoricoPrecos(historico);
    setProdutoGrafico(nomeProduto);
    setModalGrafico(true);
  };

  const abrirCategoria = (nomeProduto: string) => {
    setProdutoCategoria(nomeProduto);
    setModalCategoria(true);
  };

  const salvarCategoria = (categoria: string) => {
    if (!produtoCategoria) return;
    atualizarCategoriaProduto(produtoCategoria, categoria);
    setModalCategoria(false);
    buscarComparativo();
  };

  const getMenorPreco = (mercados: MercadoPreco[]) =>
    Math.min(...mercados.map(m => m.preco_medio));

  // Prepara dados do gráfico
  const dadosGrafico = () => {
    if (historicoPrecos.length < 2) return null;

    const labels = historicoPrecos.map(h => {
      const d = new Date(h.data_compra);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const valores = historicoPrecos.map(h => h.valor_unitario);

    return {
      labels,
      datasets: [{ data: valores, strokeWidth: 2 }]
    };
  };

  const renderMercado = (mercado: MercadoPreco, menorPreco: number) => {
    const eMaisBarato = mercado.preco_medio === menorPreco;
    return (
      <View
        key={mercado.mercado}
        style={[styles.mercadoRow, eMaisBarato && styles.mercadoDestaque]}
      >
        <View style={styles.mercadoInfo}>
          {eMaisBarato && <Text style={styles.tagBarato}>🏆 mais barato</Text>}
          <Text style={styles.mercadoNome} numberOfLines={1}>{mercado.mercado}</Text>
          <Text style={styles.mercadoRegistros}>{mercado.total_registros}x registrado</Text>
        </View>
        <View style={styles.mercadoPrecos}>
          <Text style={[styles.precoMedio, eMaisBarato && styles.precoDestaque]}>
            R$ {mercado.preco_medio.toFixed(2)}
          </Text>
          {mercado.preco_minimo !== mercado.preco_maximo && (
            <Text style={styles.precoRange}>
              R$ {mercado.preco_minimo.toFixed(2)} ~ {mercado.preco_maximo.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderProduto = ({ item }: { item: ProdutoComparativo }) => {
    const aberto = expandido === item.nome;
    const menorPreco = getMenorPreco(item.mercados);

    return (
      <TouchableOpacity
        style={styles.produtoCard}
        onPress={() => setExpandido(prev => prev === item.nome ? null : item.nome)}
        activeOpacity={0.8}
      >
        <View style={styles.produtoHeader}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome} numberOfLines={2}>{item.nome}</Text>
            <View style={styles.produtoMeta}>
              <TouchableOpacity
                style={styles.tagCategoria}
                onPress={() => abrirCategoria(item.nome)}
              >
                <Text style={styles.tagCategoriaTexto}>
                  {item.categoria || '📦 Outros'} ✏️
                </Text>
              </TouchableOpacity>
              <Text style={styles.produtoMercados}>
                {item.mercados.length} {item.mercados.length === 1 ? 'mercado' : 'mercados'}
              </Text>
            </View>
          </View>
          <View style={styles.produtoPrecoArea}>
            <Text style={styles.produtoMenorPreco}>R$ {menorPreco.toFixed(2)}</Text>
            <Text style={styles.produtoMenorLabel}>menor preço</Text>
            <Text style={styles.expandirIcone}>{aberto ? '▲' : '▼'}</Text>
          </View>
        </View>

        {aberto && (
          <View style={styles.detalhes}>
            <View style={styles.detalhesDivisor} />
            {item.mercados.map(m => renderMercado(m, menorPreco))}
            <TouchableOpacity
              style={styles.btnGrafico}
              onPress={() => abrirGrafico(item.nome)}
            >
              <Text style={styles.btnGraficoTexto}>📈 Ver evolução de preço</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.carregandoTexto}>Carregando comparativo...</Text>
      </View>
    );
  }

  const grafico = dadosGrafico();

  return (
    <View style={styles.container}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>📊 Comparativo</Text>
        <Text style={styles.headerSubtitulo}>{produtos.length} produtos registrados</Text>
      </View>

      {/* Busca */}
      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="🔍 Buscar produto..."
          value={busca}
          onChangeText={setBusca}
          placeholderTextColor="#aaa"
        />
      </View>

      {/* Filtro de categorias */}
      {categoriasFiltro.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtroScroll}
          contentContainerStyle={styles.filtroContainer}
        >
          <TouchableOpacity
            style={[styles.filtroBadge, !categoriaSelecionada && styles.filtroBadgeAtivo]}
            onPress={() => setCategoriaSelecionada(null)}
          >
            <Text style={[styles.filtroBadgeTexto, !categoriaSelecionada && styles.filtroBadgeTextoAtivo]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categoriasFiltro.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filtroBadge, categoriaSelecionada === cat && styles.filtroBadgeAtivo]}
              onPress={() => setCategoriaSelecionada(prev => prev === cat ? null : cat)}
            >
              <Text style={[styles.filtroBadgeTexto, categoriaSelecionada === cat && styles.filtroBadgeTextoAtivo]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.vazioIcone}>📊</Text>
          <Text style={styles.vazioTexto}>
            {busca || categoriaSelecionada ? 'Nenhum produto encontrado.' : 'Escaneie notas para ver o comparativo.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={item => item.nome}
          renderItem={renderProduto}
          contentContainerStyle={styles.lista}
          onRefresh={buscarComparativo}
          refreshing={carregando}
        />
      )}

      {/* Modal Gráfico */}
      <Modal
        visible={modalGrafico}
        transparent
        animationType="slide"
        onRequestClose={() => setModalGrafico(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo} numberOfLines={2}>{produtoGrafico}</Text>

            {historicoPrecos.length < 2 ? (
              <View style={styles.graficovazio}>
                <Text style={styles.graficoVazioIcone}>📈</Text>
                <Text style={styles.graficoVazioTexto}>
                  Registros insuficientes para gerar o gráfico.{'\n'}
                  Escaneie mais notas com este produto!
                </Text>
              </View>
            ) : grafico ? (
              <>
                <Text style={styles.graficoSubtitulo}>
                  Evolução do preço unitário ao longo do tempo
                </Text>
                <LineChart
                  data={grafico}
                  width={LARGURA - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                    labelColor: () => '#888',
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#2e7d32' },
                  }}
                  bezier
                  style={styles.grafico}
                />
                <View style={styles.graficoLegenda}>
                  {historicoPrecos.map((h, i) => (
                    <View key={i} style={styles.legendaItem}>
                      <Text style={styles.legendaData}>
                        {new Date(h.data_compra).toLocaleDateString('pt-BR')}
                      </Text>
                      <Text style={styles.legendaMercado} numberOfLines={1}>{h.mercado}</Text>
                      <Text style={styles.legendaValor}>R$ {h.valor_unitario.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.btnFechar}
              onPress={() => setModalGrafico(false)}
            >
              <Text style={styles.btnFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Categoria */}
      <Modal
        visible={modalCategoria}
        transparent
        animationType="slide"
        onRequestClose={() => setModalCategoria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Escolher Categoria</Text>
            <ScrollView style={styles.categoriaScroll}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoriaOpcao}
                  onPress={() => salvarCategoria(cat)}
                >
                  <Text style={styles.categoriaOpcaoTexto}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnFechar}
              onPress={() => setModalCategoria(false)}
            >
              <Text style={styles.btnFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2e7d32', padding: 20, paddingTop: 56 },
  headerTitulo: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitulo: { color: '#a5d6a7', fontSize: 13, marginTop: 4 },
  buscaContainer: { padding: 12, paddingBottom: 4 },
  buscaInput: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 12, fontSize: 15, elevation: 2, color: '#333',
  },
  filtroScroll: { maxHeight: 48 },
  filtroContainer: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  filtroBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd',
  },
  filtroBadgeAtivo: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  filtroBadgeTexto: { fontSize: 12, color: '#555' },
  filtroBadgeTextoAtivo: { color: '#fff', fontWeight: 'bold' },
  lista: { padding: 12, paddingTop: 8 },
  produtoCard: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  produtoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  produtoInfo: { flex: 1, marginRight: 12 },
  produtoNome: { fontSize: 14, fontWeight: '600', color: '#333' },
  produtoMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tagCategoria: {
    backgroundColor: '#e8f5e9', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6,
  },
  tagCategoriaTexto: { fontSize: 11, color: '#2e7d32' },
  produtoMercados: { fontSize: 12, color: '#888' },
  produtoPrecoArea: { alignItems: 'flex-end' },
  produtoMenorPreco: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  produtoMenorLabel: { fontSize: 10, color: '#888' },
  expandirIcone: { fontSize: 11, color: '#aaa', marginTop: 4 },
  detalhes: { marginTop: 8 },
  detalhesDivisor: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  mercadoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 10,
    borderRadius: 8, marginBottom: 6, backgroundColor: '#f9f9f9',
  },
  mercadoDestaque: { backgroundColor: '#e8f5e9' },
  mercadoInfo: { flex: 1, marginRight: 8 },
  tagBarato: { fontSize: 10, color: '#2e7d32', fontWeight: 'bold', marginBottom: 2 },
  mercadoNome: { fontSize: 13, color: '#333', fontWeight: '500' },
  mercadoRegistros: { fontSize: 11, color: '#aaa', marginTop: 2 },
  mercadoPrecos: { alignItems: 'flex-end' },
  precoMedio: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  precoDestaque: { color: '#2e7d32' },
  precoRange: { fontSize: 10, color: '#aaa', marginTop: 2 },
  btnGrafico: {
    backgroundColor: '#e8f5e9', padding: 10,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  btnGraficoTexto: { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  carregandoTexto: { color: '#888', fontSize: 14 },
  vazioIcone: { fontSize: 48 },
  vazioTexto: { fontSize: 15, color: '#888', textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalTitulo: {
    fontSize: 16, fontWeight: 'bold',
    color: '#333', marginBottom: 16, textAlign: 'center',
  },
  graficoSubtitulo: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 12 },
  grafico: { borderRadius: 8 },
  graficoLegenda: { marginTop: 16, gap: 8 },
  legendaItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  legendaData: { fontSize: 12, color: '#888', width: 80 },
  legendaMercado: { fontSize: 12, color: '#555', flex: 1, marginHorizontal: 8 },
  legendaValor: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  graficovazio: { alignItems: 'center', padding: 32, gap: 12 },
  graficoVazioIcone: { fontSize: 40 },
  graficoVazioTexto: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  categoriaScroll: { maxHeight: 300 },
  categoriaOpcao: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  categoriaOpcaoTexto: { fontSize: 15, color: '#333' },
  btnFechar: {
    backgroundColor: '#f5f5f5', padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 16,
  },
  btnFecharTexto: { color: '#555', fontSize: 15, fontWeight: '600' },
});