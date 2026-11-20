// =============================================================
// TechnoCaixa - Controle de estoque e faturamento
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

// Controle de escala (zoom) independente dos eixos X e Y do gráfico
let zoomX = 1;
let zoomY = 1;
const ZOOM_X_MIN = 0.6;
const ZOOM_X_MAX = 2.4;
const ZOOM_Y_MIN = 0.6;
const ZOOM_Y_MAX = 2.2;
const PASSO_ZOOM = 0.2;

// Controle de atualização automática em tempo real (sem precisar apertar F5)
let ultimaVersaoAdmin = '';
let verificandoAdmin = false;
let temporizadorToast = null;
const INTERVALO_ATUALIZACAO_MS = 4000;
const CANAL_SYNC_NOME = 'technocaixa_sync';
const CHAVE_SYNC_LOCAL = 'technocaixa_sync_ping';
const canalSync = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL_SYNC_NOME) : null;

function notificarOutrasAbas(tipo) {
  const evento = { origem: 'admin', tipo, momento: Date.now() };
  try {
    if (canalSync) canalSync.postMessage(evento);
    localStorage.setItem(CHAVE_SYNC_LOCAL, JSON.stringify(evento));
  } catch (e) {
    // Ignora caso o navegador bloqueie o armazenamento local
  }
}

function mostrarToast(mensagem, icone) {
  let toast = $('toast-atualizacao');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-atualizacao';
    toast.className = 'toast-atualizacao';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerHTML = (icone ? `<i class="bi ${icone}"></i> ` : '') + esc(mensagem);
  toast.classList.add('visivel');
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toast.classList.remove('visivel');
  }, 3000);
}


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
  const resultado = await resposta.json();

  if (!resposta.ok) {
    alert(resultado.erro || 'Erro ao salvar no banco de dados.');
    return false;
  }
  return true;
}

