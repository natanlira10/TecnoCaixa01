// =============================================================
// TecnoCaixa - Controle de estoque e faturamento
//
// Os dados ficam no banco de dados (PostgreSQL no Neon).
// Este arquivo conversa com o servidor Flask (app.py) pelas rotas /api/...
// =============================================================


// ---------- Configurações ----------

const CATEGORIAS = ['Computadores', 'Monitores', 'Periféricos', 'Peças', 'Acessórios'];

const NOMES_DAS_ABAS = {
  painel: 'Painel',
  faturamento: 'Faturamento',
  produtos: 'Produtos',
  movimentacoes: 'Movimentações',
  pedidos: 'Pedidos da Vitrine'
};

const NOMES_DOS_TIPOS = { entrada: 'Entrada', venda: 'Venda', saida: 'Saída' };
const NOMES_PAGAMENTO = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto' };

// Aqui ficam os dados que vieram do banco
let produtos = [];
let movimentos = [];
let pedidos = [];


// ---------- Funções de ajuda ----------

// Atalho para pegar um elemento da página pelo id
function $(id) {
  return document.getElementById(id);
}

// Protege o texto antes de colocar no HTML
function esc(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML.replace(/"/g, '&quot;');
}

// 1234.5 -> "R$ 1.234,50"
function dinheiro(valor) {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Data no formato brasileiro: 16/11/2026, 10:30:00
function dataHora(data) {
  return new Date(data).toLocaleString('pt-BR');
}

// Caminhos com espaço/acento (ex.: "Fotos/Mouse Gamer.jpg") precisam ser codificados
function enderecoDaFoto(foto) {
  if (!foto) return '';
  if (foto.startsWith('data:') || foto.startsWith('http') || foto.startsWith('/')) return encodeURI(foto);
  return '/' + encodeURI(foto);
}

// O produto está com estoque baixo?
function estoqueBaixo(produto) {
  return produto.quantidade <= produto.minimo;
}

function buscarProduto(id) {
  return produtos.find((p) => p.id === id);
}


// ---------- Comunicação com o servidor ----------

// Envia um pedido para o servidor. Se der erro, mostra a mensagem.
async function enviarParaServidor(endereco, metodo, dados) {
  const resposta = await fetch(endereco, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  if (resposta.status === 401) {
    window.location.href = '/admin/login';
    return false;
  }
  const resultado = await resposta.json();

  if (!resposta.ok) {
    alert(resultado.erro || 'Erro ao salvar no banco de dados.');
    return false;
  }
  return true;
}

// Busca produtos, movimentações e pedidos no banco e redesenha a página
async function carregarDados() {
  try {
    const resposta = await fetch('/api/estoque');
    if (resposta.status === 401) {
      window.location.href = '/admin/login';
      return;
    }
    const dados = await resposta.json();
    produtos = dados.produtos || [];
    movimentos = dados.movimentos || [];
    pedidos = dados.pedidos || [];
  } catch (e) {
    alert('Não foi possível carregar os dados do banco.');
  }
  mostrarTudo();
}


// ---------- Abas do menu lateral ----------

function mostrarAba(nome) {
  if (!NOMES_DAS_ABAS[nome]) nome = 'painel';

  document.querySelectorAll('.aba').forEach((secao) => {
    secao.hidden = secao.id !== nome;
  });
  document.querySelectorAll('.menu-lateral a').forEach((link) => {
    link.classList.toggle('ativo', link.dataset.aba === nome);
  });
  $('titulo-aba').textContent = NOMES_DAS_ABAS[nome];
  history.replaceState(null, '', '#' + nome);
  window.scrollTo(0, 0);
}


// ---------- Painel ----------

function mostrarPainel() {
  let unidades = 0;
  let valorEmEstoque = 0;
  produtos.forEach((p) => {
    unidades += p.quantidade;
    valorEmEstoque += p.quantidade * p.custo;
  });
  const baixos = produtos.filter(estoqueBaixo);

  $('kpi-produtos').textContent = produtos.length;
  $('kpi-unidades').textContent = unidades;
  $('kpi-valor').textContent = dinheiro(valorEmEstoque);
  $('kpi-baixo').textContent = baixos.length;

  if (baixos.length === 0) {
    $('lista-baixo').innerHTML = '<li>Nenhum produto abaixo do estoque mínimo.</li>';
  } else {
    $('lista-baixo').innerHTML = baixos
      .map((p) => `<li>${esc(p.nome)} (${esc(p.sku)}): ${p.quantidade} un., mínimo ${p.minimo}</li>`)
      .join('');
  }

  const ultimos = movimentos.slice(0, 5);
  if (ultimos.length === 0) {
    $('lista-recentes').innerHTML = '<li>Nenhuma movimentação registrada.</li>';
  } else {
    $('lista-recentes').innerHTML = ultimos
      .map((m) => `<li>${esc(dataHora(m.data))} · ${NOMES_DOS_TIPOS[m.tipo]} de ${m.quantidade} un. · ${esc(m.produtoNome)}</li>`)
      .join('');
  }
}


// ---------- Faturamento ----------

// Vendas dentro do período escolhido (7, 30, 90 dias ou todas)
function vendasDoPeriodo() {
  const dias = Number($('fat-periodo').value);
  const inicio = dias ? Date.now() - dias * 24 * 60 * 60 * 1000 : 0;
  return movimentos.filter((m) => m.tipo === 'venda' && new Date(m.data).getTime() >= inicio);
}

// Desenha o gráfico de linha (eixo X = dias, eixo Y = faturamento em R$)
function desenharGrafico(pontos) {
  const largura = 600, altura = 280;
  const esquerda = 80, direita = 20, topo = 20, baixo = 44;
  const larguraUtil = largura - esquerda - direita;
  const alturaUtil = altura - topo - baixo;
  const maiorValor = Math.max(...pontos.map((p) => p.total), 1) * 1.1;

  const posicaoX = (i) => esquerda + (i / (pontos.length - 1)) * larguraUtil;
  const posicaoY = (valor) => topo + alturaUtil - (valor / maiorValor) * alturaUtil;

  let svg = `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de faturamento dos últimos 7 dias" class="plano">`;

  // Linhas de fundo com os valores do eixo Y
  for (let k = 0; k <= 4; k++) {
    const valor = (maiorValor * k) / 4;
    const y = posicaoY(valor).toFixed(1);
    svg += `<line x1="${esquerda}" y1="${y}" x2="${largura - direita}" y2="${y}" class="grade"/>`;
    svg += `<text x="${esquerda - 8}" y="${y}" class="eixo-valor" text-anchor="end" dominant-baseline="middle">R$ ${Math.round(valor).toLocaleString('pt-BR')}</text>`;
  }

  // Eixos X e Y
  svg += `<line x1="${esquerda}" y1="${topo}" x2="${esquerda}" y2="${topo + alturaUtil}" class="eixo"/>`;
  svg += `<line x1="${esquerda}" y1="${topo + alturaUtil}" x2="${largura - direita}" y2="${topo + alturaUtil}" class="eixo"/>`;

  // Linha do gráfico
  const coordenadas = pontos.map((p, i) => `${posicaoX(i).toFixed(1)},${posicaoY(p.total).toFixed(1)}`).join(' ');
  svg += `<polyline points="${coordenadas}" class="serie"/>`;

  // Bolinhas, valores e nomes dos dias
  pontos.forEach((p, i) => {
    const x = posicaoX(i).toFixed(1);
    const y = posicaoY(p.total);
    svg += `<circle cx="${x}" cy="${y.toFixed(1)}" r="5" class="ponto"><title>${esc(p.rotulo)}: ${dinheiro(p.total)}</title></circle>`;
    if (p.total > 0) {
      svg += `<text x="${x}" y="${(y - 10).toFixed(1)}" class="valor-ponto" text-anchor="middle">${dinheiro(p.total)}</text>`;
    }
    svg += `<text x="${x}" y="${topo + alturaUtil + 18}" class="eixo-valor" text-anchor="middle">${esc(p.rotulo)}</text>`;
  });

  return svg + '</svg>';
}

function mostrarFaturamento() {
  const vendas = vendasDoPeriodo();

  let faturamento = 0;
  let lucro = 0;
  vendas.forEach((m) => {
    faturamento += m.valor;
    lucro += m.valor - m.quantidade * m.custoUnitario;
  });
  const ticketMedio = vendas.length ? faturamento / vendas.length : 0;

  $('fat-total').textContent = dinheiro(faturamento);
  $('fat-vendas').textContent = vendas.length;
  $('fat-ticket').textContent = dinheiro(ticketMedio);
  $('fat-lucro').textContent = dinheiro(lucro);

  // Gráfico: soma das vendas de cada um dos últimos 7 dias
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const dia = new Date();
    dia.setDate(dia.getDate() - i);

    let total = 0;
    movimentos.forEach((m) => {
      if (m.tipo === 'venda' && new Date(m.data).toDateString() === dia.toDateString()) {
        total += m.valor;
      }
    });
    dias.push({ rotulo: dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }), total });
  }
  $('grafico-dias').innerHTML = desenharGrafico(dias);

  // Os 5 produtos que mais faturaram no período
  const somaPorProduto = {};
  vendas.forEach((m) => {
    if (!somaPorProduto[m.produtoId]) {
      somaPorProduto[m.produtoId] = { nome: m.produtoNome, quantidade: 0, valor: 0 };
    }
    somaPorProduto[m.produtoId].quantidade += m.quantidade;
    somaPorProduto[m.produtoId].valor += m.valor;
  });
  const top5 = Object.values(somaPorProduto).sort((a, b) => b.valor - a.valor).slice(0, 5);

  if (top5.length === 0) {
    $('top-produtos').innerHTML = '<li>Nenhuma venda no período.</li>';
  } else {
    $('top-produtos').innerHTML = top5
      .map((p) => `<li>${esc(p.nome)} · ${p.quantidade} un. · ${dinheiro(p.valor)}</li>`)
      .join('');
  }
}


