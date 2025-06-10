class ThemeManager {
  constructor() {
    this.themeKey = 'api-ninja-theme';
    this.init();
  }

  init() {
    const savedTheme = localStorage.getItem(this.themeKey) || 'system';
    this.setTheme(savedTheme);

    const themeSelector = document.getElementById('themeSelector');
    themeSelector.value = savedTheme;
    themeSelector.addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem(this.themeKey) === 'system') this.applySystemTheme();
    });
  }

  setTheme(theme) {
    localStorage.setItem(this.themeKey, theme);

    if (theme === 'system') this.applySystemTheme();
    else this.applyTheme(theme);
  }

  applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(isDark ? 'dark' : 'light');
  }

  applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }
}

const API_ENDPOINTS = {
  jokes: 'https://api.api-ninjas.com/v1/jokes',
  quotes: 'https://api.api-ninjas.com/v1/quotes',
  facts: 'https://api.api-ninjas.com/v1/facts',
  cats: 'https://api.api-ninjas.com/v1/cats',
  dogs: 'https://api.api-ninjas.com/v1/dogs',
  cocktail: 'https://api.api-ninjas.com/v1/cocktail?name=margarita',
  exercises: 'https://api.api-ninjas.com/v1/exercises?muscle=biceps',
  nutrition: 'https://api.api-ninjas.com/v1/nutrition?query=1lb brisket and fries'
};

const GOOGLE_TRANSLATE_API = 'https://api.mymemory.translated.net/get';

class TranslationService {
  static async translateText(text, targetLang = 'pt') {
    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData) return data.responseData.translatedText;

      return await this.translateWithLibreTranslate(text, targetLang);
    } catch (error) {
      console.warn('Erro na tradução:', error);
      return text;
    }
  }

  static async translateWithLibreTranslate(text, targetLang = 'pt') {
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.warn('Erro na tradução com LibreTranslate:', error);
      return text;
    }
  }

  static async translateObject(obj) {
    if (typeof obj === 'string') return await this.translateText(obj);

    if (Array.isArray(obj)) {
      const translatedArray = [];
      for (const item of obj) translatedArray.push(await this.translateObject(item));
      return translatedArray;
    }

    if (typeof obj === 'object' && obj !== null) {
      const translatedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.shouldTranslateField(key) && typeof value === 'string') translatedObj[key] = await this.translateText(value);
        else if (typeof value === 'object') translatedObj[key] = await this.translateObject(value);
        else translatedObj[key] = value;
      }
      return translatedObj;
    }

    return obj;
  }

  static shouldTranslateField(fieldName) {
    const translatableFields = [
      'joke', 'quote', 'fact', 'text', 'description',
      'instructions', 'directions', 'category', 'author',
      'name', 'breed', 'temperament', 'characteristics'
    ];

    return translatableFields.includes(fieldName.toLowerCase());
  }
}

class APITester {
  constructor() {
    this.apiKeyStorage = 'api-ninja-key';
    this.translateStorage = 'api-ninja-translate';
    this.init();
    this.loadSavedData();
  }

  init() {
    this.setupEventListeners();
    this.initializeLucideIcons();
  }

  initializeLucideIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  setupEventListeners() {
    const testButton = document.getElementById('testButton');
    const apiKey = document.getElementById('apiKey');
    const apiSelect = document.getElementById('apiSelect');
    const translateToggle = document.getElementById('translateToggle');

    testButton.addEventListener('click', () => this.testAPI());

    apiKey.addEventListener('input', (e) => {
      localStorage.setItem(this.apiKeyStorage, e.target.value);
    });

    translateToggle.addEventListener('change', (e) => {
      localStorage.setItem(this.translateStorage, e.target.checked);
    });

    [apiKey, apiSelect].forEach(element => {
      element.addEventListener('input', () => this.updateTestButton());
    });
  }

  loadSavedData() {
    const savedKey = localStorage.getItem(this.apiKeyStorage);
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    const savedTranslate = localStorage.getItem(this.translateStorage);
    if (savedTranslate !== null) document.getElementById('translateToggle').checked = savedTranslate === 'true';

    this.updateTestButton();
  }

  updateTestButton() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiSelect = document.getElementById('apiSelect').value;
    const testButton = document.getElementById('testButton');

