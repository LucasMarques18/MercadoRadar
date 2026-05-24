import {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {CameraView, Camera} from 'expo-camera';
import {useRouter} from 'expo-router';

function extrairMercado(html: string): string {
  const match = html.match(/id="u20"[^>]*>(.*?)<\/div>/s);
  if (match) return match[1].replace(/<[^>]+>/g, '').trim();
  
  const match2 = html.match(/class="txtTopo"[^>]*>(.*?)<\/div>/s);
  if (match2) return match2[1].replace(/<[^>]+>/g, '').trim();
  
  return 'Mercado desconhecido';
}

function extrairCnpj(html: string): string {
    const match = html.match(/CNPJ:\s*([\d\.\-\/]+)/);
    if (match) return match[1].replace(/[^\d]/g, '');
    return '';
}

function extrairProdutos(html: string): {
  nome: string;
  codigo: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}[] {
  const produtos = [];

  // Divide por <tr id="Item + N"> — com espaços exatos como no HTML da SEFAZ RS
  const itens = html.split(/<tr id="Item \+ \d+">/i);
  itens.shift(); // remove tudo antes do primeiro item

  console.log('Total de itens encontrados:', itens.length); // debug

  for (const item of itens) {
    try {
      // Nome — class="txtTit"
      const nomeMatch = item.match(/class="txtTit"[^>]*>(.*?)<\/span>/s);
      const nome = nomeMatch
        ? nomeMatch[1].replace(/<[^>]+>/g, '').trim()
        : '';

      // Código — dentro de class="RCod"
      const codMatch = item.match(/Código:\s*\n?\s*([\d]+)/s);
      const codigo = codMatch ? codMatch[1].trim() : '';

      // Quantidade — class="Rqtd", texto: "<strong>Qtde.:</strong>1"
      const qtdMatch = item.match(/Rqtd[^>]*>.*?<\/strong>([\d,\.]+)/s);
      const quantidade = qtdMatch
        ? parseFloat(qtdMatch[1].replace(',', '.'))
        : 1.0;

      // Valor unitário — class="RvlUnit", texto após o <strong>
      const vlrMatch = item.match(/RvlUnit[^>]*>.*?<\/strong>\s*[\r\n\s]*([\d,\.]+)/s);
      const valor_unitario = vlrMatch
        ? parseFloat(
            vlrMatch[1]
              .replace(/\./g, '')
              .replace(',', '.')
              .trim()
          )
        : 0.0;

      const valor_total = Math.round(quantidade * valor_unitario * 100) / 100;

      console.log('Item:', nome, '| Qtd:', quantidade, '| Vlr:', valor_unitario); // debug

      if (nome && valor_unitario > 0) {
        produtos.push({ nome, codigo, quantidade, valor_unitario, valor_total });
      }
    } catch (e) {
      console.log('Erro ao parsear item:', e);
      continue;
    }
  }

  return produtos;
}

export default function ScannerScreen() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setloading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const requestPermission = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        requestPermission();
    }, []);

    const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setloading(true);

        try {
            const response = await fetch(data, {
                method: 'GET', 
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
                }
            });

            if( !response.ok ) {
                throw new Error(`Erro ao acessar SEFAZ: ${response.status}`);
            }

            const html = await response.text();

            //Deubug temporario - remover depois
            console.log('HTML recebido (primeiros 1000chars):', html.substring(0, 1000));
            console.log('Status', response.status);
            console.log('URL', data);

            const produtos = extrairProdutos(html);
            const mercado = extrairMercado(html);
            const cnpj = extrairCnpj(html);

            if (produtos.length === 0) {
                throw new Error('Nenhum produto entrado na nota.');
            }

            router.push ({
                pathname: '/revisao',
                params: {
                    mercado: mercado, 
                    url_original: data, 
                    cnpj: cnpj,
                    produtos: JSON.stringify(produtos)
                }
            });
        } catch (error: any) {
            Alert.alert(
                'Erro', 
                error.message || 'Não foi possivel processar a nota.', 
                [{ text: 'Tentar novamente', onPress: () => setScanned(false) }] 
            );
        } finally {
            setloading(false);
        }
    }
        

    if (hasPermission === null) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2e7d32" />
                <Text style={styles.infoText}>Solicitando permissão de câmera...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
        <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>📷</Text>
            <Text style={styles.errorText}>Permissão de câmera negada</Text>
            <Text style={styles.errorDesc}>
            Vá em Configurações do celular e permita o acesso à câmera para este app.
            </Text>
        </View>
        );
    }

    return (
        <View style={styles.container}>

        {/* Câmera ocupando a tela toda */}
        <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
            barcodeTypes: ['qr'], // só lê QR code
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay com a mira de leitura */}
        <View style={styles.overlay}>

            {/* Topo escuro */}
            <View style={styles.overlayTop}>
            <Text style={styles.overlayTitle}>Escanear Nota Fiscal</Text>
            <Text style={styles.overlaySubtitle}>Aponte para o QR code do cupom fiscal</Text>
            </View>

            {/* Área central com a mira */}
            <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
                {/* Cantos da mira */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {loading && (
                <ActivityIndicator size="large" color="#fff" />
                )}
            </View>
            <View style={styles.overlaySide} />
            </View>

            {/* Base escura com botão */}
            <View style={styles.overlayBottom}>
            {scanned && !loading && (
                <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
                >
                <Text style={styles.rescanText}>📷 Escanear novamente</Text>
                </TouchableOpacity>
            )}
            {!scanned && (
                <Text style={styles.hint}>Posicione o QR code dentro da área acima</Text>
            )}
            </View>

        </View>
        </View>
    );
}

const SCAN_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    inset: 0, // top/left/right/bottom: 0
    flex: 1,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingTop: 60,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  overlaySubtitle: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 6,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Cantos da mira
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4ade80',
    borderWidth: 4,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 32,
  },
  hint: {
    color: '#aaa',
    fontSize: 13,
  },
  rescanButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  rescanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Telas de estado
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
    gap: 16,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  errorDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});