// ---------- Produtos (cartões) ----------

function cartaoDoProduto(p) {
  const baixo = estoqueBaixo(p);
  const foto = p.foto
    ? `<img src="${esc(enderecoDaFoto(p.foto))}" alt="${esc(p.nome)}" loading="lazy">`
    : '<span>Sem foto</span>';

  return `
    <article class="card-produto ${baixo ? 'card-alerta' : ''}">
      <div class="foto-card">${foto}</div>
      <div class="corpo-card">
        <p class="sku">${esc(p.sku)} · ${esc(p.categoria)}</p>
        <h3>${esc(p.nome)}</h3>
        <p class="detalhe">Local: ${esc(p.local || '—')}</p>
        <p class="detalhe">Custo: ${dinheiro(p.custo)} · Venda: ${dinheiro(p.preco)}</p>
        <p class="detalhe">Mínimo: ${p.minimo}</p>
        <p class="quantidade ${baixo ? 'texto-alerta' : ''}">${p.quantidade} un. em estoque${baixo ? ' · reposição' : ''}</p>
      </div>
      <div class="acoes">
        <button data-acao="venda" data-id="${p.id}">Venda</button>
        <button data-acao="entrada" data-id="${p.id}">Entrada</button>
        <button data-acao="saida" data-id="${p.id}">Saída</button>
        <button data-acao="editar" data-id="${p.id}">Editar</button>
        <button data-acao="excluir" data-id="${p.id}" class="perigo">Excluir</button>
      </div>
    </article>`;
}

