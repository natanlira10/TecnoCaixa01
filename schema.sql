-- =============================================================
-- TecnoCaixa - Script de criação do banco (PostgreSQL / Neon)
-- Execute no SQL Editor do Neon. Equivale ao que o models.py cria.
-- =============================================================

-- Só descomente se já existirem tabelas de uma versão anterior
-- (apaga TODOS os dados):
-- DROP TABLE IF EXISTS movimento CASCADE;
-- DROP TABLE IF EXISTS produto CASCADE;
-- DROP TABLE IF EXISTS categoria CASCADE;
-- DROP TABLE IF EXISTS contato CASCADE;


-- Categorias de produto (1 categoria : N produtos)
CREATE TABLE categoria (
    id    SERIAL       PRIMARY KEY,
    nome  VARCHAR(40)  NOT NULL UNIQUE
);


-- Produtos do estoque
CREATE TABLE produto (
    id            SERIAL         PRIMARY KEY,
    sku           VARCHAR(20)    NOT NULL,
    nome          VARCHAR(100)   NOT NULL,
    categoria_id  INTEGER        NOT NULL REFERENCES categoria (id),
    quantidade    INTEGER        NOT NULL DEFAULT 0,
    minimo        INTEGER        NOT NULL DEFAULT 0,
    custo         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    preco         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    local         VARCHAR(40)    DEFAULT '',
    foto          TEXT           DEFAULT '',
    ativo         BOOLEAN        NOT NULL DEFAULT TRUE,

    CONSTRAINT ck_produto_quantidade CHECK (quantidade >= 0),
    CONSTRAINT ck_produto_minimo     CHECK (minimo >= 0),
    CONSTRAINT ck_produto_custo      CHECK (custo >= 0),
    CONSTRAINT ck_produto_preco      CHECK (preco >= 0)
);

-- SKU único entre os produtos ativos (um produto excluído libera o SKU)
CREATE UNIQUE INDEX ux_produto_sku_ativo ON produto (sku) WHERE ativo;


-- Histórico de entradas, vendas e saídas (1 produto : N movimentos)
CREATE TABLE movimento (
    id              SERIAL         PRIMARY KEY,
    data            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    produto_id      INTEGER        NOT NULL REFERENCES produto (id) ON DELETE RESTRICT,
    tipo            VARCHAR(10)    NOT NULL,
    quantidade      INTEGER        NOT NULL,
    valor           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    custo_unitario  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    observacao      VARCHAR(120)   DEFAULT '',

    CONSTRAINT ck_movimento_tipo       CHECK (tipo IN ('entrada', 'venda', 'saida')),
    CONSTRAINT ck_movimento_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_movimento_valor      CHECK (valor >= 0)
);

CREATE INDEX ix_movimento_produto_id ON movimento (produto_id);


-- Mensagens enviadas pelo formulário de contato do site
CREATE TABLE contato (
    id         SERIAL       PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    email      VARCHAR(120) NOT NULL,
    telefone   VARCHAR(20),
    assunto    VARCHAR(100) NOT NULL,
    mensagem   TEXT         NOT NULL,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- Dados iniciais: categorias fixas
INSERT INTO categoria (nome) VALUES
    ('Computadores'),
    ('Monitores'),
    ('Periféricos'),
    ('Peças'),
    ('Acessórios')
ON CONFLICT (nome) DO NOTHING;


-- =============================================================
-- Consultas de exemplo para a apresentação
-- =============================================================

-- Produtos com estoque abaixo do mínimo
-- SELECT p.sku, p.nome, c.nome AS categoria, p.quantidade, p.minimo
-- FROM produto p
-- JOIN categoria c ON c.id = p.categoria_id
-- WHERE p.ativo AND p.quantidade <= p.minimo
-- ORDER BY p.nome;

-- Faturamento e lucro por produto
-- SELECT p.nome,
--        SUM(m.quantidade)                              AS unidades,
--        SUM(m.valor)                                   AS faturamento,
--        SUM(m.valor - m.quantidade * m.custo_unitario) AS lucro
-- FROM movimento m
-- JOIN produto p ON p.id = m.produto_id
-- WHERE m.tipo = 'venda'
-- GROUP BY p.nome
-- ORDER BY faturamento DESC;

-- Últimas mensagens de contato
-- SELECT nome, email, assunto, criado_em
-- FROM contato
-- ORDER BY criado_em DESC
-- LIMIT 10;