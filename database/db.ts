import * as SQLite from 'expo-sqlite';

// Abre ou cria o banco local
const db = SQLite.openDatabaseSync('mercadoradar.db');

// Cria as tabelas se não existirem
export function inicializarBanco() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS mercados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      nome_original TEXT,
      cnpj TEXT,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mercado_id INTEGER NOT NULL,
      url_original TEXT,
      data_compra TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now')),
      total REAL,
      FOREIGN KEY (mercado_id) REFERENCES mercados(id)
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nome TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now')),
      UNIQUE (codigo)
    );

    CREATE TABLE IF NOT EXISTS itens_nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      valor_unitario REAL NOT NULL,
      valor_total REAL NOT NULL,
      FOREIGN KEY (nota_id) REFERENCES notas_fiscais(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );
  `);

  // Migrations — adiciona colunas se não existirem
  const migrations = [
    `ALTER TABLE notas_fiscais ADD COLUMN atualizado_em TEXT`,
    `ALTER TABLE mercados ADD COLUMN cnpj TEXT`,
    `ALTER TABLE mercados ADD COLUMN nome_original TEXT`,
    `ALTER TABLE produtos ADD COLUMN categoria TEXT DEFAULT 'Outros'`,
  ];

  for (const migration of migrations) {
    try {
      db.execSync(migration);
    } catch {
      // Coluna já existe, ignora
    }
  }

  try {
    db.execSync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mercados_cnpj ON mercados(cnpj)
      WHERE cnpj IS NOT NULL AND cnpj != ''  
    `);
  } catch {

  }
}

// Busca ou cria mercado pelo nome
export function obterOuCriarMercado(nome: string, cnpj: string): number {
  if (cnpj) {
    const porCnpj = db.getFirstSync<{ id: number }>(
      'SELECT id FROM mercados WHERE cnpj = ?', [cnpj]
    );
    if (porCnpj) {
      return porCnpj.id;
    }
  }

  const porNome = db.getFirstSync<{ id: number }>(
    'SELECT id FROM mercados WHERE nome_original = ?', [nome]
  );
  if (porNome) return porNome.id;

  const result = db.runSync(
    'INSERT INTO mercados (nome, nome_original, cnpj) VALUES (?, ?, ?)', 
    [nome, nome, cnpj]
  );
  return result.lastInsertRowId;
}

// Busca ou cria produto pelo código ou nome
export function obterOuCriarProduto(nome: string, codigo: string): number {
  const existing = codigo
    ? db.getFirstSync<{ id: number }>('SELECT id FROM produtos WHERE codigo = ?', [codigo])
    : db.getFirstSync<{ id: number }>('SELECT id FROM produtos WHERE nome = ?', [nome]);

  if (existing) return existing.id;

  const result = db.runSync(
    'INSERT INTO produtos (nome, codigo) VALUES (?, ?)', [nome, codigo]
  );
  return result.lastInsertRowId;
}

// Salva a nota e todos os itens
export function salvarNota(
  mercadoNome: string,
  urlOriginal: string,
  cnpj: string,
  produtos: {
    nome: string;
    codigo: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }[]
): number {
  const mercadoId = obterOuCriarMercado(mercadoNome, cnpj);
  const total = produtos.reduce((acc, p) => acc + p.valor_total, 0);

  const notaResult = db.runSync(
    'INSERT INTO notas_fiscais (mercado_id, url_original, total) VALUES (?, ?, ?)',
    [mercadoId, urlOriginal, total]
  );
  const notaId = notaResult.lastInsertRowId;

  for (const produto of produtos) {
    const produtoId = obterOuCriarProduto(produto.nome, produto.codigo);
    db.runSync(
      `INSERT INTO itens_nota
       (nota_id, produto_id, quantidade, valor_unitario, valor_total)
       VALUES (?, ?, ?, ?, ?)`,
      [notaId, produtoId, produto.quantidade, produto.valor_unitario, produto.valor_total]
    );
  }

  return notaId;
}

// Busca o comparativo de preços
export function buscarComparativo() {
  return db.getAllSync<{
    produto: string;
    categoria: string;
    mercado: string;
    preco_medio: number;
    preco_minimo: number;
    preco_maximo: number;
    total_registros: number;
    ultima_compra: string;
  }>(`
    SELECT
      p.nome AS produto,
      p.categoria,
      m.nome AS mercado,
      ROUND(AVG(i.valor_unitario), 2) AS preco_medio,
      MIN(i.valor_unitario) AS preco_minimo,
      MAX(i.valor_unitario) AS preco_maximo,
      COUNT(*) AS total_registros,
      MAX(n.data_compra) AS ultima_compra
    FROM itens_nota i
    JOIN produtos p ON p.id = i.produto_id
    JOIN notas_fiscais n ON n.id = i.nota_id
    JOIN mercados m ON m.id = n.mercado_id
    GROUP BY p.id, m.id
    ORDER BY p.nome, preco_medio ASC
  `);
}

