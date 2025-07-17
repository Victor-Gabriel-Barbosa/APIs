class GerenciadorTema {
  constructor() {
    this.chaveTema = 'api-ninja-theme';
    this.inicializar();
  }

  inicializar() {
    const temaSalvo = localStorage.getItem(this.chaveTema) || 'system';
    this.definirTema(temaSalvo);

    const seletorTema = document.getElementById('themeSelector');
    seletorTema.value = temaSalvo;
    seletorTema.addEventListener('change', (e) => {
      this.definirTema(e.target.value);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem(this.chaveTema) === 'system') this.aplicarTemaSistema();
    });
  }

  definirTema(tema) {
    localStorage.setItem(this.chaveTema, tema);

    if (tema === 'system') this.aplicarTemaSistema();
    else this.aplicarTema(tema);
  }

  aplicarTemaSistema() {
    const escuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.aplicarTema(escuro ? 'dark' : 'light');
  }

  aplicarTema(tema) {
    const html = document.documentElement;

    if (tema === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }
}

const ENDPOINTS_API = {
  jokes: 'https://api.api-ninjas.com/v1/jokes',
  quotes: 'https://api.api-ninjas.com/v1/quotes',
  facts: 'https://api.api-ninjas.com/v1/facts',
  cats: 'https://api.api-ninjas.com/v1/cats',
  dogs: 'https://api.api-ninjas.com/v1/dogs',
  cocktail: 'https://api.api-ninjas.com/v1/cocktail?name=margarita',
  exercises: 'https://api.api-ninjas.com/v1/exercises?muscle=biceps',
  nutrition: 'https://api.api-ninjas.com/v1/nutrition?query=1lb brisket and fries'
};

const API_GOOGLE_TRANSLATE = 'https://api.mymemory.translated.net/get';

class ServicoTraducao {
  static async traduzirTexto(texto, idiomaDestino = 'pt') {
    try {
      const resposta = await fetch(`${API_GOOGLE_TRANSLATE}?q=${encodeURIComponent(texto)}&langpair=en|${idiomaDestino}`);
      const dados = await resposta.json();

      if (dados.responseStatus === 200 && dados.responseData) return dados.responseData.translatedText;

      return await this.traduzirComLibreTranslate(texto, idiomaDestino);
    } catch (erro) {
      console.warn('Erro na tradução:', erro);
      return texto;
    }
  }

  static async traduzirComLibreTranslate(texto, idiomaDestino = 'pt') {
    try {
      const resposta = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: texto,
          source: 'en',
          target: idiomaDestino,
          format: 'text'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const dados = await resposta.json();
      return dados.translatedText || texto;
    } catch (erro) {
      console.warn('Erro na tradução com LibreTranslate:', erro);
      return texto;
    }
  }

  static async traduzirObjeto(obj) {
    if (typeof obj === 'string') return await this.traduzirTexto(obj);

    if (Array.isArray(obj)) {
      const arrayTraduzido = [];
      for (const item of obj) arrayTraduzido.push(await this.traduzirObjeto(item));
      return arrayTraduzido;
    }

    if (typeof obj === 'object' && obj !== null) {
      const objTraduzido = {};
      for (const [chave, valor] of Object.entries(obj)) {
        if (this.deveTraducirCampo(chave) && typeof valor === 'string') objTraduzido[chave] = await this.traduzirTexto(valor);
        else if (typeof valor === 'object') objTraduzido[chave] = await this.traduzirObjeto(valor);
        else objTraduzido[chave] = valor;
      }
      return objTraduzido;
    }

    return obj;
  }

  static deveTraducirCampo(nomeCampo) {
    const camposTraduziveis = [
      'joke', 'quote', 'fact', 'text', 'description',
      'instructions', 'directions', 'category', 'author',
      'name', 'breed', 'temperament', 'characteristics'
    ];

    return camposTraduziveis.includes(nomeCampo.toLowerCase());
  }
}

class TestadorAPI {
  constructor() {
    this.armazenamentoChaveApi = 'api-ninja-key';
    this.armazenamentoTraducao = 'api-ninja-translate';
    this.inicializar();
    this.carregarDadosSalvos();
  }

  inicializar() {
    this.configurarEventListeners();
    this.inicializarIconesLucide();
  }

