from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()


# ---------------------------------------------------------------
# TecnoCaixa - Vitrine, controle de estoque e faturamento
#
# Modelo (3FN):
#   categoria 1 ---- N produto 1 ---- N movimento
#   usuario   1 ---- N pedido  1 ---- N item_pedido N ---- 1 produto
#   contato (registros do formulário do site, sem relacionamento)
# ---------------------------------------------------------------

def agora():
    return datetime.now(timezone.utc)


class Categoria(db.Model):
    __tablename__ = "categoria"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(40), unique=True, nullable=False)

    produtos = db.relationship("Produto", back_populates="categoria")


class Produto(db.Model):
    __tablename__ = "produto"
    __table_args__ = (
        db.CheckConstraint("quantidade >= 0", name="ck_produto_quantidade"),
        db.CheckConstraint("minimo >= 0", name="ck_produto_minimo"),
        db.CheckConstraint("custo >= 0", name="ck_produto_custo"),
        db.CheckConstraint("preco >= 0", name="ck_produto_preco"),
        # O SKU é único só entre os produtos ativos: depois de excluir um
        # produto, o mesmo SKU pode ser usado de novo.
        db.Index("ux_produto_sku_ativo", "sku", unique=True,
                 postgresql_where=text("ativo")),
    )

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(20), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    categoria_id = db.Column(db.Integer, db.ForeignKey("categoria.id"), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    minimo = db.Column(db.Integer, nullable=False, default=0)
    custo = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    preco = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    local = db.Column(db.String(40), default="")
    foto = db.Column(db.Text, default="")  # caminho (Fotos/...) ou imagem em base64
    # Exclusão lógica: o produto some da tela, mas o histórico continua ligado a ele
    ativo = db.Column(db.Boolean, nullable=False, default=True, server_default=text("true"))

    categoria = db.relationship("Categoria", back_populates="produtos")
    movimentos = db.relationship("Movimento", back_populates="produto")
    itens_pedido = db.relationship("ItemPedido", back_populates="produto")

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "nome": self.nome,
            "categoria": self.categoria.nome,
            "quantidade": self.quantidade,
            "minimo": self.minimo,
            "custo": float(self.custo or 0),
            "preco": float(self.preco or 0),
            "local": self.local or "",
            "foto": self.foto or ""
        }

    def to_vitrine_dict(self):
        """Dados públicos exibidos aos clientes na vitrine (sem custo ou local interno)."""
        return {
            "id": self.id,
            "sku": self.sku,
            "nome": self.nome,
            "categoria": self.categoria.nome,
            "quantidade": self.quantidade,
            "preco": float(self.preco or 0),
            "foto": self.foto or "",
            "disponivel": self.quantidade > 0
        }


class Movimento(db.Model):
    __tablename__ = "movimento"
    __table_args__ = (
        db.CheckConstraint("tipo IN ('entrada', 'venda', 'saida')", name="ck_movimento_tipo"),
        db.CheckConstraint("quantidade > 0", name="ck_movimento_quantidade"),
        db.CheckConstraint("valor >= 0", name="ck_movimento_valor"),
    )

    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.DateTime(timezone=True), nullable=False, default=agora)
    produto_id = db.Column(
        db.Integer,
        db.ForeignKey("produto.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tipo = db.Column(db.String(10), nullable=False)  # entrada | venda | saida
    quantidade = db.Column(db.Integer, nullable=False)
    valor = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    # Cópia do custo no momento do movimento: o lucro histórico não muda
    # quando o custo do produto é reajustado (não é redundância, é histórico).
    custo_unitario = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    observacao = db.Column(db.String(120), default="")

    produto = db.relationship("Produto", back_populates="movimentos")

    def to_dict(self):
        return {
            "id": self.id,
            "data": self.data.isoformat(),
            "produtoId": self.produto_id,
            "produtoNome": self.produto.nome,
            "tipo": self.tipo,
            "quantidade": self.quantidade,
            "valor": float(self.valor or 0),
            "custoUnitario": float(self.custo_unitario or 0),
            "observacao": self.observacao or ""
        }


class Contato(db.Model):
    """Mensagens enviadas pelo formulário de contato do site."""
    __tablename__ = "contato"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    telefone = db.Column(db.String(20))
    assunto = db.Column(db.String(100), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=agora)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "telefone": self.telefone or "",
            "assunto": self.assunto,
            "mensagem": self.mensagem,
            "criadoEm": self.criado_em.isoformat()
        }


class Usuario(db.Model):
    """Contas de clientes da vitrine e de administradores do painel."""
    __tablename__ = "usuario"
    __table_args__ = (
        db.CheckConstraint("tipo IN ('cliente', 'admin')", name="ck_usuario_tipo"),
    )

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    tipo = db.Column(db.String(10), nullable=False, default="cliente")  # cliente | admin
    criado_em = db.Column(db.DateTime(timezone=True), nullable=False, default=agora)

    pedidos = db.relationship("Pedido", back_populates="usuario")

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "tipo": self.tipo
        }


class Pedido(db.Model):
    """Compras simuladas realizadas pelos clientes logados na vitrine."""
    __tablename__ = "pedido"
    __table_args__ = (
        db.CheckConstraint("forma_pagamento IN ('pix', 'cartao', 'boleto')", name="ck_pedido_pagamento"),
        db.CheckConstraint("total >= 0", name="ck_pedido_total"),
    )

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"), nullable=False, index=True)
    data = db.Column(db.DateTime(timezone=True), nullable=False, default=agora)
    forma_pagamento = db.Column(db.String(20), nullable=False)  # pix | cartao | boleto
    total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="aprovado")
    endereco = db.Column(db.String(200), default="")

    usuario = db.relationship("Usuario", back_populates="pedidos")
    itens = db.relationship("ItemPedido", back_populates="pedido", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": f"TC-{self.id:04d}",
            "data": self.data.isoformat(),
            "clienteNome": self.usuario.nome,
            "clienteEmail": self.usuario.email,
            "formaPagamento": self.forma_pagamento,
            "total": float(self.total or 0),
            "status": self.status,
            "endereco": self.endereco or "",
            "itens": [item.to_dict() for item in self.itens]
        }


class ItemPedido(db.Model):
    """Produtos incluídos em cada pedido da vitrine."""
    __tablename__ = "item_pedido"
    __table_args__ = (
        db.CheckConstraint("quantidade > 0", name="ck_item_pedido_quantidade"),
        db.CheckConstraint("preco_unitario >= 0", name="ck_item_pedido_preco"),
    )

    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(
        db.Integer,
        db.ForeignKey("pedido.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    produto_id = db.Column(
        db.Integer,
        db.ForeignKey("produto.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantidade = db.Column(db.Integer, nullable=False)
    # Preço gravado no momento da compra para preservar o histórico do pedido
    preco_unitario = db.Column(db.Numeric(12, 2), nullable=False)

    pedido = db.relationship("Pedido", back_populates="itens")
    produto = db.relationship("Produto", back_populates="itens_pedido")

    def to_dict(self):
        preco = float(self.preco_unitario or 0)
        return {
            "produtoId": self.produto_id,
            "produtoNome": self.produto.nome,
            "sku": self.produto.sku,
            "quantidade": self.quantidade,
            "precoUnitario": preco,
            "subtotal": round(preco * self.quantidade, 2)
        }