function mostrarProdutos() {
  const busca = $('busca').value.trim().toLowerCase();
  const categoria = $('filtro-categoria').value;

  const filtrados = produtos.filter((p) => {
    const textoDoProduto = `${p.nome} ${p.sku} ${p.local}`.toLowerCase();
    const passaNaBusca = textoDoProduto.includes(busca);
    const passaNaCategoria = !categoria || p.categoria === categoria;
    return passaNaBusca && passaNaCategoria;
  });

  if (filtrados.length === 0) {
    $('grid-produtos').innerHTML = '<p class="vazio">Nenhum produto encontrado.</p>';
  } else {
    $('grid-produtos').innerHTML = filtrados.map(cartaoDoProduto).join('');
  }
}


// ---------- Movimentações (tabela e lista de produtos) ----------

function mostrarMovimentacoes() {
  // Lista de produtos do formulário, mantendo o que estava escolhido
  const escolhido = $('mov-produto').value;
  $('mov-produto').innerHTML = produtos
    .map((p) => `<option value="${p.id}">${esc(p.sku)} · ${esc(p.nome)} (${p.quantidade} un.)</option>`)
    .join('');
  if (escolhido) $('mov-produto').value = escolhido;

  // Tabela com as 50 movimentações mais recentes
  const ultimas = movimentos.slice(0, 50);
  if (ultimas.length === 0) {
    $('corpo-movimentos').innerHTML = '<tr><td colspan="6">Nenhuma movimentação registrada.</td></tr>';
    return;
  }
  $('corpo-movimentos').innerHTML = ultimas.map((m) => `
    <tr>
      <td>${esc(dataHora(m.data))}</td>
      <td>${esc(m.produtoNome)}</td>
      <td><span class="tag tag-${m.tipo}">${NOMES_DOS_TIPOS[m.tipo]}</span></td>
      <td class="num">${m.quantidade}</td>
      <td class="num">${m.tipo === 'venda' ? dinheiro(m.valor) : '—'}</td>
      <td>${esc(m.observacao)}</td>
    </tr>`).join('');
}

