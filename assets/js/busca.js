/* ======================================================
   VARIÁVEIS GLOBAIS
====================================================== */
let campoBusca, resultados, totalResultados;
let cacheImoveis = [];

let tagsAtivas = new Set();

let tipoAtivo = "todos";
let ordemAtiva = "inteligente";

/* ======================================================
   INIT
====================================================== */
window.addEventListener("DOMContentLoaded", async () => {
  campoBusca = document.getElementById("buscaTexto");
  resultados = document.getElementById("resultadoImoveis");
  totalResultados = document.getElementById("contadorResultados");

  await carregarImoveis();
  gerarTagsDinamicas();
  configurarEventos();
  filtrarImoveis();
});

/* ======================================================
   UTILIDADES
====================================================== */
const formatarMoeda = valor =>
  valor
    ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Valor sob consulta";


/* ======================================================
   CONTROLE AVANÇADO DE INTERAÇÃO & PRIORIDADE
====================================================== */

let usuarioInteragindo = false;
let buscaManualAtiva = false;

let scrollAcumulado = 0;
let ultimoScrollY = window.scrollY;

const LIMITE_SCROLL_CANCELA = 120; // px (ajustável)
const TEMPO_RESET_INTERACAO = 6500; // ms

let timeoutInteracao;

// Marca interação manual forte
function registrarInteracaoManual() {
  usuarioInteragindo = true;

  clearTimeout(timeoutInteracao);
  timeoutInteracao = setTimeout(() => {
    usuarioInteragindo = false;
    scrollAcumulado = 0;
  }, TEMPO_RESET_INTERACAO);
}

// Detectar rolagem real
window.addEventListener("scroll", () => {
  const atual = window.scrollY;
  const diferenca = Math.abs(atual - ultimoScrollY);

  scrollAcumulado += diferenca;
  ultimoScrollY = atual;

  if (scrollAcumulado > LIMITE_SCROLL_CANCELA) {
    registrarInteracaoManual();
  }
}, { passive: true });

// Outras interações
["wheel", "touchstart", "mousedown", "keydown"].forEach(evento => {
  window.addEventListener(evento, registrarInteracaoManual, { passive: true });
});

let scrollTimeout;

function scrollParaResultados() {
  clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {

    if (!resultados) return;

    const rect = resultados.getBoundingClientRect();

    const jaPassou = rect.top < 0;
    const jaVisivel =
      rect.top >= 0 && rect.bottom <= window.innerHeight;

    // ❌ Não força scroll se:
    // - Usuário interagiu forte
    // - Rolou mais que o limite
    // - Já passou dos resultados
    // - Já está vendo resultados
    if (
      usuarioInteragindo ||
      scrollAcumulado > LIMITE_SCROLL_CANCELA ||
      jaPassou ||
      jaVisivel
    ) {
      return;
    }

    // 💎 PRIORIDADE:
    // Só faz scroll se NÃO for busca manual ativa
    if (buscaManualAtiva) return;

    resultados.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }, 6500);
}
/* ======================================================
   CARREGAR IMÓVEIS
====================================================== */
async function carregarImoveis() {
  try {
    const res = await fetch("assets/json/dados-imoveis.json", { cache: "no-store" });
    const data = await res.json();

    cacheImoveis = data.map(imovel => {
  const categorias = (imovel.categoria || []).map(c => c.toLowerCase());
  const tags = (imovel.tags || []).map(t => t.toLowerCase());

  const textoBusca = [
    imovel.titulo,
    imovel.descricao,
    imovel.bairro,
    imovel.cidade,
    imovel.estado,
    ...tags,
    ...categorias
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    ...imovel,
    categorias,
    tags,
    textoBusca,
    matchTags: 0,
    score: 0
  };
});

  } catch (err) {
    console.error("Erro ao carregar imóveis:", err);
  }
}

/* ======================================================
   GERAR TAGS DINÂMICAS
====================================================== */
function gerarTagsDinamicas() {
  const container = document.getElementById("tagsDinamicas");
  if (!container) return;

  const todasTags = new Set();
  cacheImoveis.forEach(i => i.tags?.forEach(t => todasTags.add(t)));

  container.innerHTML = "";

  [...todasTags].sort().forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "tag-dinamica";
    btn.dataset.tag = tag.toLowerCase();
    btn.textContent = tag;

    btn.addEventListener("click", () => {
      const tagKey = btn.dataset.tag;

      if (tagsAtivas.has(tagKey)) {
        tagsAtivas.delete(tagKey);
        btn.classList.remove("ativo");
      } else {
        tagsAtivas.add(tagKey);
        btn.classList.add("ativo");
      }

      filtrarImoveis();
    });

    container.appendChild(btn);
  });
}