  inicializarIconesLucide() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  configurarEventListeners() {
    const botaoTeste = document.getElementById('testButton');
    const chaveApi = document.getElementById('apiKey');
    const selecionarApi = document.getElementById('apiSelect');
    const alternadorTraducao = document.getElementById('translateToggle');

    botaoTeste.addEventListener('click', () => this.testarAPI());

    chaveApi.addEventListener('input', (e) => {
      localStorage.setItem(this.armazenamentoChaveApi, e.target.value);
    });

    alternadorTraducao.addEventListener('change', (e) => {
      localStorage.setItem(this.armazenamentoTraducao, e.target.checked);
    });

    [chaveApi, selecionarApi].forEach(elemento => {
      elemento.addEventListener('input', () => this.atualizarBotaoTeste());
    });
  }

  carregarDadosSalvos() {
    const chaveSalva = localStorage.getItem(this.armazenamentoChaveApi);
    if (chaveSalva) document.getElementById('apiKey').value = chaveSalva;

    const traducaoSalva = localStorage.getItem(this.armazenamentoTraducao);
    if (traducaoSalva !== null) document.getElementById('translateToggle').checked = traducaoSalva === 'true';

    this.atualizarBotaoTeste();
  }

  atualizarBotaoTeste() {
    const chaveApi = document.getElementById('apiKey').value.trim();
    const selecionarApi = document.getElementById('apiSelect').value;
    const botaoTeste = document.getElementById('testButton');

    botaoTeste.disabled = !chaveApi || !selecionarApi;
  }