// Busca produtos, movimentações e pedidos no banco e redesenha a página
async function carregarDados(opcoes = {}) {
  const qtdPedidosAntes = pedidos.length;
  const jaTinhaDados = Boolean(ultimaVersaoAdmin);

  try {
    const resposta = await fetch('/api/estoque', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Falha ao buscar dados do estoque');

    const dados = await resposta.json();
    const mudouVersao = jaTinhaDados && dados.versao && dados.versao !== ultimaVersaoAdmin;

    produtos = dados.produtos || [];
    movimentos = dados.movimentos || [];
    pedidos = dados.pedidos || [];
    if (dados.versao) ultimaVersaoAdmin = dados.versao;

    mostrarTudo();

    if (opcoes.avisarSeMudou && mudouVersao) {
      if (pedidos.length > qtdPedidosAntes) {
        mostrarToast('Novo pedido recebido na vitrine!', 'bi-bell-fill');
      } else {
        mostrarToast('Estoque e dados atualizados', 'bi-arrow-repeat');
      }
    }
  } catch (e) {
    if (!opcoes.silencioso) {
      alert('Não foi possível carregar os dados do banco.');
    }
  }
}

async function verificarAtualizacaoAdmin(forcar = false) {
  if (verificandoAdmin) return;
  if (!forcar && document.visibilityState !== 'visible') return;

  verificandoAdmin = true;
  try {
    const resposta = await fetch('/api/versao', { cache: 'no-store' });
    if (!resposta.ok) return;
    const dados = await resposta.json();
    if (!dados.admin) return;

    if (!ultimaVersaoAdmin) {
      ultimaVersaoAdmin = dados.admin;
      return;
    }

    if (forcar || dados.admin !== ultimaVersaoAdmin) {
      await carregarDados({ silencioso: true, avisarSeMudou: true });
    }
  } catch (e) {
    // Falha momentânea de rede é ignorada na verificação em segundo plano
  } finally {
    verificandoAdmin = false;
  }
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

  // Redesenha o gráfico quando a aba fica visível para ler a largura real do contêiner
  if (nome === 'faturamento') {
    mostrarFaturamento();
  }
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

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

// Monta os pontos do eixo X de acordo com o período selecionado
function montarSerieDoGrafico() {
  const diasPeriodo = Number($('fat-periodo').value);
  const vendas = movimentos.filter((m) => m.tipo === 'venda');
  const hoje = inicioDoDia(new Date());

  const titulos = {
    7: 'Faturamento dos últimos 7 dias',
    30: 'Faturamento dos últimos 30 dias',
    90: 'Faturamento dos últimos 90 dias',
    0: 'Faturamento de todo o período'
  };

  let modo = 'dias';
  let totalDias = diasPeriodo;

  if (diasPeriodo === 0) {
    if (vendas.length === 0) {
      totalDias = 7;
    } else {
      const menorData = Math.min(...vendas.map((v) => inicioDoDia(new Date(v.data)).getTime()));
      const diffDias = Math.floor((hoje.getTime() - menorData) / (24 * 60 * 60 * 1000)) + 1;
      if (diffDias <= 31) {
        modo = 'dias';
        totalDias = Math.max(7, diffDias);
      } else if (diffDias <= 120) {
        modo = 'semanas';
        totalDias = diffDias;
      } else {
        modo = 'meses';
      }
    }
  } else if (diasPeriodo > 31) {
    modo = 'semanas';
  }

  const pontos = [];

  if (modo === 'dias') {
    const somaPorDia = {};
    vendas.forEach((m) => {
      const chave = inicioDoDia(new Date(m.data)).toDateString();
      somaPorDia[chave] = (somaPorDia[chave] || 0) + m.valor;
    });

    for (let i = totalDias - 1; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const formato = totalDias <= 7
        ? { weekday: 'short', day: '2-digit' }
        : { day: '2-digit', month: '2-digit' };
      pontos.push({
        rotulo: dia.toLocaleDateString('pt-BR', formato),
        total: somaPorDia[dia.toDateString()] || 0
      });
    }
    return { titulo: titulos[diasPeriodo] || titulos[0], unidade: 'dias', pontos };
  }

  if (modo === 'semanas') {
    const numSemanas = Math.max(2, Math.ceil(totalDias / 7));
    for (let s = numSemanas - 1; s >= 0; s--) {
      const fimSemana = new Date(hoje);
      fimSemana.setDate(hoje.getDate() - s * 7);
      fimSemana.setHours(23, 59, 59, 999);

      const iniSemana = new Date(fimSemana);
      iniSemana.setDate(fimSemana.getDate() - 6);
      iniSemana.setHours(0, 0, 0, 0);

      let total = 0;
      vendas.forEach((m) => {
        const t = new Date(m.data).getTime();
        if (t >= iniSemana.getTime() && t <= fimSemana.getTime()) {
          total += m.valor;
        }
      });

      const rotuloIni = iniSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      pontos.push({ rotulo: `Sem ${rotuloIni}`, total });
    }
    return { titulo: titulos[diasPeriodo] || titulos[0], unidade: 'semanas', pontos };
  }

  // Agrupamento mensal quando "Todo o período" ultrapassa 120 dias
  const menorData = new Date(Math.min(...vendas.map((v) => new Date(v.data).getTime())));
  const cursor = new Date(menorData.getFullYear(), menorData.getMonth(), 1);
  const limiteMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  while (cursor <= limiteMes) {
    const ano = cursor.getFullYear();
    const mes = cursor.getMonth();
    let total = 0;
    vendas.forEach((m) => {
      const d = new Date(m.data);
      if (d.getFullYear() === ano && d.getMonth() === mes) {
        total += m.valor;
      }
    });
    const rotuloMes = cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    pontos.push({ rotulo: rotuloMes, total });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return { titulo: titulos[0], unidade: 'meses', pontos };
}

// Calcula degraus redondos para o eixo Y de acordo com a grandeza do maior valor
function calcularEscalaY(maiorReal, divisoesDesejadas) {
  if (maiorReal <= 0) {
    return { teto: 100, passo: 25, linhas: 4 };
  }

  const passoBruto = (maiorReal * 1.08) / Math.max(2, divisoesDesejadas);
  const potencia = Math.pow(10, Math.floor(Math.log10(passoBruto)));
  const fracao = passoBruto / potencia;

  let multiplicador = 10;
  if (fracao <= 1) multiplicador = 1;
  else if (fracao <= 2) multiplicador = 2;
  else if (fracao <= 2.5) multiplicador = 2.5;
  else if (fracao <= 5) multiplicador = 5;

  const passo = multiplicador * potencia;
  const teto = Math.ceil((maiorReal * 1.05) / passo) * passo;
  const linhas = Math.max(2, Math.round(teto / passo));

  return { teto, passo, linhas };
}

// Atualiza os textos e botões dos controles manuais de escala
function atualizarControlesZoom() {
  if (!$('zoom-x-valor')) return;
  $('zoom-x-valor').textContent = Math.round(zoomX * 100) + '%';
  $('zoom-y-valor').textContent = Math.round(zoomY * 100) + '%';
  $('zoom-x-menos').disabled = zoomX <= ZOOM_X_MIN + 0.01;
  $('zoom-x-mais').disabled = zoomX >= ZOOM_X_MAX - 0.01;
  $('zoom-y-menos').disabled = zoomY <= ZOOM_Y_MIN + 0.01;
  $('zoom-y-mais').disabled = zoomY >= ZOOM_Y_MAX - 0.01;
}

// Desenha o gráfico de linha com escala e dimensões proporcionais aos eixos X e Y
function desenharGrafico(pontos, larguraDisponivel) {
  const maiorReal = Math.max(...pontos.map((p) => p.total), 0);
  const divisoesY = Math.min(8, Math.max(3, Math.round(4 * zoomY)));
  const escala = calcularEscalaY(maiorReal, divisoesY);

  // Altura automática conforme a grandeza dos valores em Y + zoom manual
  let alturaBase = 290;
  if (maiorReal <= 1000) alturaBase = 240;
  else if (maiorReal <= 20000) alturaBase = 290;
  else if (maiorReal <= 100000) alturaBase = 340;
  else alturaBase = 390;

  const altura = Math.min(820, Math.max(190, Math.round(alturaBase * zoomY)));

  // Margem esquerda calculada pelo maior rótulo do eixo Y (sem cortar cifras altas)
  const maiorRotuloY = 'R$ ' + Math.round(escala.teto).toLocaleString('pt-BR');
  const esquerda = Math.max(88, Math.ceil(maiorRotuloY.length * 7.8) + 22);

  // Margem direita calculada pelo maior texto exibido nos pontos (evita cortar "R$ 899,90")
  const textosPontos = pontos.filter((p) => p.total > 0).map((p) => dinheiro(p.total));
  const ultimoRotuloX = pontos.length ? pontos[pontos.length - 1].rotulo : '';
  const maiorTextoDireita = [...textosPontos, ultimoRotuloX].reduce(
    (maior, atual) => (atual.length > maior.length ? atual : maior),
    ''
  );
  const direita = Math.max(76, Math.ceil(maiorTextoDireita.length * 4.4) + 22);
  const topo = 42;
  const baixo = 48;

  // Largura automática conforme a quantidade de pontos no eixo X + zoom manual
  const larguraCaixa = larguraDisponivel || ($('grafico-dias') ? $('grafico-dias').clientWidth : 0) || 720;
  const espacoMinPorPonto = pontos.length <= 7 ? 95 : (pontos.length <= 15 ? 74 : 46);
  const larguraNatural = esquerda + direita + Math.max(1, pontos.length - 1) * espacoMinPorPonto;
  const larguraBase = Math.max(larguraCaixa - 4, larguraNatural);
  const largura = Math.max(460, Math.round(larguraBase * zoomX));

  const larguraUtil = largura - esquerda - direita;
  const alturaUtil = altura - topo - baixo;

  const posicaoX = (i) => {
    if (pontos.length <= 1) return esquerda + larguraUtil / 2;
    return esquerda + (i / (pontos.length - 1)) * larguraUtil;
  };
  const posicaoY = (valor) => topo + alturaUtil - (valor / escala.teto) * alturaUtil;

  let svg = `<svg width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de faturamento" class="plano">`;

  // Linhas de grade horizontais e rótulos redondos do eixo Y
  for (let k = 0; k <= escala.linhas; k++) {
    const valor = Math.min(escala.teto, escala.passo * k);
    const y = posicaoY(valor).toFixed(1);
    svg += `<line x1="${esquerda}" y1="${y}" x2="${largura - direita}" y2="${y}" class="grade"/>`;
    svg += `<text x="${esquerda - 10}" y="${y}" class="eixo-valor" text-anchor="end" dominant-baseline="middle">R$ ${Math.round(valor).toLocaleString('pt-BR')}</text>`;
  }

  // Eixos X e Y
  svg += `<line x1="${esquerda}" y1="${topo}" x2="${esquerda}" y2="${topo + alturaUtil}" class="eixo"/>`;
  svg += `<line x1="${esquerda}" y1="${topo + alturaUtil}" x2="${largura - direita}" y2="${topo + alturaUtil}" class="eixo"/>`;

  // Linha da série
  const coordenadas = pontos.map((p, i) => `${posicaoX(i).toFixed(1)},${posicaoY(p.total).toFixed(1)}`).join(' ');
  svg += `<polyline points="${coordenadas}" class="serie"/>`;

  // Controle para evitar sobreposição de rótulos no eixo X e valores acima dos pontos
  const espacoRealX = larguraUtil / Math.max(1, pontos.length - 1);
  const passoRotuloX = Math.max(1, Math.ceil(68 / espacoRealX));
  const ultimoIndice = pontos.length - 1;
  let ultimoXTextoValor = -999;
  let ultimoYTextoValor = -999;

  pontos.forEach((p, i) => {
    const xNum = posicaoX(i);
    const yNum = posicaoY(p.total);
    const x = xNum.toFixed(1);
    const y = yNum.toFixed(1);

    svg += `<circle cx="${x}" cy="${y}" r="5" class="ponto"><title>${esc(p.rotulo)}: ${dinheiro(p.total)}</title></circle>`;

    if (p.total > 0) {
      let deslocamentoY = 12;
      if (xNum - ultimoXTextoValor < 86 && Math.abs(yNum - ultimoYTextoValor) < 20) {
        deslocamentoY = 26;
      }
      const yTexto = (yNum - deslocamentoY).toFixed(1);
      svg += `<text x="${x}" y="${yTexto}" class="valor-ponto" text-anchor="middle">${dinheiro(p.total)}</text>`;
      ultimoXTextoValor = xNum;
      ultimoYTextoValor = yNum;
    }

    const ehUltimo = i === ultimoIndice;
    const pertoDoUltimo = !ehUltimo && (ultimoIndice - i) * espacoRealX < 56;
    if (ehUltimo || (i % passoRotuloX === 0 && !pertoDoUltimo)) {
      svg += `<text x="${x}" y="${topo + alturaUtil + 20}" class="eixo-valor" text-anchor="middle">${esc(p.rotulo)}</text>`;
    }
  });

  svg += '</svg>';
  return { svg, escala, largura, altura };
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

  const serie = montarSerieDoGrafico();
  $('titulo-grafico-fat').textContent = serie.titulo;

  const resultadoGrafico = desenharGrafico(serie.pontos);
  $('grafico-dias').innerHTML = resultadoGrafico.svg;
  $('legenda-grafico-fat').textContent =
    `Escala Y: R$ 0 até R$ ${Math.round(resultadoGrafico.escala.teto).toLocaleString('pt-BR')} · ` +
    `${serie.pontos.length} ${serie.unidade} no eixo X · Área ${resultadoGrafico.largura}×${resultadoGrafico.altura}px`;
  atualizarControlesZoom();

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
    await carregarDados({ silencioso: true });
    notificarOutrasAbas('estoque');
  }
}

async function excluirProduto(id) {
  const produto = buscarProduto(id);
  if (!confirm(`Excluir "${produto.nome}"? O histórico de movimentações será mantido.`)) return;

  const resposta = await fetch('/api/produtos/' + id, { method: 'DELETE' });
  if (!resposta.ok) {
    alert('Não foi possível excluir o produto.');
    return;
  }
  await carregarDados({ silencioso: true });
  notificarOutrasAbas('estoque');
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
    await carregarDados({ silencioso: true });
    notificarOutrasAbas('estoque');
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

// Controles manuais dos eixos X e Y do gráfico
function ajustarZoom(eixo, delta) {
  if (eixo === 'x') {
    zoomX = Math.min(ZOOM_X_MAX, Math.max(ZOOM_X_MIN, Math.round((zoomX + delta) * 10) / 10));
  } else {
    zoomY = Math.min(ZOOM_Y_MAX, Math.max(ZOOM_Y_MIN, Math.round((zoomY + delta) * 10) / 10));
  }
  mostrarFaturamento();
}

$('zoom-x-menos').addEventListener('click', () => ajustarZoom('x', -PASSO_ZOOM));
$('zoom-x-mais').addEventListener('click', () => ajustarZoom('x', PASSO_ZOOM));
$('zoom-y-menos').addEventListener('click', () => ajustarZoom('y', -PASSO_ZOOM));
$('zoom-y-mais').addEventListener('click', () => ajustarZoom('y', PASSO_ZOOM));
$('zoom-resetar').addEventListener('click', () => {
  zoomX = 1;
  zoomY = 1;
  mostrarFaturamento();
});

let temporizadorResize = null;
window.addEventListener('resize', () => {
  if ($('faturamento').hidden) return;
  clearTimeout(temporizadorResize);
  temporizadorResize = setTimeout(mostrarFaturamento, 150);
});

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


// ---------- Início e atualização automática ----------

if (canalSync) {
  canalSync.addEventListener('message', (evento) => {
    if (evento.data && evento.data.origem === 'vitrine') {
      carregarDados({ silencioso: true, avisarSeMudou: true });
    }
  });
}

window.addEventListener('storage', (evento) => {
  if (evento.key !== CHAVE_SYNC_LOCAL || !evento.newValue) return;
  try {
    const dados = JSON.parse(evento.newValue);
    if (dados.origem === 'vitrine') {
      carregarDados({ silencioso: true, avisarSeMudou: true });
    }
  } catch (e) {
    // Ignora JSON inválido
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    verificarAtualizacaoAdmin(false);
  }
});

window.addEventListener('focus', () => verificarAtualizacaoAdmin(false));
setInterval(() => verificarAtualizacaoAdmin(false), INTERVALO_ATUALIZACAO_MS);

const opcoesDeCategoria = CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join('');
$('filtro-categoria').innerHTML = '<option value="">Todas as categorias</option>' + opcoesDeCategoria;
$('prod-categoria').innerHTML = opcoesDeCategoria;

mostrarAba(location.hash.replace('#', ''));
carregarDados();
