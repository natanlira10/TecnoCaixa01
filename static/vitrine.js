// =============================================================
// TecnoCaixa - Vitrine de Vendas, Carrinho, Login e Pagamento Simulado
// =============================================================

const CATEGORIAS = ['Computadores', 'Monitores', 'Periféricos', 'Peças', 'Acessórios'];
const CHAVE_CARRINHO = 'tecnocaixa_carrinho';
const NOMES_PAGAMENTO = { pix: 'Pix', cartao: 'Cartão de Crédito', boleto: 'Boleto' };

let produtos = [];
let categoriaSelecionada = '';
let clienteLogado = null;
let carrinho = carregarCarrinho();
let continuarPagamentoAposLogin = false;

function $(id) {
  return document.getElementById(id);
}

function esc(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML.replace(/"/g, '&quot;');
}

function dinheiro(valor) {
  return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function enderecoDaFoto(foto) {
  if (!foto) return '';
  if (foto.startsWith('data:') || foto.startsWith('http') || foto.startsWith('/')) return encodeURI(foto);
  return '/' + encodeURI(foto);
}

function buscarProduto(id) {
  return produtos.find((p) => p.id === id);
}

// ---------- Carrinho salvo no navegador ----------

function carregarCarrinho() {
  try {
    const salvo = localStorage.getItem(CHAVE_CARRINHO);
    const lista = salvo ? JSON.parse(salvo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function salvarCarrinho() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  } catch (e) {
    // Ignora erro de armazenamento local
  }
  atualizarBadgeCarrinho();
}

function atualizarBadgeCarrinho() {
  const totalUnidades = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  $('vit-qtd-carrinho').textContent = totalUnidades;
}

function sincronizarCarrinhoComEstoque() {
  // Remove itens inativos/esgotados e ajusta se a quantidade passar do estoque atual
  carrinho = carrinho
    .map((item) => {
      const produto = buscarProduto(item.produtoId);
      if (!produto || produto.quantidade <= 0) return null;
      return {
        produtoId: produto.id,
        quantidade: Math.min(item.quantidade, produto.quantidade)
      };
    })
    .filter(Boolean);
  salvarCarrinho();
}

function adicionarAoCarrinho(produtoId, abrirCheckoutDireto) {
  const produto = buscarProduto(produtoId);
  if (!produto || produto.quantidade <= 0) {
    alert('Produto esgotado no momento.');
    return;
  }

  const existente = carrinho.find((item) => item.produtoId === produtoId);
  if (existente) {
    if (existente.quantidade >= produto.quantidade) {
      alert(`Temos apenas ${produto.quantidade} unidade(s) de "${produto.nome}" em estoque.`);
      return;
    }
    existente.quantidade += 1;
  } else {
    carrinho.push({ produtoId, quantidade: 1 });
  }

  salvarCarrinho();

  if (abrirCheckoutDireto) {
    iniciarPagamento();
  } else {
    desenharCarrinho();
    $('dialog-carrinho').showModal();
  }
}

function alterarQuantidadeCarrinho(produtoId, delta) {
  const item = carrinho.find((i) => i.produtoId === produtoId);
  const produto = buscarProduto(produtoId);
  if (!item || !produto) return;

  const novaQtd = item.quantidade + delta;
  if (novaQtd <= 0) {
    carrinho = carrinho.filter((i) => i.produtoId !== produtoId);
  } else if (novaQtd > produto.quantidade) {
    alert(`Estoque máximo disponível: ${produto.quantidade} unidade(s).`);
    return;
  } else {
    item.quantidade = novaQtd;
  }

  salvarCarrinho();
  desenharCarrinho();
}

function calcularTotalCarrinho() {
  return carrinho.reduce((soma, item) => {
    const produto = buscarProduto(item.produtoId);
    return soma + (produto ? produto.preco * item.quantidade : 0);
  }, 0);
}

function desenharCarrinho() {
  const container = $('carrinho-conteudo');
  if (carrinho.length === 0) {
    container.innerHTML = '<p class="ajuda-modal">Seu carrinho está vazio. Escolha um produto na vitrine!</p>';
    $('carrinho-total-valor').textContent = dinheiro(0);
    $('btn-ir-pagamento').disabled = true;
    return;
  }

  $('btn-ir-pagamento').disabled = false;
  container.innerHTML = carrinho
    .map((item) => {
      const p = buscarProduto(item.produtoId);
      if (!p) return '';
      const foto = p.foto
        ? `<img src="${esc(enderecoDaFoto(p.foto))}" alt="${esc(p.nome)}">`
        : '';
      return `
        <div class="item-carrinho">
          ${foto}
          <div class="item-carrinho-info">
            <h4>${esc(p.nome)}</h4>
            <p>${dinheiro(p.preco)} un. · Subtotal: <strong>${dinheiro(p.preco * item.quantidade)}</strong></p>
          </div>
          <div class="item-carrinho-controles">
            <button type="button" data-acao="diminuir" data-id="${p.id}">-</button>
            <span>${item.quantidade}</span>
            <button type="button" data-acao="aumentar" data-id="${p.id}">+</button>
            <button type="button" class="btn-remover-item" data-acao="remover" data-id="${p.id}" title="Remover">✕</button>
          </div>
        </div>`;
    })
    .join('');

  $('carrinho-total-valor').textContent = dinheiro(calcularTotalCarrinho());
}

// ---------- Vitrine de produtos ----------

function desenharCategorias() {
  const todas = [''].concat(CATEGORIAS);
  $('vit-categorias').innerHTML = todas
    .map((cat) => {
      const rotulo = cat || 'Todas';
      const ativa = categoriaSelecionada === cat ? 'ativa' : '';
      return `<button type="button" class="btn-categoria ${ativa}" data-cat="${esc(cat)}">${esc(rotulo)}</button>`;
    })
    .join('');
}

function cartaoVitrine(p) {
  const esgotado = p.quantidade <= 0;
  let seloClasse = 'disponivel';
  let seloTexto = `Em estoque (${p.quantidade} un.)`;
  if (esgotado) {
    seloClasse = 'esgotado';
    seloTexto = 'Esgotado';
  } else if (p.quantidade <= 3) {
    seloClasse = 'ultimas';
    seloTexto = `Últimas ${p.quantidade} un.`;
  }

  const foto = p.foto
    ? `<img src="${esc(enderecoDaFoto(p.foto))}" alt="${esc(p.nome)}" loading="lazy">`
    : '<span>Sem foto</span>';

  return `
    <article class="card-vitrine ${esgotado ? 'esgotado' : ''}">
      <div class="foto-vitrine">
        <span class="selo-estoque ${seloClasse}">${seloTexto}</span>
        ${foto}
      </div>
      <div class="corpo-vitrine">
        <p class="meta-produto">${esc(p.categoria)} · SKU ${esc(p.sku)}</p>
        <h3>${esc(p.nome)}</h3>
        <p class="preco-vitrine">${dinheiro(p.preco)}</p>
        <p class="parcelas-vitrine">ou 12x de ${dinheiro(p.preco / 12)} sem juros (simulado)</p>
      </div>
      <div class="acoes-card">
        <button type="button" class="btn-outline" data-acao="adicionar" data-id="${p.id}" ${esgotado ? 'disabled' : ''}>
          + Carrinho
        </button>
        <button type="button" class="btn-primario" data-acao="comprar" data-id="${p.id}" ${esgotado ? 'disabled' : ''}>
          ${esgotado ? 'Indisponível' : 'Comprar'}
        </button>
      </div>
    </article>`;
}

function mostrarVitrine() {
  const busca = $('vit-busca').value.trim().toLowerCase();
  const ordem = $('vit-ordem').value;

  let lista = produtos.filter((p) => {
    const passaBusca = `${p.nome} ${p.sku} ${p.categoria}`.toLowerCase().includes(busca);
    const passaCategoria = !categoriaSelecionada || p.categoria === categoriaSelecionada;
    return passaBusca && passaCategoria;
  });

  if (ordem === 'menor-preco') {
    lista = [...lista].sort((a, b) => a.preco - b.preco);
  } else if (ordem === 'maior-preco') {
    lista = [...lista].sort((a, b) => b.preco - a.preco);
  } else if (ordem === 'nome') {
    lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  $('vit-contador').textContent = `${lista.length} produto(s) encontrado(s)`;

  if (lista.length === 0) {
    $('vit-grid').innerHTML = '<div class="vazio">Nenhum produto encontrado para essa busca.</div>';
  } else {
    $('vit-grid').innerHTML = lista.map(cartaoVitrine).join('');
  }
}

async function carregarProdutos() {
  try {
    const resposta = await fetch('/api/vitrine/produtos');
    produtos = await resposta.json();
    sincronizarCarrinhoComEstoque();
    mostrarVitrine();
  } catch (e) {
    $('vit-grid').innerHTML = '<div class="vazio">Não foi possível carregar os produtos da vitrine.</div>';
  }
}

// ---------- Conta do Cliente ----------

function atualizarTopoCliente() {
  const area = $('area-cliente');
  if (clienteLogado) {
    const primeiroNome = clienteLogado.nome.split(' ')[0];
    area.innerHTML = `
      <span class="cliente-saudacao">Olá, <strong>${esc(primeiroNome)}</strong></span>
      <button type="button" class="btn-topo" id="btn-meus-pedidos">Meus pedidos</button>
      <button type="button" class="btn-topo" id="btn-cliente-sair">Sair</button>
    `;
    $('btn-meus-pedidos').addEventListener('click', abrirMeusPedidos);
    $('btn-cliente-sair').addEventListener('click', fazerLogoutCliente);
  } else {
    area.innerHTML = '<button type="button" class="btn-topo" id="btn-abrir-login">Entrar / Cadastrar</button>';
    $('btn-abrir-login').addEventListener('click', () => {
      continuarPagamentoAposLogin = false;
      abrirModalLogin('entrar');
    });
  }
}

async function carregarSessaoCliente() {
  try {
    const resposta = await fetch('/api/cliente/eu');
    const dados = await resposta.json();
    clienteLogado = dados.logado ? dados.cliente : null;
  } catch (e) {
    clienteLogado = null;
  }
  atualizarTopoCliente();
}

function alternarAbaAuth(aba) {
  const entrar = aba === 'entrar';
  $('tab-entrar').classList.toggle('ativa', entrar);
  $('tab-cadastrar').classList.toggle('ativa', !entrar);
  $('form-cliente-login').hidden = !entrar;
  $('form-cliente-cadastro').hidden = entrar;
  $('auth-aviso').hidden = true;
}

function abrirModalLogin(aba) {
  alternarAbaAuth(aba || 'entrar');
  $('dialog-login-cliente').showModal();
}

function mostrarErroAuth(mensagem) {
  $('auth-aviso').textContent = mensagem;
  $('auth-aviso').hidden = false;
}

async function enviarAuthCliente(url, payload) {
  $('auth-aviso').hidden = true;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarErroAuth(dados.erro || 'Não foi possível concluir o acesso.');
    return;
  }

  clienteLogado = dados.cliente;
  atualizarTopoCliente();
  $('dialog-login-cliente').close();

  if (continuarPagamentoAposLogin) {
    continuarPagamentoAposLogin = false;
    abrirModalPagamento();
  }
}

async function fazerLogoutCliente() {
  await fetch('/api/cliente/logout', { method: 'POST' });
  clienteLogado = null;
  atualizarTopoCliente();
}

// ---------- Pagamento Simulado e Pedidos ----------

function iniciarPagamento() {
  if (carrinho.length === 0) {
    alert('Adicione pelo menos um produto no carrinho antes de pagar.');
    return;
  }
  $('dialog-carrinho').close();

  if (!clienteLogado) {
    continuarPagamentoAposLogin = true;
    abrirModalLogin('entrar');
    mostrarErroAuth('Faça login ou crie sua conta para realizar o pagamento.');
    return;
  }

  abrirModalPagamento();
}

function abrirModalPagamento() {
  $('pag-formulario-etapa').hidden = false;
  $('pag-comprovante-etapa').hidden = true;
  $('pag-erro').hidden = true;

  $('pag-cliente-info').innerHTML =
    `Comprador: <strong>${esc(clienteLogado.nome)}</strong> (${esc(clienteLogado.email)})`;

  $('pag-lista-itens').innerHTML = carrinho
    .map((item) => {
      const p = buscarProduto(item.produtoId);
      if (!p) return '';
      return `<li>${item.quantidade}x ${esc(p.nome)} — <strong>${dinheiro(p.preco * item.quantidade)}</strong></li>`;
    })
    .join('');

  $('pag-total-valor').textContent = dinheiro(calcularTotalCarrinho());
  $('dialog-pagamento').showModal();
}

function atualizarDetalhesMetodoPagamento() {
  const selecionado = document.querySelector('input[name="formaPagamento"]:checked')?.value || 'pix';
  $('detalhes-pix').hidden = selecionado !== 'pix';
  $('detalhes-cartao').hidden = selecionado !== 'cartao';
  $('detalhes-boleto').hidden = selecionado !== 'boleto';
}

async function confirmarPagamentoSimulado(evento) {
  evento.preventDefault();
  $('pag-erro').hidden = true;

  const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked')?.value || 'pix';
  const endereco = $('pag-endereco').value.trim();
  const botao = $('btn-confirmar-pagamento');
  botao.disabled = true;

  try {
    const resposta = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itens: carrinho,
        formaPagamento,
        endereco
      })
    });
    const dados = await resposta.json();

    if (resposta.status === 401) {
      $('dialog-pagamento').close();
      clienteLogado = null;
      atualizarTopoCliente();
      continuarPagamentoAposLogin = true;
      abrirModalLogin('entrar');
      mostrarErroAuth(dados.erro || 'Faça login para finalizar sua compra.');
      botao.disabled = false;
      return;
    }

    if (!resposta.ok) {
      $('pag-erro').textContent = dados.erro || 'Não foi possível concluir o pedido.';
      $('pag-erro').hidden = false;
      botao.disabled = false;
      await carregarProdutos();
      return;
    }

    // Limpa carrinho e recarrega produtos para atualizar estoque na vitrine
    carrinho = [];
    salvarCarrinho();
    await carregarProdutos();

    // Mostra comprovante da compra simulada
    $('pag-formulario-etapa').hidden = true;
    $('pag-comprovante-etapa').hidden = false;
    $('comp-codigo').textContent = `Código do pedido: ${dados.codigo}`;
    $('comp-detalhes').textContent =
      `Pagamento via ${NOMES_PAGAMENTO[dados.formaPagamento] || dados.formaPagamento} · Total: ${dinheiro(dados.total)}`;
    $('comp-itens').innerHTML = dados.itens
      .map((i) => `<li>${i.quantidade}x ${esc(i.produtoNome)} — ${dinheiro(i.subtotal)}</li>`)
      .join('');
  } catch (e) {
    $('pag-erro').textContent = 'Erro de conexão com o servidor.';
    $('pag-erro').hidden = false;
  }

  botao.disabled = false;
}

