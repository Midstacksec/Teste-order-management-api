<div align="center">

# Order Management API
### Technical Challenge — Jitterbit

</div>

## Overview

API REST simples para gerenciamento de pedidos.

Desenvolvida em **Node.js** e **Express**, utilizando **SQLite** como banco de dados.  
O projeto foi criado como parte de um desafio técnico da **Jitterbit**.

---

## Setup

Instale as dependências:

```bash
npm install
```

Inicie o servidor:

```bash
npm start
```

Servidor rodando em:

```
http://localhost:3000
```

---

## Endpoints

| Method | Endpoint | Description |
|------|------|------|
| GET | /orders | Listar todos os pedidos |
| GET | /orders/:id | Buscar pedido por ID |
| POST | /orders | Criar novo pedido |
| PUT | /orders/:id | Atualizar pedido |
| DELETE | /orders/:id | Remover pedido |

---

## Example Requests

```bash
curl http://localhost:3000/orders
```

Criar pedido:

```bash
curl -X POST http://localhost:3000/orders \
-H "Content-Type: application/json" \
-d '{"product":"Notebook","quantity":1}'
```

---

## Database Structure

Tabela `orders`:

| Field | Type |
|------|------|
| id | integer |
| product | text |
| quantity | integer |
| created_at | datetime |

---

## Design Decisions

- Utilização de **Express** para criação da API REST.
- Banco de dados **SQLite** por simplicidade e fácil setup.
- Estrutura simples focada em clareza e manutenção.

---

## Limitations

- Não possui autenticação.
- Não possui paginação de resultados.
- Falta validação mais robusta de dados.

---

## Author

**Fernanda Amorim Duarte**
