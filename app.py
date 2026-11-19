import re

from flask import Flask, render_template, request, jsonify, send_from_directory
from sqlalchemy.orm import joinedload

from config import Config
from models import db, Categoria, Produto, Movimento, Contato, agora

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

CATEGORIAS = ["Computadores", "Monitores", "Periféricos", "Peças", "Acessórios"]
TIPOS = ("entrada", "venda", "saida")
EMAIL_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------
# TecnoCaixa - Controle de estoque e faturamento
# A página usa as rotas /api/... para ler e gravar no banco.
# ---------------------------------------------------------------

# Página do controle de estoque (abre no endereço principal e em /estoque)
@app.route("/")
@app.route("/estoque")
def estoque():
    return render_template("estoque.html")


# Página pública com o formulário de contato
@app.route("/contato")
def contato():
    return render_template("contato.html")


# Entrega as fotos que ficam em static/Fotos
@app.route("/Fotos/<path:arquivo>")
def fotos(arquivo):
    return send_from_directory("static/Fotos", arquivo)


# ---------- Estoque ----------

# Envia todos os produtos ativos e as movimentações para a página
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

    return jsonify({
        "produtos": [p.to_dict() for p in produtos],
        "movimentos": [m.to_dict() for m in movimentos]
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
        observacao=observacao
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
        mensagem=mensagem
    )
    db.session.add(contato)
    db.session.commit()
    return jsonify(contato.to_dict()), 201


# Lista as mensagens recebidas (mais recentes primeiro)
@app.route("/api/contatos")
def api_listar_contatos():
    contatos = Contato.query.order_by(Contato.id.desc()).all()
    return jsonify([c.to_dict() for c in contatos])


# Cria as tabelas no banco (Neon) e cadastra as categorias fixas
def preparar_banco():
    db.create_all()
    for nome in CATEGORIAS:
        if not Categoria.query.filter_by(nome=nome).first():
            db.session.add(Categoria(nome=nome))
    db.session.commit()


with app.app_context():
    preparar_banco()

if __name__ == "__main__":
    app.run(debug=True)