async function abrirMeusPedidos() {
  const lista = $('lista-meus-pedidos');
  lista.innerHTML = '<p class="ajuda-modal">Carregando seus pedidos...</p>';
  $('dialog-meus-pedidos').showModal();

  try {
    const resposta = await fetch('/api/cliente/pedidos');
    if (resposta.status === 401) {
      $('dialog-meus-pedidos').close();
      abrirModalLogin('entrar');
      return;
    }
    const pedidos = await resposta.json();

    if (pedidos.length === 0) {
      lista.innerHTML = '<p class="ajuda-modal">Você ainda não realizou nenhum pedido simulado.</p>';
      return;
    }

    lista.innerHTML = pedidos
      .map((ped) => `
        <div class="card-pedido-cliente">
          <div class="card-pedido-topo">
            <strong>${esc(ped.codigo)} · ${new Date(ped.data).toLocaleString('pt-BR')}</strong>
            <span class="selo-aprovado">Aprovado (${esc(NOMES_PAGAMENTO[ped.formaPagamento] || ped.formaPagamento)})</span>
          </div>
          <ul class="lista-resumo-pag">
            ${ped.itens.map((i) => `<li>${i.quantidade}x ${esc(i.produtoNome)} (${dinheiro(i.subtotal)})</li>`).join('')}
          </ul>
          <strong>Total: ${dinheiro(ped.total)}</strong>
        </div>`)
      .join('');
  } catch (e) {
    lista.innerHTML = '<p class="ajuda-modal">Não foi possível carregar seus pedidos.</p>';
  }
}