/* ======================================================
   CALCULAR RELEVÂNCIA
====================================================== */
function calcularRelevancia(termo, imovel) {
  let score = 0;

  if (termo) {
    termo.split(" ").forEach(p => {
      if (imovel.titulo?.toLowerCase().includes(p)) score += 5;
      if (imovel.bairro?.toLowerCase().includes(p)) score += 3;
      if (imovel.textoBusca.includes(p)) score += 1;
    });
  }

  score += imovel.matchTags * 10;

  if (imovel.patrocinado === "sim") score += 5;

  return score;
}


/* ======================================================
   FILTRAR IMÓVEIS
====================================================== */
function obterPrecoParaFiltro(imovel) {
  const { venda, aluguel } = imovel.valor || {};

  if (tipoAtivo === "venda") return venda ?? null;
  if (tipoAtivo === "aluguel") return aluguel ?? null;

  // todos → retorna array de valores válidos
  return [venda, aluguel].filter(v => typeof v === "number");
}


function getPrecoOrdenacao(imovel) {
  const { venda, aluguel } = imovel.valor || {};

  if (tipoAtivo === "venda") return venda ?? Infinity;
  if (tipoAtivo === "aluguel") return aluguel ?? Infinity;

  // TODOS → menor valor válido
  return Math.min(
    venda ?? Infinity,
    aluguel ?? Infinity
  );
}

function filtrarImoveis() {
  const termo = campoBusca?.value.toLowerCase().trim() || "";
  const min = parseFloat(document.getElementById("min")?.value);
const max = parseFloat(document.getElementById("max")?.value);

const quartos = parseInt(document.getElementById("quartos")?.value);
const banheiros = parseInt(document.getElementById("banheiros")?.value);


  // 💤 dorme se não houve uso do usuário
  if (
  !termo &&
  !tagsAtivas.size &&
  tipoAtivo === "todos" &&
  isNaN(min) &&
  isNaN(max) &&
  isNaN(quartos) &&
  isNaN(banheiros)
) {
  mostrarLoading();

  setTimeout(() => {
    resultados.innerHTML = "";
    atualizarTotalResultados(0);
    esconderLoading();
  }, 300);

  return;
}

mostrarLoading();
  

  let filtrados = cacheImoveis.filter(i => {
    if (
      tipoAtivo !== "todos" &&
      !i.categorias?.includes(tipoAtivo)
    ) return false;

    let matchTags = 0;

    if (tagsAtivas.size) {
      const intersecao = [...tagsAtivas].filter(tag =>
        i.tags.includes(tag)
      );

      i.matchTags = intersecao.length;

      if (i.matchTags === 0) return false;
    } else {
      i.matchTags = 0;
    }

    const precos = obterPrecoParaFiltro(i);

    if (Array.isArray(precos)) {
      // TODOS → pelo menos um valor dentro do range
      const valido = precos.some(p =>
        (isNaN(min) || p >= min) &&
        (isNaN(max) || p <= max)
      );
      if (!valido) return false;
    } else {
      // VENDA ou ALUGUEL
      if (precos == null) return false;
      if (!isNaN(min) && precos < min) return false;
      if (!isNaN(max) && precos > max) return false;
    }
    // FILTRO DE QUARTOS
    if (!isNaN(quartos)) {
      if (i.quartos == null || i.quartos < quartos) return false;
    }

    // FILTRO DE BANHEIROS
    if (!isNaN(banheiros)) {
      if (i.banheiros == null || i.banheiros < banheiros) return false;
    }

    return true;
  });

  if (termo) {
    const relevantes = [];
    const sugestoes = [];

    filtrados.forEach(i => {
      const score = calcularRelevancia(termo, i);
      if (score >= 3) relevantes.push({ ...i, score });
      else if (score > 0) sugestoes.push({ ...i, score });
    });

    relevantes.sort((a, b) => b.score - a.score);
    sugestoes.sort((a, b) => b.score - a.score);

    filtrados = [...relevantes, ...sugestoes];
  }

  switch (ordemAtiva) {
    case "menor":
      filtrados.sort(
        (a, b) => getPrecoOrdenacao(a) - getPrecoOrdenacao(b)
      );
      break;

    case "maior":
      filtrados.sort(
        (a, b) => getPrecoOrdenacao(b) - getPrecoOrdenacao(a)
      );
      break;

    case "recentes":
      filtrados.sort(
        (a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao)
      );
      break;
  }

  renderizarResultados(filtrados);
  atualizarTotalResultados(filtrados.length);

  esconderLoading();
  scrollParaResultados();
}

