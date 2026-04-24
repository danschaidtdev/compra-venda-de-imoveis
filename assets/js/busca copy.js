let campoBusca, filtroQuartos, filtroBairro, filtroPreco;
let resultados, totalResultados;

// Caminho do JSON atualizado automaticamente pelo builder.js
const jsonListaImoveis = "/assets/json/lista-imoveis.json";
const pastaImoveis = "/imovel/"; // pasta onde ficam os arquivos HTML

let cacheImoveis = []; // Armazena os dados das páginas
let carregando = true;

window.addEventListener("DOMContentLoaded", async () => {
  campoBusca = document.getElementById("campo-busca");
  filtroQuartos = document.getElementById("filtro-quartos");
  filtroBairro = document.getElementById("filtro-bairro");
  filtroPreco = document.getElementById("filtro-preco");
  resultados = document.getElementById("resultados");
  totalResultados = document.getElementById("total-resultados");


  await indexarPaginas();
  iniciarTypewriter();
  configurarEventos();
  sugerirAleatorios();
});





// ------------------------
// FORMATA MOEDA
// ------------------------
function formatarMoeda(valor) {
  if (typeof valor !== "number") return "Valor sob consulta";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}


// ------------------------
// 1. INDEXADOR (Lê os HTMLs listados no JSON)
// ------------------------
async function indexarPaginas() {
  console.log("Indexando páginas a partir de lista-imoveis.json...");

  try {
    const resJson = await fetch(jsonListaImoveis);
    if (!resJson.ok) throw new Error("Não foi possível carregar lista-imoveis.json");
    const listaImoveis = await resJson.json();

    const promessas = listaImoveis.map(async (imovel) => {
      const arquivo = `${imovel.slug}.html`;
      try {
        const res = await fetch(pastaImoveis + arquivo);
        if (!res.ok) throw new Error("Página não encontrada: " + arquivo);
        const texto = await res.text();
        const doc = new DOMParser().parseFromString(texto, "text/html");

        const titulo = doc.querySelector("meta[property='og:title']")?.content || imovel.titulo || "Imóvel sem título";
        const desc = doc.querySelector("meta[name='description']")?.content || "";

        // ✅ Imagem segura: fallback para imagem padrão
        let imagem = doc.querySelector("meta[property='og:image']")?.content;
        if (!imagem) {
          imagem = "../assets/img/png-azul-logo-completo.webp";
        }

        const catMeta = doc.querySelector("meta[name='category']")?.content;
        const categorias = catMeta ? catMeta.toLowerCase().split(",").map(c => c.trim()) : [];
        const bairro = doc.querySelector("meta[name='bairro']")?.content?.trim() || "";
        const textoCompleto = (titulo + " " + desc).toLowerCase();

        // Se não houver categoria, detecta automaticamente
        if (categorias.length === 0) {
          if (textoCompleto.includes("aluguel") || textoCompleto.includes("alugar")) categorias.push("aluguel");
          if (textoCompleto.includes("venda") || textoCompleto.includes("comprar")) categorias.push("venda");
          if (categorias.length === 0) categorias.push("outros");
        }

        // -------- VALOR / PREÇO (NORMALIZADO) --------
        let valorExibicao = "Valor sob consulta";
        let precoBase = null;
        let precoVenda = null;
        let precoAluguel = null;

        if (imovel.valor) {
          if (typeof imovel.valor.venda === "number") {
            precoVenda = imovel.valor.venda;
          }
          if (typeof imovel.valor.aluguel === "number") {
            precoAluguel = imovel.valor.aluguel;
          }

          // prioridade visual: venda → aluguel
          if (precoVenda) {
            valorExibicao = formatarMoeda(precoVenda);
            precoBase = precoVenda;
          } else if (precoAluguel) {
            valorExibicao = formatarMoeda(precoAluguel) + " / mês";
            precoBase = precoAluguel;
          }
        }

        return {
          titulo,
          descricao: desc,
          imagem,
          link: pastaImoveis + arquivo,
          categorias,
          bairro,
          textoBusca: textoCompleto,
          valorExibicao,
          precoBase,
          precoVenda
        };
      } catch (err) {
        console.error("Erro ao processar " + arquivo, err);
        return null;
      }
    });

    const resultados = (await Promise.all(promessas)).filter(Boolean);
    cacheImoveis = resultados;

    preencherFiltroBairro(resultados);
    carregando = false;

    console.log(`✅ ${resultados.length} páginas indexadas com sucesso`);
  } catch (err) {
    console.error("Erro ao indexar páginas:", err);
  }
}

