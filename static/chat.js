// =============================================================
// TechnoCaixa - Widget de Chatbot com IA (Vitrine e Painel Admin)
//
// Basta colocar <div id="chatbot-widget" data-modo="vitrine">
// ou <div id="chatbot-widget" data-modo="admin"> na página.
// =============================================================

(function () {
  const raiz = document.getElementById('chatbot-widget');
  if (!raiz) return;

  const modo = raiz.dataset.modo === 'admin' ? 'admin' : 'vitrine';
  const chaveSessao = 'tc_chat_historico_' + modo;

  const CONFIG_MODOS = {
    vitrine: {
      endpoint: '/api/chat/vitrine',
      icone: '<i class="bi bi-chat-dots-fill"></i>',
      avatar: '<i class="bi bi-lightning-charge-fill"></i>',
      titulo: 'Caio · Assistente TechnoCaixa',
      subtitulo: 'Online · Loja e produtos',
      dicaBotao: 'Abrir chat da loja TechnoCaixa',
      placeholder: 'Pergunte sobre placas, teclados, preços...',
      boasVindas:
        'E aí! Sou o **Caio**, assistente virtual da **TechnoCaixa**!\n' +
        'Posso te mostrar o estoque atualizado de placas de vídeo, teclados, monitores, PCs e explicar como comprar por aqui. ' +
        'Lembrando que eu só respondo sobre a **TechnoCaixa**, beleza?',
      sugestoes: [
        'Quais placas de vídeo têm?',
        'Teclados disponíveis',
        'Como faço para comprar?'
      ]
    },
    admin: {
      endpoint: '/api/chat/admin',
      icone: '<i class="bi bi-bar-chart-line-fill"></i>',
      avatar: '<i class="bi bi-robot"></i>',
      titulo: 'Analista IA · TechnoCaixa',
      subtitulo: 'Online · Estoque e estatísticas',
      dicaBotao: 'Abrir analista técnico de estoque',
      placeholder: 'Consulte estoque, reposição, lucro...',
      boasVindas:
        'Olá! Sou o **Analista Técnico da TechnoCaixa**.\n' +
        'Forneço métricas em tempo real sobre estoque, itens abaixo do mínimo, faturamento, lucro e movimentações. ' +
        'Atendo exclusivamente consultas sobre o **TechnoCaixa**.',
      sugestoes: [
        'Resumo geral do estoque',
        'Produtos com estoque baixo',
        'Faturamento e lucro atual'
      ]
    }
  };

  const cfg = CONFIG_MODOS[modo];
  let historico = carregarHistorico();
  let enviando = false;

  // Protege o texto contra tags HTML antes de exibir na tela
  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
  }

  // Converte apenas **negrito** e quebras de linha com segurança
  function formatarMensagem(texto) {
    return escaparHtml(texto)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function carregarHistorico() {
    try {
      const salvo = sessionStorage.getItem(chaveSessao);
      const lista = salvo ? JSON.parse(salvo) : [];
      if (Array.isArray(lista) && lista.length > 0) return lista.slice(-16);
    } catch (e) {
      // Se sessionStorage falhar, começa conversa limpa
    }
    return [{ autor: 'bot', texto: cfg.boasVindas }];
  }

  function salvarHistorico() {
    try {
      sessionStorage.setItem(chaveSessao, JSON.stringify(historico.slice(-16)));
    } catch (e) {
      // Ignora erro de cota do navegador
    }
  }

  // Monta a estrutura HTML do widget dentro do contêiner
  raiz.className = 'tc-chat tc-chat--' + modo;
  raiz.innerHTML = `
    <div class="tc-chat-janela" id="tc-chat-janela" hidden aria-live="polite">
      <div class="tc-chat-topo">
        <div class="tc-chat-perfil">
          <div class="tc-chat-avatar">${cfg.avatar}</div>
          <div>
            <p class="tc-chat-titulo">${cfg.titulo}</p>
            <p class="tc-chat-subtitulo">${cfg.subtitulo}</p>
          </div>
        </div>
        <div class="tc-chat-acoes-topo">
          <button type="button" id="tc-chat-limpar" title="Reiniciar conversa"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button type="button" id="tc-chat-fechar" title="Fechar chat"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>

      <div class="tc-chat-sugestoes" id="tc-chat-sugestoes">
        ${cfg.sugestoes.map((s) => `<button type="button" class="tc-chat-chip">${escaparHtml(s)}</button>`).join('')}
      </div>

      <div class="tc-chat-mensagens" id="tc-chat-mensagens"></div>

      <form class="tc-chat-form" id="tc-chat-form">
        <input type="text" id="tc-chat-input" maxlength="800" placeholder="${cfg.placeholder}" autocomplete="off" required>
        <button type="submit" id="tc-chat-enviar">Enviar</button>
      </form>
    </div>

    <button type="button" class="tc-chat-bolinha" id="tc-chat-bolinha" aria-label="${cfg.dicaBotao}" title="${cfg.dicaBotao}">
      <span>${cfg.icone}</span>
      <span class="tc-chat-online" aria-hidden="true"></span>
    </button>
  `;

  const janela = document.getElementById('tc-chat-janela');
  const bolinha = document.getElementById('tc-chat-bolinha');
  const btnFechar = document.getElementById('tc-chat-fechar');
  const btnLimpar = document.getElementById('tc-chat-limpar');
  const listaMensagens = document.getElementById('tc-chat-mensagens');
  const form = document.getElementById('tc-chat-form');
  const campoInput = document.getElementById('tc-chat-input');
  const btnEnviar = document.getElementById('tc-chat-enviar');
  const boxSugestoes = document.getElementById('tc-chat-sugestoes');

  function desenharMensagens(digitando) {
    let html = historico
      .map((msg) => {
        const classe = msg.autor === 'usuario' ? 'tc-chat-bolha--usuario' : 'tc-chat-bolha--bot';
        return `<div class="tc-chat-bolha ${classe}">${formatarMensagem(msg.texto)}</div>`;
      })
      .join('');

    if (digitando) {
      html += '<div class="tc-chat-bolha tc-chat-bolha--bot tc-chat-bolha--digitando">Digitando...</div>';
    }

    listaMensagens.innerHTML = html;
    listaMensagens.scrollTop = listaMensagens.scrollHeight;
  }

  function alternarJanela(abrir) {
    const deveAbrir = typeof abrir === 'boolean' ? abrir : janela.hidden;
    janela.hidden = !deveAbrir;
    if (deveAbrir) {
      desenharMensagens(enviando);
      campoInput.focus();
    }
  }

  async function enviarPergunta(textoOriginal) {
    const texto = textoOriginal.trim();
    if (!texto || enviando) return;

    // Envia até as últimas 8 mensagens anteriores como contexto (sem a mensagem atual)
    const historicoParaApi = historico.slice(-8);

    historico.push({ autor: 'usuario', texto });
    salvarHistorico();
    campoInput.value = '';
    enviando = true;
    btnEnviar.disabled = true;
    desenharMensagens(true);

    try {
      const resposta = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: texto,
          historico: historicoParaApi
        })
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        historico.push({
          autor: 'bot',
          texto: dados.erro || 'Ops! Não consegui responder agora. Tente de novo em instantes.'
        });
      } else {
        historico.push({ autor: 'bot', texto: dados.resposta });
      }
    } catch (e) {
      historico.push({
        autor: 'bot',
        texto: 'Erro de conexão com o servidor da TechnoCaixa.'
      });
    }

    enviando = false;
    btnEnviar.disabled = false;
    salvarHistorico();
    desenharMensagens(false);
    campoInput.focus();
  }

  bolinha.addEventListener('click', () => alternarJanela());
  btnFechar.addEventListener('click', () => alternarJanela(false));

  btnLimpar.addEventListener('click', () => {
    historico = [{ autor: 'bot', texto: cfg.boasVindas }];
    salvarHistorico();
    desenharMensagens(false);
  });

  boxSugestoes.addEventListener('click', (evento) => {
    const chip = evento.target.closest('.tc-chat-chip');
    if (!chip) return;
    enviarPergunta(chip.textContent);
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    enviarPergunta(campoInput.value);
  });

  desenharMensagens(false);
})();
