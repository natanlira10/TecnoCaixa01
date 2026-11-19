# TecnoCaixa 📦

Sistema web de **vitrine e-commerce com pagamento simulado, painel administrativo de controle de estoque/faturamento e chatbots com IA (Gemini)** para uma loja de informática, feito com **Flask**, **SQLAlchemy** e banco **PostgreSQL no Neon**.

## 📋 O que o sistema faz

### Vitrine de Vendas (`/`)
- **Catálogo público:** busca, filtro por categoria, ordenação por preço/nome e disponibilidade em tempo real
- **Carrinho e Checkout simulado:** pagamento fictício via Pix, Cartão de Crédito ou Boleto com baixa automática no estoque
- **Login e cadastro de cliente:** exigido para concluir o pagamento e acompanhar histórico em *Meus pedidos*
- **Chatbot da Vitrine (bolinha no canto inferior direito):** persona jovem e descontraída conectada ao Gemini, consultando quantidades reais do estoque e respondendo apenas sobre a TecnoCaixa

### Painel Administrativo (`/admin` ou `/estoque`)
- **Login restrito de administrador:** protegido em `/admin/login` (padrão: `admin@tecnocaixa.com` / `admin123`)
- **Painel e Faturamento:** KPIs de estoque, reposição necessária, total vendido, ticket médio, lucro estimado e gráfico dos últimos 7 dias
- **Produtos, Movimentações e Pedidos:** cadastro, edição, exclusão lógica, registro de entradas/saídas e visualização dos pedidos da vitrine
- **Chatbot Técnico do Admin (bolinha no canto inferior direito):** persona técnica conectada ao Gemini para responder somente sobre estoque, dados e estatísticas da TecnoCaixa

## 🛠️ Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| **Flask** | Servidor web e rotas da API |
| **SQLAlchemy** | Acesso ao banco de dados |
| **PostgreSQL (Neon)** | Banco de dados na nuvem |
| **HTML, CSS e JavaScript** | Página do sistema |

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
SECRET_KEY=sua_chave_secreta_aqui
FLASK_DEBUG=True
GEMINI_API_KEY=sua_chave_gemini_aqui
ADMIN_EMAIL=admin@tecnocaixa.com
ADMIN_SENHA=troque_esta_senha
ADMIN_NOME=Administrador TecnoCaixa
```

### 4. Executar

```bash
python app.py
```

Acesse em: `http://localhost:5000`

Na primeira execução, as tabelas são criadas sozinhas no banco e os produtos da pasta `static/Fotos` são cadastrados (veja `produtos_iniciais.py`).

## ☁️ Deploy no Render

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
- **Environment:** `DATABASE_URL` e `SECRET_KEY` (o `.env` não vai para o GitHub)

## 📁 Estrutura do Projeto

```
├── app.py                 # Servidor Flask: vitrine, admin, autenticação e APIs
├── chatbot_gemini.py      # Contexto do banco, personas e integração REST com Gemini
├── config.py              # Configuração (lê o .env)
├── models.py              # Tabelas do banco (Categoria, Produto, Movimento, Usuario, Pedido, ItemPedido, Contato)
├── produtos_iniciais.py   # Produtos cadastrados na primeira execução
├── requirements.txt       # Dependências
├── templates/
│   ├── vitrine.html       # Página principal da loja
│   ├── admin_login.html   # Login do administrador
│   ├── estoque.html       # Painel administrativo (estoque e faturamento)
│   └── contato.html       # Formulário de contato
└── static/
    ├── vitrine.css / vitrine.js  # Visual e lógica da vitrine
    ├── chat.css / chat.js        # Widget flutuante dos chatbots
    ├── style.css / script.js     # Visual e lógica do painel admin
    └── Fotos/                    # Fotos dos produtos
```

## 🔧 Principais Rotas

| Rota | Método | Descrição |
|------|--------|-----------|
| `/` ou `/vitrine` | GET | Vitrine pública da loja |
| `/contato` | GET | Formulário de contato |
| `/admin/login` | GET, POST | Login do administrador |
| `/admin` ou `/estoque` | GET | Painel administrativo (requer login admin) |
| `/api/vitrine/produtos` | GET | Lista produtos disponíveis para a vitrine |
| `/api/cliente/cadastro`, `/api/cliente/login`, `/api/cliente/logout` | POST | Autenticação de cliente |
| `/api/pedidos` | POST | Finaliza pagamento simulado e desconta estoque (requer cliente) |
| `/api/chat/vitrine` | POST | Chatbot jovem da vitrine |
| `/api/chat/admin` | POST | Chatbot técnico do admin (requer login admin) |
| `/api/estoque` | GET | Lista produtos, movimentações e pedidos (requer admin) |
| `/api/produtos` | POST | Cadastra produto (requer admin) |
| `/api/produtos/<id>` | PUT, DELETE | Edita ou exclui produto (requer admin) |
| `/api/movimentos` | POST | Registra entrada, venda ou saída (requer admin) |

## 🗃️ Tabelas do Banco

#### Produto, Movimento, Categoria, Contato, Usuario, Pedido e ItemPedido
Veja o diagrama completo e o modelo lógico em [docs/der.md](docs/der.md).