// ------------------------
// 2. FILTRO DE BAIRRO
// ------------------------
function preencherFiltroBairro(imoveis) {
  const select = document.getElementById("filtro-bairro");
  if (!select) return;

  select.innerHTML = `<option value="">Todos os Bairros</option>`;
  const bairrosUnicos = new Set();

  imoveis.forEach(i => { if (i.bairro) bairrosUnicos.add(i.bairro); });
  [...bairrosUnicos].sort((a,b) => a.localeCompare(b)).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.toLowerCase();
    opt.textContent = b;
    select.appendChild(opt);
  });
}

// ------------------------
// 3. TYPEWRITER
// ------------------------
let typewriterTimer;
let typewriterActive = false;

function iniciarTypewriter() {
  const input = document.getElementById("campo-busca");
  const frases = [
    "Apartamento 2 quartos...",
    "Casa com pátio para alugar...",
    "Cobertura no centro...",
    "Studio mobiliado..."
  ];

  let i = 0, j = 0, isDeleting = false;

  function loop() {
    if (!typewriterActive) return;
    if (document.activeElement === input || input.value.length > 0) {
      typewriterTimer = setTimeout(loop, 300);
      return;
    }

    const fraseAtual = frases[i];

    if (isDeleting) {
      input.placeholder = fraseAtual.substring(0, j - 1);
      j--;
      if (j === 0) {
        isDeleting = false;
        i = (i + 1) % frases.length;
      }
    } else {
      input.placeholder = fraseAtual.substring(0, j + 1);
      j++;
      if (j === fraseAtual.length) {
        isDeleting = true;
        setTimeout(loop, 1800);
        return;
      }
    }

    typewriterTimer = setTimeout(loop, isDeleting ? 50 : 100);
  }

  typewriterActive = true;
  loop();

  input.addEventListener("focus", stopTypewriter);
  input.addEventListener("input", stopTypewriter);
}

function stopTypewriter() {
  typewriterActive = false;
  clearTimeout(typewriterTimer);
}

// ------------------------
// 4. CONFIGURAÇÃO DE EVENTOS
// ------------------------
function configurarEventos() {
  const input = document.getElementById("campo-busca");
  const btnFiltros = document.querySelectorAll(".btn-filtro");
  const toggleAdv = document.getElementById("toggle-advanced");
  const painelAdv = document.getElementById("advanced-panel");
  const selQuartos = document.getElementById("filtro-quartos");
  const selBairro = document.getElementById("filtro-bairro");
  const btnLimpar = document.getElementById("btn-limpar");

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (campoBusca) campoBusca.value = "";
      if (selQuartos) selQuartos.value = "";
      if (selBairro) selBairro.value = "";
      if (filtroPreco) filtroPreco.value = "";

      btnFiltros.forEach(btn => btn.setAttribute("data-active", btn.dataset.tipo === "todos" ? "true" : "false"));

      const sugestoes = document.getElementById("sugestoes-lista");
      if (sugestoes) sugestoes.style.display = "none";

      filtrarImoveis();
      stopTypewriter();
      iniciarTypewriter();
    });
  }

  input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    filtrarImoveis();
    atualizarSugestoes(""); // esconde sugestões
  }
});

  

  btnFiltros.forEach(btn => {
    btn.addEventListener("click", () => {
      btnFiltros.forEach(b => b.setAttribute("data-active", "false"));
      btn.setAttribute("data-active", "true");
      filtrarImoveis();
    });
  });

  if (toggleAdv && painelAdv) {
    toggleAdv.addEventListener("click", () => {
      const aberto = painelAdv.classList.toggle("aberto");
      toggleAdv.setAttribute("aria-expanded", aberto);
      toggleAdv.innerText = aberto ? "- Menos Filtros" : "+ Filtros Avançados";
    });
  }

  if (selQuartos) selQuartos.addEventListener("change", filtrarImoveis);
  if (selBairro) selBairro.addEventListener("change", filtrarImoveis);
}

// ------------------------
// RELEVANCIA DO DADO
// ------------------------
function calcularRelevancia(termo, imovel) {
  if (!termo) return 0;

  const palavrasBusca = termo.split(" ").filter(p => p.length > 1);
  let score = 0;

  palavrasBusca.forEach(palavra => {
    if (imovel.titulo.toLowerCase().includes(palavra)) score += 3;
    if (imovel.bairro.toLowerCase().includes(palavra)) score += 2;
    if (imovel.textoBusca.includes(palavra)) score += 1;
    if (imovel.categorias.some(c => c.includes(palavra))) score += 2;
  });

  return score;
}