/* ======================================================
   RENDER IMÓVEIS
====================================================== */
function renderizarResultados(lista) {
  resultados.innerHTML = "";

  if (!lista.length) {
    resultados.innerHTML = "<p>Nenhum resultado encontrado. Tente novamente.</p>";
    return;
  }

  const frag = document.createDocumentFragment();

  lista.forEach(i => {
    const imgs = i.imagens?.length
      ? i.imagens
      : [i.imagemCapa];

    const img1 = imgs[0];
    const img2 = imgs[1] || imgs[0];
    const img3 = imgs[imgs.length - 1];

    const card = document.createElement("div");
    card.className = "imovel";

    card.innerHTML = `
  
      <div class="galeria-carrossel">
        <img src="${img1}">
        <img src="${img2}">
       <a href="/imovel/${i.slug}.html" target="_blank" class="ver-mais">
        <img src="${img3}" alt="${i.descricao}">
        <span>Ver + fotos</span>
        </a>

      </div>

      <h3>${i.titulo}</h3>
      <p>${i.descricao}</p>

      <div class="icones">
      <p><span class="material-symbols-outlined bathtub">bathtub</span>${i.banheiros}</p>
      <p><span class="material-symbols-outlined hotel">hotel</span>${i.quartos}</p>
      <p><span class="material-symbols-outlined garage">garage</span>${i.garagem}</p>
    
      </div>

      <div class="tipo">
  ${i.valor?.venda
    ? `<div>Venda: <strong>${formatarMoeda(i.valor.venda)}</strong></div>`
    : ""}

  ${i.valor?.aluguel
    ? `<div>Aluguel: <strong>${formatarMoeda(i.valor.aluguel)}</strong></div>`
    : ""}

      <a href="/imovel/${i.slug}.html" target="_blank" rel="noopener noreferrer" class="card-btn">
      Ver Detalhes</a>

    </div>
    `;

    frag.appendChild(card);
  });

  resultados.appendChild(frag);
}


/* ======================================================
   ATUALIZAR TOTAL
====================================================== */
function atualizarTotalResultados(qtd) {
  if (!totalResultados) 
    
    return;

  totalResultados.textContent =
    qtd === 1
      ? "1 imóvel encontrado"
      : qtd > 1
      ? `${qtd} imóveis encontrados`
      : "Experimente pesquisar por texto e tags...";

      // força o flash dourado
  totalResultados.classList.remove("flash");
  void totalResultados.offsetWidth; // truque pra resetar a animação
  
  totalResultados.classList.add("flash");
}

/* ======================================================
   CONFIGURAR EVENTOS
====================================================== */
function configurarEventos() {
  campoBusca?.addEventListener("input", () => {

  buscaManualAtiva = true;
  registrarInteracaoManual(); // prioridade máxima

  mostrarLoading();

  clearTimeout(window._buscaDelay);
  window._buscaDelay = setTimeout(() => {
    filtrarImoveis();
  }, 300);
});

  document.querySelectorAll(".acoes button").forEach(btn => {
    btn.addEventListener("click", () => {
      tipoAtivo = btn.dataset.tipo;
      document.querySelectorAll(".acoes button").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      filtrarImoveis();
      
    });
  });

  document.querySelectorAll(".ordenacao button").forEach(btn => {
    btn.addEventListener("click", () => {
      ordemAtiva = btn.dataset.ordem;
      document.querySelectorAll(".ordenacao button").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      filtrarImoveis();
    });
  });

  document.getElementById("limparTags")?.addEventListener("click", () => {
  // limpa estado
  tagsAtivas.clear();
  tipoAtivo = "todos";

  // limpa UI das tags e botões
  document.querySelectorAll(".tag-dinamica").forEach(b => b.classList.remove("ativo"));
  document.querySelectorAll(".acoes button").forEach(b => b.classList.remove("ativo"));
  document.querySelector('[data-tipo="todos"]')?.classList.add("ativo");

  // limpa valores de preço
  const minInput = document.getElementById("min");
  const maxInput = document.getElementById("max");

  if (minInput) minInput.value = "";
  if (maxInput) maxInput.value = "";
// limpa quarto e banheiro
  document.getElementById("quartos").value = "";
  document.getElementById("banheiros").value = "";

  document.getElementById("buscaTexto").value = "";

  // reaplica filtro
  filtrarImoveis();
});


  document.getElementById("min")?.addEventListener("input", filtrarImoveis);
  document.getElementById("max")?.addEventListener("input", filtrarImoveis);

  document.getElementById("quartos")?.addEventListener("input", filtrarImoveis);
  document.getElementById("banheiros")?.addEventListener("input", filtrarImoveis);

}

//BARRA DE LOADING DA BUSCA
function mostrarLoading() {
  const bar = document.getElementById("loadingBar");
  if (!bar) return;

  bar.classList.add("ativo");
}

function esconderLoading() {
  const bar = document.getElementById("loadingBar");
  if (!bar) return;

  bar.style.width = "100%";

  setTimeout(() => {
    bar.classList.remove("ativo");
    bar.style.width = "0%";
  }, 400);
}


/* BUSCA AVANÇADA **************** */