// Busca resumo para a Home
export function buscarResumo() {
  const mercados = db.getFirstSync<{ total: number }>(
    'SELECT COUNT(*) as total FROM mercados'
  );
  const produtos = db.getFirstSync<{ total: number }>(
    'SELECT COUNT(*) as total FROM produtos'
  );
  const notas = db.getFirstSync<{ total: number }>(
    'SELECT COUNT(*) as total FROM notas_fiscais'
  );
  return {
    mercados: mercados?.total ?? 0,
    produtos: produtos?.total ?? 0,
    notas: notas?.total ?? 0,
  };
}

export function buscarHistoricoNotas(mercadoId?: number) {
  const query = `
    SELECT 
      n.id, 
      m.nome AS mercado, 
      n.total, 
      n.data_compra, 
      n.atualizado_em, 
      COUNT(i.id) AS total_itens
    FROM notas_fiscais n
    JOIN mercados m ON m.id = n.mercado_id
    LEFT JOIN itens_nota i ON i.nota_id = n.id
    ${mercadoId ? 'WHERE n.mercado_id = ?' : ''}
    GROUP BY n.id
    ORDER BY n.data_compra DESC
  `;

  return mercadoId
    ? db.getAllSync<{
        id: number;
        mercado: string;
        total: number;
        data_compra: string;
        atualizado_em: string;
        total_itens: number;
      }>(query, [mercadoId])
    : db.getAllSync<{
        id: number;
        mercado: string;
        total: number;
        data_compra: string;
        atualizado_em: string;
        total_itens: number;
      }>(query);
}

export function buscarItensDaNota(notaId: number) {
  return db.getAllSync<{
    id: number;
    nome: string;
    codigo: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number; 
    produto_id: number;
  }>(`
      SELECT 
        i.id,
        p.nome,
        p.codigo,
        i.quantidade,
        i.valor_unitario,
        i.valor_total,
        i.produto_id
      FROM itens_nota i 
      JOIN produtos p ON p.id = i.produto_id
      WHERE i.nota_id = ?
      ORDER BY p.nome
    `, [notaId]);
}

export function atualizarItemNota(
  itemId: number, 
  nome: string,
  quantidade: number,
  valor_unitario: number,
  notaId: number
) {
  const valor_total = Math.round(quantidade * valor_unitario * 100) / 100;

  //att nome item
  db.runSync(
    `UPDATE produtos SET nome = ? WHERE id = (
      SELECT produto_id FROM itens_nota WHERE id = ?
    )`, [nome, itemId]
  );

  //att valor item
  db.runSync(
    `UPDATE itens_nota SET quantidade = ?, valor_unitario = ?, valor_total = ? WHERE id = ?`, 
    [quantidade, valor_unitario, valor_total, itemId]
  );

  //att timestamp nota
  db.runSync(
    `UPDATE notas_fiscais SET
      atualizado_em = datetime('now'),
      total = (SELECT SUM(valor_total) FROM itens_nota WHERE nota_id = ?)
    WHERE id = ?`,
    [notaId, notaId]
  );
}

export function removerItemNota(itemId: number, notaId: number) {
  db.runSync('DELETE FROM itens_nota WHERE id = ?', [itemId]);

  //att timestamp nota
  db.runSync(
    `UPDATE notas_fiscais SET
      atualizado_em = datetime('now'),
      total = (SELECT SUM(valor_total) FROM itens_nota WHERE nota_id = ?)
    WHERE id = ?`,
    [notaId, notaId]
  );
}

export function removerNota(notaId: number) {
  db.runSync('DELETE FROM itens_nota WHERE nota_id = ?', [notaId]);
  db.runSync('DELETE FROM notas_fiscais WHERE id = ?', [notaId]);
}

//MERCADO
export function buscarMercados() {
  return db.getAllAsync<{
    id: number;
    nome: string;
    nome_original: string;
    cnpj: string;
    criado_em: string;
    total_notas: number;
    total_gasto: number;
    ultima_visita: string;
  }>(`
    SELECT
      m.id, 
      m.nome, 
      m.nome_original,
      m.cnpj,
      m.criado_em, 
      COUNT(DISTINCT n.id) AS total_notas, 
      COALESCE(SUM(n.total), 0) AS total_gasto,
      MAX(n.data_compra) AS ultima_visita
    FROM mercados m
    LEFT JOIN notas_fiscais n ON n.mercado_id = m.id
    GROUP BY m.id
    ORDER BY ultima_visita DESC
    `);
}

