from decimal import Decimal
import hashlib
import re

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_from_directory,
)
from sqlalchemy import text
from sqlalchemy.orm import joinedload

from chatbot_gemini import perguntar_ao_gemini
from config import Config
from models import (
    Categoria,
    Contato,
    ItemPedido,
    Movimento,
    Pedido,
    Produto,
    agora,
    db,
)
from produtos_iniciais import PRODUTOS_INICIAIS

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

CATEGORIAS = ["Computadores", "Monitores", "Periféricos", "Peças", "Acessórios"]
TIPOS = ("entrada", "venda", "saida")
FORMAS_PAGAMENTO = ("pix", "cartao", "boleto")
EMAIL_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------
# TechnoCaixa - Vitrine e-commerce, painel admin e chatbots IA
# ---------------------------------------------------------------


# ---------- Páginas do site ----------

# Página principal: Vitrine de vendas para os clientes
@app.route("/")
@app.route("/vitrine")
def vitrine():
    return render_template("vitrine.html")


# Página pública com o formulário de contato
@app.route("/contato")
def contato():
    return render_template("contato.html")


# Painel de administração (controle de estoque, faturamento e pedidos)
@app.route("/admin")
@app.route("/estoque")
def painel_admin():
    return render_template("estoque.html")


# Entrega as fotos que ficam em static/Fotos
@app.route("/Fotos/<path:arquivo>")
def fotos(arquivo):
    return send_from_directory("static/Fotos", arquivo)


# ---------- Vitrine pública e conta do cliente ----------

def calcular_versoes_banco():
    """Calcula hashes leves para detectar mudanças na vitrine e no painel sem recarregar tudo."""
    linha = db.session.execute(text("""
        SELECT
            (SELECT md5(COALESCE(string_agg(
                id::text || ':' || sku || ':' || nome || ':' || categoria_id::text || ':' ||
                quantidade::text || ':' || preco::text || ':' || md5(COALESCE(foto, '')),
                '|' ORDER BY id
            ), 'vazio')) FROM produto WHERE ativo = TRUE) AS v_vitrine,
            (SELECT md5(COALESCE(string_agg(
                id::text || ':' || sku || ':' || nome || ':' || categoria_id::text || ':' ||
                quantidade::text || ':' || minimo::text || ':' || custo::text || ':' ||
                preco::text || ':' || COALESCE(local, '') || ':' || md5(COALESCE(foto, '')),
                '|' ORDER BY id
            ), 'vazio')) FROM produto WHERE ativo = TRUE) AS v_produtos_adm,
            (SELECT COUNT(*)::text || ':' || COALESCE(MAX(id), 0)::text FROM movimento) AS v_mov,
            (SELECT COUNT(*)::text || ':' || COALESCE(MAX(id), 0)::text FROM pedido) AS v_ped
    """)).first()

    hash_vitrine = linha[0]
    assinatura_admin = f"{linha[1]}|{linha[2]}|{linha[3]}"
    hash_admin = hashlib.md5(assinatura_admin.encode("utf-8")).hexdigest()
    return {"vitrine": hash_vitrine, "admin": hash_admin}


def resposta_sem_cache(dados, status=200, cabecalhos=None):
    """Devolve JSON com Cache-Control: no-store para atualização em tempo real."""
    resposta = jsonify(dados)
    resposta.status_code = status
    resposta.headers["Cache-Control"] = "no-store"
    if cabecalhos:
        for chave, valor in cabecalhos.items():
            resposta.headers[chave] = valor
    return resposta


# Informa versões atuais do banco para atualização automática sem F5
@app.route("/api/versao")
def api_versao():
    return resposta_sem_cache(calcular_versoes_banco())


# Lista os produtos ativos para a vitrine (sem expor custo nem local interno)
@app.route("/api/vitrine/produtos")
def api_vitrine_produtos():
    produtos = (
        Produto.query.options(joinedload(Produto.categoria))
        .filter_by(ativo=True)
        .order_by(Produto.id)
        .all()
    )
    versoes = calcular_versoes_banco()
    return resposta_sem_cache(
        [p.to_vitrine_dict() for p in produtos],
        cabecalhos={"X-Versao-Vitrine": versoes["vitrine"]},
    )


