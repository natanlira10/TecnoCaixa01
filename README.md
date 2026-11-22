# TechnoCaixa 📦

Sistema web de **vitrine e-commerce com pagamento simulado, painel administrativo de controle de estoque/faturamento e chatbots com IA (Gemini)** para uma loja de informática, feito com **Flask**, **SQLAlchemy** e banco **PostgreSQL no Neon**.

## 👥 Integrantes

| Nome | GitHub |
|------|--------|
| [Natan Lira] | [@natanlira10](https://github.com/natanlira10) |
| [Nome completo] | [@marcosr1](https://github.com/marcosr1) |
| [Stephany Ponciano] | [@steponcianodev](https://github.com/steponcianodev) |

## 🌐 Deploy

**Site no ar:** [https://SEU-APP.onrender.com](https://SEU-APP.onrender.com)

## 📋 O que o sistema faz

### Vitrine de Vendas (`/`)
- **Catálogo público:** busca, filtro por categoria, ordenação por preço/nome e disponibilidade em tempo real
- **Carrinho e Checkout simulado:** pagamento fictício direto via Pix, Cartão de Crédito ou Boleto com baixa automática no estoque e histórico local em *Meus pedidos*
- **Atualização automática sem F5:** sincronização em tempo real entre a vitrine e o painel administrativo via `/api/versao` e `BroadcastChannel`
- **Chatbot da Vitrine (bolinha no canto inferior direito):** persona jovem e descontraída conectada ao Gemini, consultando quantidades reais do estoque e respondendo apenas sobre a TechnoCaixa

### Painel Administrativo (`/admin` ou `/estoque`)
- **Painel e Faturamento:** KPIs de estoque, reposição necessária, total vendido, ticket médio, lucro estimado e gráfico dinâmico nos eixos X e Y
- **Produtos, Movimentações e Pedidos:** cadastro, edição, exclusão lógica, registro de entradas/saídas e visualização dos pedidos da vitrine
- **Chatbot Técnico do Admin (bolinha no canto inferior direito):** persona técnica conectada ao Gemini para responder somente sobre estoque, dados e estatísticas da TechnoCaixa

## 🛠️ Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| **Flask** | Servidor web e rotas da API |
| **SQLAlchemy** | Acesso ao banco de dados |
| **PostgreSQL (Neon)** | Banco de dados na nuvem |
| **HTML, CSS e JavaScript** | Página do sistema |
| **Google Gemini (API REST)** | Inteligência artificial dos chatbots |
| **Bootstrap Icons** | Ícones da interface |
| **Gunicorn + Render** | Servidor de produção e hospedagem |

## 🤖 Integração com Inteligência Artificial

Os chatbots usam a API REST do **Google Gemini**, chamada pelo back-end em `chatbot_gemini.py`. A chave fica só no servidor (`GEMINI_API_KEY`), nunca no navegador.

| Chatbot | Persona | Onde aparece | Escopo |
|---------|---------|--------------|--------|
| **Caio** | Assistente jovem e descontraído da loja | Vitrine e contato | Produtos, preços, estoque e como comprar |
| **Analista Técnico** | Perfil técnico, analítico e objetivo | Painel admin | Estoque, reposição, faturamento e lucro |

**Como a IA fica dentro do contexto:**

- **Prompt de sistema por persona:** cada chatbot tem seu prompt (`PROMPT_VITRINE` e `PROMPT_ADMIN`) com o tom de voz, as regras sobre dados e uma regra de escopo "inquebrável". O Caio usa linguagem leve e empolgada com tecnologia; o Analista Técnico responde com números exatos, SKUs, margens e alertas de reposição.
- **Contexto montado a partir do banco a cada pergunta:** antes de chamar o Gemini, o back-end lê o banco e anexa os dados ao prompt de sistema.
  - *Vitrine* (`montar_contexto_vitrine`): catálogo ativo com nome, categoria, SKU, preço e estoque (itens com 0 unidades aparecem como ESGOTADO), resumo por categoria e regras de compra/pagamento da loja.
  - *Admin* (`montar_contexto_admin`): indicadores de estoque, valor em estoque a custo e a preço de venda, produtos para reposição, faturamento, lucro, margem e ticket médio (7, 30, 90 dias e total), ranking dos 10 mais vendidos, pedidos por forma de pagamento, últimas 15 movimentações e inventário completo.
- **Sem inventar dados:** os prompts proíbem criar produtos, preços, promoções, quantidades ou vendas que não estejam no contexto. Se um item estiver esgotado ou não existir, o Caio informa e sugere opções parecidas do catálogo.
- **Perguntas fora do tema:** o chatbot responde educadamente que **não sabe e que só responde sobre o TechnoCaixa**, sem responder nem parcialmente. Isso vale também para tentativas de pedir que ele ignore as instruções.
- **Parâmetros da chamada:** temperatura 0.5 na vitrine e 0.25 no admin (respostas mais precisas), limite de 1200 tokens de saída e timeout de 18 s.
- **Fallback entre modelos:** se um modelo falhar, o sistema tenta o próximo (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3-flash-preview`). Dá para definir um modelo preferido na variável opcional `GEMINI_MODEL`.
- **Histórico limitado:** são enviadas as últimas 8 mensagens, e cada mensagem tem no máximo 800 caracteres.

**Fontes e ferramentas:** [documentação do Gemini e ferramentas de IA usadas como apoio].

## 🚀 Como rodar no computador

### 1. Criar o ambiente virtual

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Instalar as dependências

```bash
pip install -r requirements.txt
```

### 3. Configurar o `.env`

Copie `.env.example` para `.env` e coloque a sua `DATABASE_URL` do Neon:

```env
DATABASE_URL=postgresql://usuario:senha@host.neon.tech/neondb?sslmode=require&channel_binding=require
FLASK_DEBUG=True
GEMINI_API_KEY=sua_chave_gemini_aqui
# Opcional: modelo Gemini preferido
# GEMINI_MODEL=gemini-flash-lite-latest
```

### 4. Criar as tabelas (opcional)

Você pode criar as tabelas manualmente rodando o [`schema.sql`](schema.sql) no **SQL Editor do Neon**. Se preferir, pule este passo: o Flask cria as tabelas sozinho na primeira execução.

### 5. Executar

```bash
python app.py
```

Acesse em: `http://localhost:5000`

Na primeira execução, as tabelas são criadas sozinhas no banco (caso ainda não existam) e os produtos da pasta `static/Fotos` são cadastrados (veja `produtos_iniciais.py`).

## ☁️ Deploy no Render

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
- **Environment:** `DATABASE_URL` e `GEMINI_API_KEY` (o `.env` não vai para o GitHub)

## 📁 Estrutura do Projeto

```
├── app.py                 # Servidor Flask: vitrine, painel admin e APIs
├── chatbot_gemini.py      # Contexto do banco, personas e integração REST com Gemini
├── config.py              # Configuração (lê o .env)
├── models.py              # Tabelas do banco (Categoria, Produto, Movimento, Pedido, ItemPedido, Contato)
├── produtos_iniciais.py   # Produtos cadastrados na primeira execução
├── schema.sql             # Script SQL de criação das tabelas (DDL)
├── requirements.txt       # Dependências
├── docs/
│   └── der.md             # DER e modelo lógico
├── templates/
│   ├── vitrine.html       # Página principal da loja
│   ├── estoque.html       # Painel administrativo (estoque e faturamento)
│   └── contato.html       # Formulário de contato
└── static/
    ├── vitrine.css / vitrine.js  # Visual e lógica da vitrine
    ├── contato.css               # Visual da página de contato
    ├── chat.css / chat.js        # Widget flutuante dos chatbots
    ├── style.css / script.js     # Visual e lógica do painel admin
    └── Fotos/                    # Logo e fotos dos produtos
```

## 🔧 Principais Rotas

| Rota | Método | Descrição |
|------|--------|-----------|
| `/` ou `/vitrine` | GET | Vitrine pública da loja |
| `/contato` | GET | Formulário de contato |
| `/admin` ou `/estoque` | GET | Painel administrativo |
| `/api/vitrine/produtos` | GET | Lista produtos disponíveis para a vitrine |
| `/api/versao` | GET | Hashes de versão para atualização automática sem F5 |
| `/api/pedidos` | POST | Finaliza pagamento simulado e desconta estoque |
| `/api/chat/vitrine` | POST | Chatbot jovem da vitrine |
| `/api/chat/admin` | POST | Chatbot técnico do painel admin |
| `/api/estoque` | GET | Lista produtos, movimentações e pedidos |
| `/api/produtos` | POST | Cadastra produto |
| `/api/produtos/<id>` | PUT, DELETE | Edita ou exclui produto |
| `/api/movimentos` | POST | Registra entrada, venda ou saída |
| `/api/contatos` | POST | Grava uma mensagem do formulário de contato |
| `/api/contatos` | GET | Lista as mensagens recebidas |

## 🗃️ Banco de Dados

PostgreSQL no **Neon**. O script de criação está em [`schema.sql`](schema.sql) e pode ser executado no SQL Editor do Neon. O diagrama completo e o modelo lógico estão em [docs/der.md](docs/der.md).

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `categoria` | Categorias de produto | 1 categoria : N produtos |
| `produto` | Itens do estoque | N:1 com `categoria` |
| `movimento` | Entradas, vendas e saídas | N:1 com `produto` |
| `pedido` | Pedidos feitos na vitrine | 1 pedido : N itens |
| `item_pedido` | Itens de cada pedido | N:1 com `pedido` e com `produto` |
| `contato` | Mensagens do formulário de contato | Sem relacionamento |

O `schema.sql` também traz consultas de exemplo (estoque baixo, faturamento por produto, últimas mensagens).

### Diagrama Entidade-Relacionamento (DER)

![DER do banco de dados TechnoCaixa](docs/der.png)