export function atualizarNomeMercado(id: number, novoNome: string) {
  const existente = db.getFirstSync<{ id: number }>(
    'SELECT id FROM mercados WHERE nome = ? and id !=?',
    [novoNome.trim(), id]
  );

  if (existente) {
    throw new Error(`Já existe um mercado com o nome "${novoNome}".`);
  }

  db.runSync(
    'UPDATE mercados SET nome = ? WHERE id =?', 
    [novoNome.trim(), id]
  );
}

export function removerMercado(id: number) {
  db.runSync(`
    DELETE FROM itens_nota WHERE nota_id IN (
      SELECT id FROM notas_fiscais WHERE mercado_id = ?
    )
    `, [id]);

    db.runSync('DELETE FROM notas_fiscais WHERE mercado_id = ?', [id]);

    db.runSync('DELETE FROM mercados WHERE id = ?', [id]);
}

export function buscarHistoricoPrecos(produtoNome: string) {
  return db.getAllSync<{
    data_compra: string;
    valor_unitario: number;
    mercado: string;
  }>(`
    SELECT
      n.data_compra, 
      i.valor_unitario,
      m.nome AS mercado
    FROM itens_nota i 
    JOIN notas_fiscais n ON n.id = i.nota_id
    JOIN mercados m ON m.id = n.mercado_id
    JOIN produtos p ON p.id = i.produto_id
    WHERE p.nome = ?
    ORDER BY n.data_compra ASC  
  `, [produtoNome]);
}

export function buscarCategorias() {
  return db.getAllSync<{ categoria: string }>(`
    SELECT DISTINCT categoria
    FROM produtos 
    WHERE categoria IS NOT NULL
    ORDER BY categoria ASC
  `);
}

export function atualizarCategoriaProduto(nome: string, categoria: string) {
  db.runSync(
    'UPDATE produtos SET categoria = ? WHERE nome = ?',
    [categoria, nome]
  );
}

export function buscarUltimasNotas(limite: number = 5) {
  return db.getAllSync<{
    id: number;
    mercado: string; 
    total: number;
    data_compra: string;
    total_itens: number;
  }>(`
    SELECT
      n.id, 
      m.nome AS mercado, 
      n.total,
      n.data_compra, 
      COUNT(i.id) AS total_itens
    FROM notas_fiscais n
    JOIN mercados m ON m.id = n.mercado_id
    LEFT JOIN itens_nota i ON i.nota_id = n.id
    GROUP BY n.id 
    ORDER BY n.data_compra DESC
    LIMIT ?  
  `, [limite]);
}

export function buscarGastosPorMercado() {
  return db.getAllSync<{
    mercado: string;
    total_gasto: number;
    total_notas: number;
  }>(`
    SELECT 
      m.nome AS mercado. 
      ROUND(SUM(m.total), 2) AS total_gasto, 
      COUNT(n.id) AS total_notas
    FROM notas_fiscais n 
    JOIN mercados m ON m.id = n.mercado_id
    WHERE n.data_compra >= datetime('now', '-30 days')
    GROUP BY m.id
    ORDER BY total_gasto DESC  
  `);
}

export function buscarMaioresVariacoes(limite: number = 5) {
  return db.getAllSync<{
    produto: string;
    preco_minimo: number;
    preco_maximo: number;
    variacao: number;
    variacao_pct: number;
    mercado_barato: string;
    mercado_caro: string;
  }>(`
    SELECT
      p.nome AS produto, 
      MIN(i.valor_unitario) AS preco_minimo,
      MAX(i.valor_unitario) AS preco_maximo, 
      ROUND(MAX(i.valor_unitario) - MIN(i.valor_unitario), 2) AS variacao, 
      ROUND((MAX(i.valor_unitario) - MIN(i.valor_unitario)) / MIN(i.valor_unitario) * 100, 1) AS variacao_pct, 
      (SELECT m2.nome FROM itens_nota i2
        JOIN notas_fiscais n2 ON n2.id = i2.nota_id
        JOIN mercados m2 ON m2.id = n2.mercado_id
        WHERE i2.produto_id = p.id 
        ORDER BY i2.valor_unitario ASC LIMIT 1
      ) AS mercado_barato
      (SELECT m3.nome FROM itens_nota i3
        JOIN notas_fiscais n3 ON n3.id = i3.nota_id
        JOIN mercados m3 ON m3.id = n3.mercado_id
        WHERE i3.produto_id = p.id
        ORDER BY i3.valor_unitario DESC LIMIT 1
      ) AS mercado_caro
    FROM itens_nota i 
    JOIN produtos p ON p.id = i.produto_id
    JOIN notas_fiscais n ON n.id = i.nota_id
    JOIN mercados m ON m.id = n.mercado_id
    GROUP BY p.id
    HAVING COUNT(DISTINCT n.mercado_id) > 1
    ORDER BY variacao_pct DESC
    LIMIT ?
  `, [limite]);
}



export default db;