# Finaliza um "pagamento" simulado na vitrine, baixa o estoque e registra a venda
@app.route("/api/pedidos", methods=["POST"])
def api_criar_pedido():
    dados = request.get_json(silent=True) or {}
    itens_recebidos = dados.get("itens")
    forma_pagamento = str(dados.get("formaPagamento", "")).strip().lower()
    endereco = str(dados.get("endereco", "")).strip()[:200]
    cliente_nome = str(dados.get("clienteNome", "")).strip()[:100] or "Cliente da Vitrine"
    cliente_email = str(dados.get("clienteEmail", "")).strip()[:120]

    if forma_pagamento not in FORMAS_PAGAMENTO:
        return jsonify({"erro": "Escolha uma forma de pagamento válida (Pix, Cartão ou Boleto)."}), 400
    if not isinstance(itens_recebidos, list) or len(itens_recebidos) == 0:
        return jsonify({"erro": "Seu carrinho está vazio."}), 400

    # Soma quantidades caso o mesmo produto apareça repetido na lista
    quantidades_por_produto = {}
    for item in itens_recebidos:
        if not isinstance(item, dict):
            return jsonify({"erro": "Item de pedido inválido."}), 400
        try:
            pid = int(item.get("produtoId"))
            qtd = int(item.get("quantidade"))
        except (TypeError, ValueError):
            return jsonify({"erro": "Produto ou quantidade inválidos."}), 400
        if qtd <= 0:
            return jsonify({"erro": "A quantidade de cada item deve ser maior que zero."}), 400
        quantidades_por_produto[pid] = quantidades_por_produto.get(pid, 0) + qtd

    pedido = Pedido(
        cliente_nome=cliente_nome,
        cliente_email=cliente_email,
        data=agora(),
        forma_pagamento=forma_pagamento,
        total=Decimal("0.00"),
        status="aprovado",
        endereco=endereco,
    )
    db.session.add(pedido)
    db.session.flush()  # gera pedido.id para usar na observação do movimento

    total_pedido = Decimal("0.00")
    for pid, qtd in quantidades_por_produto.items():
        # Bloqueia a linha do produto durante a transação para evitar venda dupla do último item
        produto = (
            Produto.query.filter_by(id=pid, ativo=True)
            .with_for_update()
            .first()
        )
        if not produto:
            db.session.rollback()
            return jsonify({"erro": f"Produto #{pid} não encontrado ou indisponível."}), 404
        if qtd > produto.quantidade:
            db.session.rollback()
            return jsonify({
                "erro": f"Estoque insuficiente para {produto.nome} (disponível: {produto.quantidade} un.)."
            }), 400

        produto.quantidade -= qtd
        preco_unitario = Decimal(produto.preco or 0)
        subtotal = preco_unitario * qtd
        total_pedido += subtotal

        db.session.add(
            ItemPedido(
                pedido_id=pedido.id,
                produto_id=produto.id,
                quantidade=qtd,
                preco_unitario=preco_unitario,
            )
        )

        obs = f"Pedido #TC-{pedido.id:04d} · {cliente_nome} ({forma_pagamento.upper()})"
        db.session.add(
            Movimento(
                data=pedido.data,
                produto_id=produto.id,
                tipo="venda",
                quantidade=qtd,
                valor=subtotal,
                custo_unitario=produto.custo,
                observacao=obs[:120],
            )
        )

    pedido.total = total_pedido
    db.session.commit()

    pedido_completo = (
        Pedido.query.options(
            joinedload(Pedido.itens).joinedload(ItemPedido.produto),
        )
        .filter_by(id=pedido.id)
        .first()
    )
    return jsonify(pedido_completo.to_dict()), 201


# ---------- Estoque (Admin) ----------

# Envia todos os produtos ativos, movimentações e pedidos para o painel administrativo
@app.route("/api/estoque")
def api_estoque():
    produtos = (
        Produto.query.options(joinedload(Produto.categoria))
        .filter_by(ativo=True)
        .order_by(Produto.id)
        .all()
    )
    movimentos = (
        Movimento.query.options(joinedload(Movimento.produto))
        .order_by(Movimento.id.desc())
        .all()
    )
    pedidos = (
        Pedido.query.options(
            joinedload(Pedido.itens).joinedload(ItemPedido.produto),
        )
        .order_by(Pedido.id.desc())
        .all()
    )

    versoes = calcular_versoes_banco()
    return resposta_sem_cache({
        "produtos": [p.to_dict() for p in produtos],
        "movimentos": [m.to_dict() for m in movimentos],
        "pedidos": [ped.to_dict() for ped in pedidos],
        "versao": versoes["admin"],
    })


# Verifica se outro produto ativo já usa este SKU
def sku_repetido(sku, id_do_produto=None):
    consulta = Produto.query.filter(
        db.func.lower(Produto.sku) == sku.lower(),
        Produto.ativo.is_(True),
    )
    if id_do_produto is not None:
        consulta = consulta.filter(Produto.id != id_do_produto)
    return consulta.first() is not None


# Copia os campos do formulário para o produto
def preencher_produto(produto, dados, categoria):
    produto.sku = dados["sku"].strip()
    produto.nome = dados["nome"].strip()
    produto.categoria_id = categoria.id
    produto.minimo = dados["minimo"]
    produto.custo = dados["custo"]
    produto.preco = dados["preco"]
    produto.local = dados.get("local", "")
    produto.foto = dados.get("foto", "")