// ---------- Eventos da página ----------

$('vit-busca').addEventListener('input', mostrarVitrine);
$('vit-ordem').addEventListener('change', mostrarVitrine);

$('vit-categorias').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-cat]');
  if (!botao) return;
  categoriaSelecionada = botao.dataset.cat;
  desenharCategorias();
  mostrarVitrine();
});

$('vit-grid').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;
  if (acao === 'adicionar') adicionarAoCarrinho(id, false);
  if (acao === 'comprar') adicionarAoCarrinho(id, true);
});

$('btn-abrir-carrinho').addEventListener('click', () => {
  desenharCarrinho();
  $('dialog-carrinho').showModal();
});

$('btn-limpar-carrinho').addEventListener('click', () => {
  carrinho = [];
  salvarCarrinho();
  desenharCarrinho();
});

$('carrinho-conteudo').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;
  if (acao === 'aumentar') alterarQuantidadeCarrinho(id, 1);
  if (acao === 'diminuir') alterarQuantidadeCarrinho(id, -1);
  if (acao === 'remover') alterarQuantidadeCarrinho(id, -999999);
});

$('btn-ir-pagamento').addEventListener('click', iniciarPagamento);

$('tab-entrar').addEventListener('click', () => alternarAbaAuth('entrar'));
$('tab-cadastrar').addEventListener('click', () => alternarAbaAuth('cadastrar'));