// ---------- Pedidos da Vitrine ----------

function mostrarPedidos() {
  const corpo = $('corpo-pedidos');
  if (!corpo) return;

  if (pedidos.length === 0) {
    corpo.innerHTML = '<tr><td colspan="6">Nenhum pedido realizado na vitrine ainda.</td></tr>';
    return;
  }

  corpo.innerHTML = pedidos
    .map((ped) => {
      const resumoItens = ped.itens
        .map((i) => `${i.quantidade}x ${esc(i.produtoNome)}`)
        .join('<br>');
      return `
        <tr>
          <td><strong>${esc(ped.codigo)}</strong></td>
          <td>${esc(dataHora(ped.data))}</td>
          <td>${esc(ped.clienteNome)}<br><span class="detalhe">${esc(ped.clienteEmail)}</span></td>
          <td>${esc(NOMES_PAGAMENTO[ped.formaPagamento] || ped.formaPagamento)}</td>
          <td>${resumoItens}</td>
          <td class="num"><strong>${dinheiro(ped.total)}</strong></td>
        </tr>`;
    })
    .join('');
}

// Redesenha todas as partes da página
function mostrarTudo() {
  mostrarPainel();
  mostrarFaturamento();
  mostrarProdutos();
  mostrarMovimentacoes();
  mostrarPedidos();
}


// ---------- Formulário de produto (novo / editar) ----------

// Guarda a foto escolhida (imagem enviada ou caminho digitado)
let fotoEscolhida = '';

function definirFoto(foto) {
  fotoEscolhida = foto;
  if (foto) {
    $('prod-preview').innerHTML = `<img src="${esc(enderecoDaFoto(foto))}" alt="Prévia da foto">`;
  } else {
    $('prod-preview').textContent = 'Sem foto';
  }
}

function abrirFormulario(produto) {
  const editando = Boolean(produto);
  const p = produto || { id: '', sku: '', nome: '', categoria: CATEGORIAS[0], quantidade: 0, minimo: 0, custo: 0, preco: 0, local: '', foto: '' };

  $('titulo-produto').textContent = editando ? 'Editar produto' : 'Novo produto';
  $('prod-id').value = p.id;
  $('prod-sku').value = p.sku;
  $('prod-nome').value = p.nome;
  $('prod-categoria').value = p.categoria;
  $('prod-quantidade').value = p.quantidade;
  $('prod-quantidade').disabled = editando; // a quantidade só muda por movimentação
  $('prod-minimo').value = p.minimo;
  $('prod-custo').value = p.custo;
  $('prod-preco').value = p.preco;
  $('prod-local').value = p.local;
  $('prod-arquivo').value = '';
  $('prod-foto').value = p.foto.startsWith('data:') ? '' : p.foto;
  definirFoto(p.foto);

  $('dialog-produto').showModal();
}