// ------------------------
// 5. FILTRAGEM CENTRAL
// ------------------------
function filtrarImoveis() {
  const termo = (campoBusca?.value || "").toLowerCase().trim();
  const precoVal = filtroPreco?.value;

  const btnAtivo = document.querySelector(".btn-filtro[data-active='true']");
  const tipoFiltro = btnAtivo ? btnAtivo.dataset.tipo : "todos";

  const quartosVal = filtroQuartos?.value;
  const bairroVal = filtroBairro?.value;

  // 1. Primeiro, aplicamos os filtros OBRIGATÓRIOS (Categoria, Quartos, Bairro)
  let baseFiltrada = cacheImoveis.filter(imovel => {
    const matchTipo = tipoFiltro === "todos" || imovel.categorias.includes(tipoFiltro);

    let matchQuartos = true;
    if (quartosVal) {
      if (quartosVal === "3") matchQuartos = /[3-9]\s*quarto/i.test(imovel.textoBusca);
      else matchQuartos = imovel.textoBusca.includes(`${quartosVal} quarto`);
    }

    let matchBairro = true;
    if (bairroVal) matchBairro = imovel.bairro.toLowerCase() === bairroVal;

    return matchTipo && matchQuartos && matchBairro;
  });
if (!termo) {
  renderizarResultados(baseFiltrada);
  atualizarTotalResultados(baseFiltrada.length);
  return;
}
  // 2. Agora separamos por RELEVÂNCIA do input de texto
 let relevantes = [];
let sugestoes = [];

baseFiltrada.forEach(imovel => {
  const score = calcularRelevancia(termo, imovel);

  if (score >= 3) {
    relevantes.push({ ...imovel, score });
  } else if (score > 0) {
    sugestoes.push({ ...imovel, score });
  }
});
relevantes.sort((a, b) => b.score - a.score);
sugestoes.sort((a, b) => b.score - a.score);


  // 3. Ordenação por PREÇO dentro de cada grupo (opcional, para manter consistência)
  const ordenarPorPreco = (a, b) => {
    if (precoVal === "menor") return (a.preco || 0) - (b.preco || 0);
    if (precoVal === "maior") return (b.preco || 0) - (a.preco || 0);
    return 0;
  };

  if (precoVal) {
  relevantes.sort(ordenarPorPreco);
  sugestoes.sort(ordenarPorPreco);
}


  // 4. Unimos os dois: primeiro os que deram match no texto, depois os que sobraram da filtragem
  renderizarResultadosComSeparacao(relevantes, sugestoes);
atualizarTotalResultados(relevantes.length);

}
// ------------------------
// 6. RENDERIZAÇÃO DE RESULTADOS
// ------------------------
function renderizarResultados(lista) {
  const container = resultados;
  if (!container) return;

  container.innerHTML = "";
  if (lista.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#666; grid-column: 1/-1;'>Nenhum imóvel encontrado.</p>";
    return;
  }

  lista.forEach(imovel => {
    const card = document.createElement("div");
    card.className = "card-imovel";

    // ✅ Fallback de imagem seguro
    const imgSrc = imovel.imagem || "../assets/img/completo-fundo-azul.webp";

    // ✅ Gera tags para todas as categorias
    const tagsHTML = imovel.categorias.map(cat => {
      const classe = cat === "venda" ? "tag-venda"
                  : cat === "aluguel" ? "tag-aluguel"
                  : "tag-outros";
      const texto = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `<span class="card-tag ${classe}">${texto}</span>`;
    }).join(" ");

    card.innerHTML = `
      <img src="${imgSrc}" alt="${imovel.titulo}" class="card-img" loading="lazy" onerror="this.src='../assets/img/completo-fundo-azul.webp'">
      <div class="card-body">
        ${tagsHTML}
        <h3 class="card-title">${imovel.titulo}</h3>
        <p class="card-desc">${imovel.descricao}</p>
        <p class="card-preco">${imovel.valor || "Valor sob consulta"}</p>

        <a href="${imovel.link}" target="_blank" rel="noopener noreferrer" class="card-btn">Ver Detalhes</a>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderizarResultadosComSeparacao(relevantes, sugestoes) {
  const container = resultados;
  container.innerHTML = "";

  if (relevantes.length === 0 && sugestoes.length === 0) {
    container.innerHTML = "<p style='text-align:center'>Nenhum imóvel encontrado.</p>";
    return;
  }

  if (relevantes.length > 0) {
    const h = document.createElement("h2");
    h.className = "titulo-bloco";
    h.textContent = "🔎 Resultados relevantes";
    container.appendChild(h);

    renderizarListaSemLimpar(relevantes);
  }

  if (sugestoes.length > 0) {
    const h = document.createElement("h2");
    h.className = "titulo-bloco sugestao";
    h.textContent = "💡 Sugestões semelhantes";
    container.appendChild(h);

    renderizarListaSemLimpar(sugestoes);
  }
}


function renderizarListaSemLimpar(lista) {
  const container = resultados;

  lista.forEach(imovel => {
    const card = document.createElement("div");
    card.className = "card-imovel";

    const imgSrc = imovel.imagem || "../assets/img/completo-fundo-azul.webp";

    const tagsHTML = imovel.categorias.map(cat => {
      const classe = cat === "venda" ? "tag-venda"
        : cat === "aluguel" ? "tag-aluguel"
        : "tag-outros";
      return `<span class="card-tag ${classe}">${cat}</span>`;
    }).join(" ");

    card.innerHTML = `
      <img src="${imgSrc}" class="card-img" loading="lazy">
      <div class="card-body">
        ${tagsHTML}
        <h3>${imovel.titulo}</h3>
        <p>${imovel.descricao}</p>
        <p class="card-preco">${imovel.valor || "Valor sob consulta"}</p>
        <a href="${imovel.link}" target="_blank" rel="noopener noreferrer" class="card-btn">Ver Detalhes</a>
      </div>
    `;

    container.appendChild(card);
  });
}



function atualizarSugestoes(termo) {
  const listaEl = document.getElementById("sugestoes-lista");
  if (!listaEl) return;

  if (!termo || termo.length < 2) {
    listaEl.style.display = "none";
    return;
  }

  const palavras = termo.split(" ").filter(p => p.length > 1);

  const sugestoes = cacheImoveis
    .map(imovel => {
      let score = 0;
      palavras.forEach(p => {
        if (imovel.titulo.toLowerCase().includes(p)) score += 3;
        if (imovel.bairro.toLowerCase().includes(p)) score += 2;
        if (imovel.textoBusca.includes(p)) score += 1;
      });
      return score > 0 ? { ...imovel, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  listaEl.innerHTML = "";

  if (sugestoes.length === 0) {
    listaEl.style.display = "none";
    return;
  }

  sugestoes.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${s.titulo}</span>
      <span class="tipo">${s.categorias.map(c => c.toUpperCase()).join(", ")}</span>
    `;
    li.onclick = () => {
      campoBusca.value = s.titulo;
      listaEl.style.display = "none";
      filtrarImoveis();
    };
    listaEl.appendChild(li);
  });

  listaEl.style.display = "block";
}