$('form-cliente-login').addEventListener('submit', (evento) => {
  evento.preventDefault();
  enviarAuthCliente('/api/cliente/login', {
    email: $('login-email').value.trim(),
    senha: $('login-senha').value
  });
});

$('form-cliente-cadastro').addEventListener('submit', (evento) => {
  evento.preventDefault();
  enviarAuthCliente('/api/cliente/cadastro', {
    nome: $('cad-nome').value.trim(),
    email: $('cad-email').value.trim(),
    senha: $('cad-senha').value
  });
});

document.querySelectorAll('input[name="formaPagamento"]').forEach((radio) => {
  radio.addEventListener('change', atualizarDetalhesMetodoPagamento);
});

$('form-pagamento').addEventListener('submit', confirmarPagamentoSimulado);

$('btn-voltar-carrinho').addEventListener('click', () => {
  $('dialog-pagamento').close();
  desenharCarrinho();
  $('dialog-carrinho').showModal();
});

$('btn-continuar-comprando').addEventListener('click', () => $('dialog-pagamento').close());

$('btn-ver-pedidos-pos-compra').addEventListener('click', () => {
  $('dialog-pagamento').close();
  abrirMeusPedidos();
});

document.querySelectorAll('[data-fechar]').forEach((botao) => {
  botao.addEventListener('click', () => $(botao.dataset.fechar).close());
});

// ---------- Início ----------

desenharCategorias();
atualizarBadgeCarrinho();
carregarSessaoCliente();
carregarProdutos();
