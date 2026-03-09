// ╔══════════════════════════════════════════════════════════════╗
// ║       API de Gerenciamento de Pedidos - Desafio Jitterbit    ║
// ║       Desenvolvido por: Fernanda Amorim Duarte               ║
// ║       Node.js + Express + SQL.js                             ║
// ╚══════════════════════════════════════════════════════════════╝

const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, 'pedidos.db');

// ─── Inicializa banco de dados ────────────────────────────────
let db;

async function initDB() {
  const SQL = await initSqlJs();

  // Carrega banco existente ou cria novo
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Cria tabelas se não existirem
  db.run(`
    CREATE TABLE IF NOT EXISTS Orders (
      orderId      TEXT PRIMARY KEY,
      value        REAL NOT NULL,
      creationDate TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId   TEXT NOT NULL,
      productId INTEGER NOT NULL,
      quantity  INTEGER NOT NULL,
      price     REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES Orders(orderId)
    );
  `);

  salvarDB();
  console.log('✅ Banco de dados iniciado.');
}

// ─── Salva banco em disco após cada operação ──────────────────
function salvarDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Função de mapeamento (PT-BR → EN) ───────────────────────
function mapearPedido(body) {
  const { numeroPedido, valorTotal, dataCriacao, items } = body;

  if (!numeroPedido || valorTotal === undefined || !dataCriacao || !items) {
    throw new Error('Campos obrigatórios ausentes: numeroPedido, valorTotal, dataCriacao, items');
  }

  return {
    orderId: numeroPedido,
    value: valorTotal,
    creationDate: new Date(dataCriacao).toISOString(),
    items: items.map(item => ({
      productId: parseInt(item.idItem),
      quantity: item.quantidadeItem,
      price: item.valorItem
    }))
  };
}

// ─── Busca pedido completo com seus itens ─────────────────────
function buscarPedidoCompleto(orderId) {
  const orderResult = db.exec(
    `SELECT orderId, value, creationDate FROM Orders WHERE orderId = '${orderId}'`
  );

  if (!orderResult.length || !orderResult[0].values.length) return null;

  const [oId, value, creationDate] = orderResult[0].values[0];

  const itemsResult = db.exec(
    `SELECT productId, quantity, price FROM Items WHERE orderId = '${orderId}'`
  );

  const items = itemsResult.length
    ? itemsResult[0].values.map(([productId, quantity, price]) => ({ productId, quantity, price }))
    : [];

  return { orderId: oId, value, creationDate, items };
}

// ════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════

// ─── POST /order — Criar pedido (OBRIGATÓRIO) ─────────────────
app.post('/order', (req, res) => {
  try {
    const { orderId, value, creationDate, items } = mapearPedido(req.body);

    const existe = db.exec(`SELECT orderId FROM Orders WHERE orderId = '${orderId}'`);
    if (existe.length && existe[0].values.length) {
      return res.status(409).json({ erro: `Pedido '${orderId}' já existe.` });
    }

    db.run(
      `INSERT INTO Orders (orderId, value, creationDate) VALUES (?, ?, ?)`,
      [orderId, value, creationDate]
    );

    for (const item of items) {
      db.run(
        `INSERT INTO Items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    salvarDB();
    return res.status(201).json(buscarPedidoCompleto(orderId));

  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
});

// ─── GET /order/list — Listar todos os pedidos (OPCIONAL) ─────
app.get('/order/list', (req, res) => {
  try {
    const result = db.exec(`SELECT orderId FROM Orders`);
    if (!result.length) return res.status(200).json([]);

    const pedidos = result[0].values.map(([orderId]) => buscarPedidoCompleto(orderId));
    return res.status(200).json(pedidos);

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ─── GET /order/:id — Buscar pedido por ID (OBRIGATÓRIO) ──────
app.get('/order/:numeroPedido', (req, res) => {
  try {
    const pedido = buscarPedidoCompleto(req.params.numeroPedido);
    if (!pedido) {
      return res.status(404).json({ erro: `Pedido '${req.params.numeroPedido}' não encontrado.` });
    }
    return res.status(200).json(pedido);

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ─── PUT /order/:id — Atualizar pedido (OPCIONAL) ─────────────
app.put('/order/:numeroPedido', (req, res) => {
  try {
    const { numeroPedido } = req.params;
    if (!buscarPedidoCompleto(numeroPedido)) {
      return res.status(404).json({ erro: `Pedido '${numeroPedido}' não encontrado.` });
    }

    const { value, creationDate, items } = mapearPedido(req.body);

    db.run(`UPDATE Orders SET value = ?, creationDate = ? WHERE orderId = ?`,
      [value, creationDate, numeroPedido]);

    db.run(`DELETE FROM Items WHERE orderId = '${numeroPedido}'`);
    for (const item of items) {
      db.run(`INSERT INTO Items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)`,
        [numeroPedido, item.productId, item.quantity, item.price]);
    }

    salvarDB();
    return res.status(200).json(buscarPedidoCompleto(numeroPedido));

  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
});

// ─── DELETE /order/:id — Deletar pedido (OPCIONAL) ────────────
app.delete('/order/:numeroPedido', (req, res) => {
  try {
    const { numeroPedido } = req.params;
    if (!buscarPedidoCompleto(numeroPedido)) {
      return res.status(404).json({ erro: `Pedido '${numeroPedido}' não encontrado.` });
    }

    db.run(`DELETE FROM Items WHERE orderId = '${numeroPedido}'`);
    db.run(`DELETE FROM Orders WHERE orderId = '${numeroPedido}'`);
    salvarDB();

    return res.status(200).json({ mensagem: `Pedido '${numeroPedido}' deletado com sucesso.` });

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ─── Rota não encontrada ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// ─── Inicia servidor após banco estar pronto ──────────────────
initDB().then(() => {
  app.listen(3000, () => {
    console.log('🟣 Servidor da Fernanda Amorim Duarte rodando em http://localhost:3000');
  });
});