  async testarAPI() {
    const chaveApi = document.getElementById('apiKey').value.trim();
    const apiSelecionada = document.getElementById('apiSelect').value;
    const deveTraducir = document.getElementById('translateToggle').checked;

    if (!chaveApi || !apiSelecionada) {
      this.mostrarErro('Por favor, selecione uma API e forneça sua chave.');
      return;
    }

    const endpoint = ENDPOINTS_API[apiSelecionada];
    if (!endpoint) {
      this.mostrarErro('API selecionada não encontrada.');
      return;
    }

    this.mostrarCarregando();

    try {
      const resposta = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-Api-Key': chaveApi,
          'Content-Type': 'application/json'
        }
      });

      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${resposta.statusText}`);

      let dados = await resposta.json();

      if (deveTraducir) {
        this.mostrarTraduzindo();
        dados = await ServicoTraducao.traduzirObjeto(dados);
      }

      this.mostrarSucesso(dados);

    } catch (erro) {
      console.error('Erro na API:', erro);
      this.mostrarErro(`Erro na requisição: ${erro.message}`);
    }
  }

  mostrarCarregando() {
    const secaoResultados = document.getElementById('resultsSection');
    const estadoCarregamento = document.getElementById('loadingState');
    const estadoSucesso = document.getElementById('successState');
    const estadoErro = document.getElementById('errorState');

    secaoResultados.classList.remove('hidden');
    estadoCarregamento.classList.remove('hidden');
    estadoSucesso.classList.add('hidden');
    estadoErro.classList.add('hidden');

    estadoCarregamento.innerHTML = `
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
        <span class="text-gray-600 dark:text-gray-400">Buscando dados...</span>
      </div>
    `;

    secaoResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  mostrarTraduzindo() {
    const estadoCarregamento = document.getElementById('loadingState');

    estadoCarregamento.innerHTML = `
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-3"></div>
        <span class="text-gray-600 dark:text-gray-400">Traduzindo conteúdo...</span>
      </div>
    `;
  }  mostrarSucesso(dados) {
    const estadoCarregamento = document.getElementById('loadingState');
    const estadoSucesso = document.getElementById('successState');
    const estadoErro = document.getElementById('errorState');
    const resultadoApi = document.getElementById('apiResult');
    const alternadorTraducao = document.getElementById('translateToggle');

    estadoCarregamento.classList.add('hidden');
    estadoSucesso.classList.remove('hidden');
    estadoErro.classList.add('hidden');

    let emblemaTraducao = '';
    if (alternadorTraducao.checked) {
      emblemaTraducao = `
        <div class="mb-3">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <i data-lucide="languages" class="w-3 h-3 mr-1"></i>
            Traduzido para Português
          </span>
        </div>
      `;
    }

    resultadoApi.innerHTML = emblemaTraducao + this.formatarResultado(dados);

    this.inicializarIconesLucide();
  }

  mostrarErro(mensagem) {
    const estadoCarregamento = document.getElementById('loadingState');
    const estadoSucesso = document.getElementById('successState');
    const estadoErro = document.getElementById('errorState');
    const mensagemErro = document.getElementById('errorMessage');
    const secaoResultados = document.getElementById('resultsSection');

    secaoResultados.classList.remove('hidden');
    estadoCarregamento.classList.add('hidden');
    estadoSucesso.classList.add('hidden');
    estadoErro.classList.remove('hidden');

    mensagemErro.textContent = mensagem;

    secaoResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  formatarResultado(dados) {
    if (Array.isArray(dados) && dados.length > 0) {
      return dados.map((item, indice) => {
        return `
          <div class="mb-4 ${indice > 0 ? 'border-t border-gray-200 dark:border-gray-600 pt-4' : ''}">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">${indice + 1}</span>
              </div>
              <div class="flex-1">
                ${this.formatarItemUnico(item)}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } 
    else if (typeof dados === 'object' && dados !== null) return this.formatarItemUnico(dados);
    else return `<div class="text-gray-600 dark:text-gray-300">${JSON.stringify(dados, null, 2)}</div>`;
  }

  formatarItemUnico(item) {
    if (typeof item === 'string') return `<p class="text-gray-800 dark:text-gray-200">${item}</p>`;

    let html = '';

    Object.entries(item).forEach(([chave, valor]) => {
      let chaveExibicao = chave.charAt(0).toUpperCase() + chave.slice(1);
      let valorExibicao = valor;

      switch (chave.toLowerCase()) {
        case 'joke':
        case 'quote':
        case 'fact':
        case 'text':
          html += `
            <div class="mb-3">
              <blockquote class="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r">
                <p class="text-gray-800 dark:text-gray-200 italic">"${valorExibicao}"</p>
              </blockquote>
            </div>
          `;
          break;
        case 'author':
          html += `
            <div class="flex items-center mb-2">
              <i data-lucide="user" class="w-4 h-4 mr-2 text-gray-500"></i>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Autor: ${valorExibicao}</span>
            </div>
          `;
          break;
        case 'category':
          html += `
            <div class="flex items-center mb-2">
              <i data-lucide="tag" class="w-4 h-4 mr-2 text-gray-500"></i>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                ${valorExibicao}
              </span>
            </div>
          `;
          break;
        case 'name':
          html += `
            <div class="mb-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${valorExibicao}</h3>
            </div>
          `;
          break;
        case 'instructions':
        case 'directions':
          html += `
            <div class="mb-3">
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Instruções:</h4>
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p class="text-gray-700 dark:text-gray-300">${valorExibicao}</p>
              </div>
            </div>
          `;
          break;
        case 'ingredients':
          if (Array.isArray(valorExibicao)) {
            html += `
              <div class="mb-3">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredientes:</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  ${valorExibicao.map(ingrediente => `<li>${ingrediente}</li>`).join('')}
                </ul>
              </div>
            `;
          } else {
            html += `
              <div class="mb-3">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredientes:</h4>
                <p class="text-gray-600 dark:text-gray-400">${valorExibicao}</p>
              </div>
            `;
          }
          break;
        default:
          if (typeof valorExibicao === 'object') {
            html += `
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">${chaveExibicao}:</span>
                <pre class="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto json-container">${JSON.stringify(valorExibicao, null, 2)}</pre>
              </div>
            `;
          } else {
            html += `
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">${chaveExibicao}:</span>
                <span class="ml-2 text-gray-800 dark:text-gray-200">${valorExibicao}</span>
              </div>
            `;
          }
          break;
      }
    });

    return html || `<pre class="json-container text-sm text-gray-600 dark:text-gray-300">${JSON.stringify(item, null, 2)}</pre>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GerenciadorTema();
  new TestadorAPI();
});

function copiarParaAreaTransferencia(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    console.log('Copiado para a área de transferência!');
  }).catch(err => {
    console.error('Falha ao copiar: ', err);
  });
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    const botaoTeste = document.getElementById('testButton');
    if (!botaoTeste.disabled) botaoTeste.click();
  }
});