    testButton.disabled = !apiKey || !apiSelect;
  }

  async testAPI() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const selectedAPI = document.getElementById('apiSelect').value;
    const shouldTranslate = document.getElementById('translateToggle').checked;

    if (!apiKey || !selectedAPI) {
      this.showError('Por favor, selecione uma API e forneça sua chave.');
      return;
    }

    const endpoint = API_ENDPOINTS[selectedAPI];
    if (!endpoint) {
      this.showError('API selecionada não encontrada.');
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      let data = await response.json();

      if (shouldTranslate) {
        this.showTranslating();
        data = await TranslationService.translateObject(data);
      }

      this.showSuccess(data);

    } catch (error) {
      console.error('API Error:', error);
      this.showError(`Erro na requisição: ${error.message}`);
    }
  }

  showLoading() {
    const resultsSection = document.getElementById('resultsSection');
    const loadingState = document.getElementById('loadingState');
    const successState = document.getElementById('successState');
    const errorState = document.getElementById('errorState');

    resultsSection.classList.remove('hidden');
    loadingState.classList.remove('hidden');
    successState.classList.add('hidden');
    errorState.classList.add('hidden');

    loadingState.innerHTML = `
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
        <span class="text-gray-600 dark:text-gray-400">Buscando dados...</span>
      </div>
    `;

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showTranslating() {
    const loadingState = document.getElementById('loadingState');

    loadingState.innerHTML = `
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-3"></div>
        <span class="text-gray-600 dark:text-gray-400">Traduzindo conteúdo...</span>
      </div>
    `;
  } showSuccess(data) {
    const loadingState = document.getElementById('loadingState');
    const successState = document.getElementById('successState');
    const errorState = document.getElementById('errorState');
    const apiResult = document.getElementById('apiResult');
    const translateToggle = document.getElementById('translateToggle');

    loadingState.classList.add('hidden');
    successState.classList.remove('hidden');
    errorState.classList.add('hidden');

    let translationBadge = '';
    if (translateToggle.checked) {
      translationBadge = `
        <div class="mb-3">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <i data-lucide="languages" class="w-3 h-3 mr-1"></i>
            Traduzido para Português
          </span>
        </div>
      `;
    }

    apiResult.innerHTML = translationBadge + this.formatResult(data);

    this.initializeLucideIcons();
  }

  showError(message) {
    const loadingState = document.getElementById('loadingState');
    const successState = document.getElementById('successState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('resultsSection');

    resultsSection.classList.remove('hidden');
    loadingState.classList.add('hidden');
    successState.classList.add('hidden');
    errorState.classList.remove('hidden');

    errorMessage.textContent = message;

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  formatResult(data) {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item, index) => {
        return `
          <div class="mb-4 ${index > 0 ? 'border-t border-gray-200 dark:border-gray-600 pt-4' : ''}">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">${index + 1}</span>
              </div>
              <div class="flex-1">
                ${this.formatSingleItem(item)}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } 
    else if (typeof data === 'object' && data !== null) return this.formatSingleItem(data);
    else return `<div class="text-gray-600 dark:text-gray-300">${JSON.stringify(data, null, 2)}</div>`;
  }

  formatSingleItem(item) {
    if (typeof item === 'string') return `<p class="text-gray-800 dark:text-gray-200">${item}</p>`;

    let html = '';

    Object.entries(item).forEach(([key, value]) => {
      let displayKey = key.charAt(0).toUpperCase() + key.slice(1);
      let displayValue = value;

      switch (key.toLowerCase()) {
        case 'joke':
        case 'quote':
        case 'fact':
        case 'text':
          html += `
            <div class="mb-3">
              <blockquote class="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r">
                <p class="text-gray-800 dark:text-gray-200 italic">"${displayValue}"</p>
              </blockquote>
            </div>
          `;
          break;
        case 'author':
          html += `
            <div class="flex items-center mb-2">
              <i data-lucide="user" class="w-4 h-4 mr-2 text-gray-500"></i>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Autor: ${displayValue}</span>
            </div>
          `;
          break;
        case 'category':
          html += `
            <div class="flex items-center mb-2">
              <i data-lucide="tag" class="w-4 h-4 mr-2 text-gray-500"></i>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                ${displayValue}
              </span>
            </div>
          `;
          break;
        case 'name':
          html += `
            <div class="mb-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${displayValue}</h3>
            </div>
          `;
          break;
        case 'instructions':
        case 'directions':
          html += `
            <div class="mb-3">
              <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Instruções:</h4>
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p class="text-gray-700 dark:text-gray-300">${displayValue}</p>
              </div>
            </div>
          `;
          break;
        case 'ingredients':
          if (Array.isArray(displayValue)) {
            html += `
              <div class="mb-3">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredientes:</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  ${displayValue.map(ingredient => `<li>${ingredient}</li>`).join('')}
                </ul>
              </div>
            `;
          } else {
            html += `
              <div class="mb-3">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredientes:</h4>
                <p class="text-gray-600 dark:text-gray-400">${displayValue}</p>
              </div>
            `;
          }
          break;
        default:
          if (typeof displayValue === 'object') {
            html += `
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">${displayKey}:</span>
                <pre class="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto json-container">${JSON.stringify(displayValue, null, 2)}</pre>
              </div>
            `;
          } else {
            html += `
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">${displayKey}:</span>
                <span class="ml-2 text-gray-800 dark:text-gray-200">${displayValue}</span>
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
  new ThemeManager();
  new APITester();
});

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    const testButton = document.getElementById('testButton');
    if (!testButton.disabled) testButton.click();
  }
});