function atualizarTotalResultados(qtd) {
  // 1. Verifica se o elemento existe na página antes de continuar
  if (!totalResultados) return;

  // 2. Lógica de Singular e Plural
  if (qtd === 1) {
    totalResultados.textContent = `${qtd} imóvel encontrado`;
  } else if (qtd > 1) {
    totalResultados.textContent = `${qtd} imóveis encontrados`;
  } else {
    totalResultados.textContent = `Nenhum imóvel encontrado`;
  }

  // 3. Só rola a página se houver resultados (qtd > 0)
  if (qtd > 0) {
    // Usamos o ID 'total-resultados' como você indicou
    const alvoScroll = document.getElementById('total-resultados');
    
    if (alvoScroll) {
      alvoScroll.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}

// ------------------------
// 7. SUGESTÕES ALEATÓRIAS
// ------------------------
function sugerirAleatorios(qtd = 4) {
  const container = document.getElementById("sugestoes-automaticas");
  if (!container || !cacheImoveis || cacheImoveis.length === 0) return;

  container.innerHTML = "";
  const copiaImoveis = [...cacheImoveis];

  // Embaralha array
  for (let i = copiaImoveis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copiaImoveis[i], copiaImoveis[j]] = [copiaImoveis[j], copiaImoveis[i]];
  }

  const aleatorios = copiaImoveis.slice(0, Math.min(qtd, copiaImoveis.length));

  aleatorios.forEach(imovel => {
    const card = document.createElement("div");
    card.className = "card-imovel";

    const imgSrc = imovel.imagem || "../assets/img/completo-fundo-azul.webp";

    // ✅ Gera tags para todas as categorias
    const tagsHTML = imovel.categorias.map(cat => {
      const classe = cat === "venda" ? "tag-venda"
                  : cat === "aluguel" ? "tag-aluguel"
                  : "tag-outros";
      const texto = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `<span class="card-tag ${classe}">${texto}</span>`;
    }).join(" ");

    card.innerHTML = `
      <img src="${imgSrc}" alt="${imovel.titulo}" class="card-img" loading="lazy" onerror="this.src='../assets/img/completo-fundo-azul.webp'">
      <div class="card-body">
        ${tagsHTML}
        <h3 class="card-title">${imovel.titulo}</h3>
        <p class="card-desc">${imovel.descricao.substring(0, 80)}...</p>
        <a href="${imovel.link}" target="_blank" rel="noopener noreferrer" class="card-btn">Ver Detalhes</a>
      </div>
    `;
    container.appendChild(card);
  });

}