# Valida o formulário de produto. Devolve (categoria, mensagem_de_erro).
def validar_produto(dados):
    for campo in ("sku", "nome", "categoria", "minimo", "custo", "preco"):
        if campo not in dados or str(dados[campo]).strip() == "":
            return None, f"Campo obrigatório: {campo}."

    if min(dados["minimo"], dados["custo"], dados["preco"]) < 0:
        return None, "Mínimo, custo e preço não podem ser negativos."

    categoria = Categoria.query.filter_by(nome=dados["categoria"]).first()
    if not categoria:
        return None, "Categoria inválida."
    return categoria, None


# Cria um registro de movimentação (entrada, venda ou saída)
def registrar_movimento(produto, tipo, quantidade, observacao):
    valor = quantidade * produto.preco if tipo == "venda" else 0

    movimento = Movimento(
        data=agora(),
        produto_id=produto.id,
        tipo=tipo,
        quantidade=quantidade,
        valor=valor,
        custo_unitario=produto.custo,
        observacao=observacao,
    )
    db.session.add(movimento)


# Cadastra um produto novo
@app.route("/api/produtos", methods=["POST"])
def api_novo_produto():
    dados = request.get_json(silent=True) or {}

    categoria, erro = validar_produto(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    quantidade = int(dados.get("quantidade", 0))
    if quantidade < 0:
        return jsonify({"erro": "A quantidade inicial não pode ser negativa."}), 400

    if sku_repetido(dados["sku"]):
        return jsonify({"erro": "Já existe um produto com este SKU."}), 400

    produto = Produto(quantidade=quantidade)
    preencher_produto(produto, dados, categoria)
    db.session.add(produto)
    db.session.flush()  # gera o id do produto

    if produto.quantidade > 0:
        registrar_movimento(produto, "entrada", produto.quantidade, "Estoque inicial")

    db.session.commit()
    return jsonify(produto.to_dict()), 201


# Edita um produto (a quantidade só muda por movimentação)
@app.route("/api/produtos/<int:id>", methods=["PUT"])
def api_editar_produto(id):
    produto = Produto.query.filter_by(id=id, ativo=True).first_or_404()
    dados = request.get_json(silent=True) or {}

    categoria, erro = validar_produto(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    if sku_repetido(dados["sku"], id):
        return jsonify({"erro": "Já existe um produto com este SKU."}), 400

    preencher_produto(produto, dados, categoria)
    db.session.commit()
    return jsonify(produto.to_dict())


# Exclui um produto (exclusão lógica: o histórico de movimentações é mantido)
@app.route("/api/produtos/<int:id>", methods=["DELETE"])
def api_excluir_produto(id):
    produto = Produto.query.filter_by(id=id, ativo=True).first_or_404()
    produto.ativo = False
    db.session.commit()
    return jsonify({"ok": True})


# Registra entrada, venda ou saída e atualiza a quantidade do produto
@app.route("/api/movimentos", methods=["POST"])
def api_novo_movimento():
    dados = request.get_json(silent=True) or {}

    produto = Produto.query.filter_by(id=dados.get("produtoId"), ativo=True).first()
    if not produto:
        return jsonify({"erro": "Produto não encontrado."}), 404

    tipo = dados.get("tipo")
    if tipo not in TIPOS:
        return jsonify({"erro": "Tipo de movimentação inválido."}), 400

    try:
        quantidade = int(dados.get("quantidade"))
    except (TypeError, ValueError):
        return jsonify({"erro": "Informe uma quantidade válida."}), 400

    if quantidade <= 0:
        return jsonify({"erro": "Informe uma quantidade maior que zero."}), 400

    if tipo == "entrada":
        produto.quantidade = produto.quantidade + quantidade
    else:
        if quantidade > produto.quantidade:
            return jsonify({"erro": f"Quantidade maior que o estoque disponível ({produto.quantidade} un.)."}), 400
        produto.quantidade = produto.quantidade - quantidade

    registrar_movimento(produto, tipo, quantidade, dados.get("observacao", ""))
    db.session.commit()
    return jsonify(produto.to_dict()), 201


# ---------- Contato (formulário do site) ----------

# Grava uma mensagem enviada pelo formulário de contato
@app.route("/api/contatos", methods=["POST"])
def api_novo_contato():
    dados = request.get_json(silent=True) or {}

    nome = str(dados.get("nome", "")).strip()
    email = str(dados.get("email", "")).strip()
    telefone = str(dados.get("telefone", "")).strip()
    assunto = str(dados.get("assunto", "")).strip()
    mensagem = str(dados.get("mensagem", "")).strip()

    if not nome or not email or not assunto or not mensagem:
        return jsonify({"erro": "Preencha nome, e-mail, assunto e mensagem."}), 400
    if not EMAIL_VALIDO.match(email):
        return jsonify({"erro": "Informe um e-mail válido."}), 400
    if len(nome) > 100 or len(email) > 120 or len(telefone) > 20 or len(assunto) > 100:
        return jsonify({"erro": "Algum campo ultrapassou o tamanho máximo."}), 400
    if len(mensagem) > 2000:
        return jsonify({"erro": "A mensagem pode ter no máximo 2000 caracteres."}), 400

    contato = Contato(
        nome=nome,
        email=email,
        telefone=telefone or None,
        assunto=assunto,
        mensagem=mensagem,
    )
    db.session.add(contato)
    db.session.commit()
    return jsonify(contato.to_dict()), 201


# Lista as mensagens recebidas
@app.route("/api/contatos")
def api_listar_contatos():
    contatos = Contato.query.order_by(Contato.id.desc()).all()
    return jsonify([c.to_dict() for c in contatos])


# ---------- Chatbots IA (Gemini) ----------

def processar_mensagem_chat(modo):
    """Valida o JSON recebido e envia a pergunta ao módulo Gemini."""
    dados = request.get_json(silent=True) or {}
    mensagem = str(dados.get("mensagem", "")).strip()
    historico = dados.get("historico") or []

    if not mensagem:
        return jsonify({"erro": "Digite uma mensagem para conversar com o assistente."}), 400
    if len(mensagem) > 800:
        return jsonify({"erro": "A mensagem pode ter no máximo 800 caracteres."}), 400

    try:
        resposta = perguntar_ao_gemini(modo, mensagem, historico)
        return jsonify({"resposta": resposta})
    except Exception:
        return jsonify({
            "erro": "O assistente está temporariamente indisponível. Tente novamente em instantes."
        }), 502


# Chatbot público da vitrine (persona jovem, estoque e itens da loja)
@app.route("/api/chat/vitrine", methods=["POST"])
def api_chat_vitrine():
    return processar_mensagem_chat("vitrine")


# Chatbot do painel administrativo (persona técnica, estoque e estatísticas)
@app.route("/api/chat/admin", methods=["POST"])
def api_chat_admin():
    return processar_mensagem_chat("admin")


# ---------- Preparação inicial do banco ----------

def cadastrar_produtos_iniciais():
    """Cadastra os produtos iniciais que ainda não existem no banco (pelo SKU)."""
    skus_existentes = {p.sku for p in Produto.query.all()}
    categorias_por_nome = {c.nome: c for c in Categoria.query.all()}

    for item in PRODUTOS_INICIAIS:
        if item["sku"] in skus_existentes:
            continue
        categoria = categorias_por_nome.get(item["categoria"])
        if not categoria:
            continue
        produto = Produto(
            sku=item["sku"],
            nome=item["nome"],
            categoria_id=categoria.id,
            quantidade=item["quantidade"],
            minimo=item["minimo"],
            custo=item["custo"],
            preco=item["preco"],
            local=item["local"],
            foto=item["foto"],
        )
        db.session.add(produto)
        db.session.flush()
        if produto.quantidade > 0:
            registrar_movimento(produto, "entrada", produto.quantidade, "Estoque inicial")


def migrar_pedidos_sem_login():
    """Preserva os pedidos antigos migrando nome/e-mail do comprador antes de remover a tabela usuario."""
    db.session.execute(text(
        "ALTER TABLE pedido ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(100) NOT NULL DEFAULT 'Cliente da Vitrine'"
    ))
    db.session.execute(text(
        "ALTER TABLE pedido ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(120) DEFAULT ''"
    ))

    tem_usuario_id = db.session.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pedido' AND column_name = 'usuario_id'
    """)).first()

    if tem_usuario_id:
        tem_tabela_usuario = db.session.execute(text("SELECT to_regclass('public.usuario')")).scalar()
        if tem_tabela_usuario:
            db.session.execute(text("""
                UPDATE pedido p
                SET cliente_nome = u.nome,
                    cliente_email = u.email
                FROM usuario u
                WHERE p.usuario_id = u.id
            """))
        db.session.execute(text("ALTER TABLE pedido DROP COLUMN IF EXISTS usuario_id"))

    db.session.execute(text("DROP TABLE IF EXISTS usuario"))


# Cria as tabelas no banco (Neon) e cadastra categorias e produtos iniciais
def preparar_banco():
    db.create_all()
    migrar_pedidos_sem_login()

    for nome in CATEGORIAS:
        if not Categoria.query.filter_by(nome=nome).first():
            db.session.add(Categoria(nome=nome))
    db.session.flush()

    cadastrar_produtos_iniciais()
    db.session.commit()


with app.app_context():
    preparar_banco()

if __name__ == "__main__":
    app.run(debug=True)