async function salvarProduto(evento) {
  evento.preventDefault();

  const id = $('prod-id').value;
  const dados = {
    sku: $('prod-sku').value.trim(),
    nome: $('prod-nome').value.trim(),
    categoria: $('prod-categoria').value,
    quantidade: Number($('prod-quantidade').value),
    minimo: Number($('prod-minimo').value),
    custo: Number($('prod-custo').value),
    preco: Number($('prod-preco').value),
    local: $('prod-local').value.trim(),
    foto: fotoEscolhida
  };

  // Com id = editar; sem id = cadastrar
  const deuCerto = id
    ? await enviarParaServidor('/api/produtos/' + id, 'PUT', dados)
    : await enviarParaServidor('/api/produtos', 'POST', dados);

  if (deuCerto) {
    $('dialog-produto').close();
    carregarDados();
  }
}

async function excluirProduto(id) {
  const produto = buscarProduto(id);
  if (!confirm(`Excluir "${produto.nome}"? O histórico de movimentações será mantido.`)) return;

  const resposta = await fetch('/api/produtos/' + id, { method: 'DELETE' });
  if (resposta.status === 401) {
    window.location.href = '/admin/login';
    return;
  }
  carregarDados();
}

// Diminui a imagem enviada (máx. 600px) para não pesar no banco
function reduzirImagem(arquivo) {
  return new Promise((pronto, falhou) => {
    const imagem = new Image();
    imagem.onerror = falhou;
    imagem.onload = () => {
      const escala = Math.min(1, 600 / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
      pronto(canvas.toDataURL('image/jpeg', 0.8));
    };
    imagem.src = URL.createObjectURL(arquivo);
  });
}


// ---------- Registrar movimentação ----------

async function registrarMovimentacao(evento) {
  evento.preventDefault();

  const dados = {
    produtoId: Number($('mov-produto').value),
    tipo: $('mov-tipo').value,
    quantidade: Number($('mov-quantidade').value),
    observacao: $('mov-obs').value.trim()
  };

  if (await enviarParaServidor('/api/movimentos', 'POST', dados)) {
    $('form-movimento').reset();
    carregarDados();
  }
}

// Botões Venda/Entrada/Saída do cartão: abrem o formulário já preenchido
function prepararMovimentacao(id, tipo) {
  mostrarAba('movimentacoes');
  $('mov-produto').value = id;
  $('mov-tipo').value = tipo;
  $('mov-quantidade').focus();
}


// ---------- Ligando os botões e campos ----------

$('novo-produto').addEventListener('click', () => abrirFormulario(null));
$('cancelar-produto').addEventListener('click', () => $('dialog-produto').close());
$('form-produto').addEventListener('submit', salvarProduto);
$('form-movimento').addEventListener('submit', registrarMovimentacao);
$('busca').addEventListener('input', mostrarProdutos);
$('filtro-categoria').addEventListener('change', mostrarProdutos);
$('fat-periodo').addEventListener('change', mostrarFaturamento);

// Foto por caminho/URL digitado
$('prod-foto').addEventListener('input', () => definirFoto($('prod-foto').value.trim()));

// Foto enviada do computador
$('prod-arquivo').addEventListener('change', async () => {
  const arquivo = $('prod-arquivo').files[0];
  if (!arquivo) return;
  try {
    $('prod-foto').value = '';
    definirFoto(await reduzirImagem(arquivo));
  } catch (e) {
    alert('Não foi possível carregar esta imagem.');
  }
});

$('remover-foto').addEventListener('click', () => {
  $('prod-arquivo').value = '';
  $('prod-foto').value = '';
  definirFoto('');
});

// Menu lateral
document.querySelectorAll('.menu-lateral a').forEach((link) => {
  link.addEventListener('click', (evento) => {
    evento.preventDefault();
    mostrarAba(link.dataset.aba);
  });
});

// Botões dos cartões de produto
$('grid-produtos').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;

  if (acao === 'editar') abrirFormulario(buscarProduto(id));
  else if (acao === 'excluir') excluirProduto(id);
  else prepararMovimentacao(id, acao); // venda, entrada ou saída
});


// ---------- Início ----------

const opcoesDeCategoria = CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join('');
$('filtro-categoria').innerHTML = '<option value="">Todas as categorias</option>' + opcoesDeCategoria;
$('prod-categoria').innerHTML = opcoesDeCategoria;

mostrarAba(location.hash.replace('#', ''));
carregarDados();
