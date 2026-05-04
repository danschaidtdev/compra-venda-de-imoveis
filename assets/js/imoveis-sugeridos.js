// ------------------------
// IMÓVEIS SEMELHANTES
// ------------------------

let autoScrollInterval = null;
let retornoTimer = null;

function getSlugAtual() {
  return window.location.pathname
    .replace("imovel/", "")
    .replace(".html", "")
    .trim()
    .toLowerCase();
}


function calcularSimilaridade(base, candidato) {
  let score = 0;

  if (base.bairro === candidato.bairro) score += 3;
  if (base.cidade === candidato.cidade) score += 2;

  if (
    Array.isArray(base.categoria) &&
    Array.isArray(candidato.categoria) &&
    base.categoria.some(c => candidato.categoria.includes(c))
  ) score += 5;

  if (Array.isArray(base.tags) && Array.isArray(candidato.tags)) {
    const comuns = base.tags.filter(t => candidato.tags.includes(t));
    score += comuns.length * 4;
  }

  if (base.valor?.venda && candidato.valor?.venda) {
    const diff = Math.abs(base.valor.venda - candidato.valor.venda);
    if (diff <= base.valor.venda * 0.2) score += 3;
  }

  return score;
}

async function carregarImoveis() {
  const res = await fetch("../assets/json/dados-imoveis.json");
  return await res.json();
}

async function buscarImoveisSemelhantes() {
  const slugAtual = getSlugAtual();
  const imoveis = await carregarImoveis();

  const imovelAtual = imoveis.find(i => i.slug === slugAtual);
  if (!imovelAtual) return [];

  return imoveis
  .filter(i => i.numReferencia !== imovelAtual.numReferencia)
  .map(i => ({ ...i, score: calcularSimilaridade(imovelAtual, i) }))
  .filter(i => i.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 6);

  

}

// ------------------------
// FORMATA MOEDA
// ------------------------

function formatarMoeda(valor) {
  if (!valor) return null;

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// ------------------------
// RENDERIZAÇÃO
// ------------------------

function renderizarSugestoes(lista) {
  const container = document.getElementById("resultados");
  const contador = document.getElementById("contador-sugestoes");
  const titulo = document.getElementById("titulo-h3");

  if (!container) return;


  // contador visual
  if (contador) {
    contador.innerHTML = `🔎 <strong>${lista.length}</strong> imóveis sugeridos para você`;
  }

 container.innerHTML = lista.map(imovel => {
  const venda = formatarMoeda(imovel.valor?.venda);
  const aluguel = formatarMoeda(imovel.valor?.aluguel);

  let textoValor = "";

  if (venda && aluguel) {
    textoValor = `Venda: ${venda} <br> Aluguel: ${aluguel}`;
  } else if (venda) {
    textoValor = `Venda: ${venda}`;
  } else if (aluguel) {
    textoValor = `Aluguel: ${aluguel}`;
  }

  return `
    <article class="card-imovel efeito-eleva">
      <a href="imovel/${imovel.slug}.html">
        <img 
          src="${imovel.imagemCapa}"
          alt="${imovel.titulo}"
          loading="lazy"
          decoding="async"
          width="280"
          height="180"
        />

        <h4>${imovel.titulo}</h4>
        <p>${imovel.bairro} – ${imovel.cidade}</p>
        ${textoValor ? `<p class="valor-imovel">${textoValor}</p>` : ""}
      </a>
    </article>
  `;
}).join("");


  iniciarLazyLoading();
  iniciarAutoScroll(container);
}

// ------------------------
// AUTO SCROLL COM PAUSA INTELIGENTE
// ------------------------

function iniciarAutoScroll(container) {
  const intervalo = 2500;
  const pausaUsuario = 5000;

  const card = container.querySelector(".card-imovel");
  if (!card) return;

  const passo = card.offsetWidth + 16;

  const btnPrev = document.querySelector(".carrossel-btn.esquerda");
  const btnNext = document.querySelector(".carrossel-btn.direita");

  const avancar = () => {
    const chegouNoFim =
      container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;

    if (chegouNoFim) {
      container.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      container.scrollBy({ left: passo, behavior: "smooth" });
    }
  };

  const voltar = () => {
    if (container.scrollLeft <= 0) {
      container.scrollTo({
        left: container.scrollWidth,
        behavior: "smooth"
      });
    } else {
      container.scrollBy({ left: -passo, behavior: "smooth" });
    }
  };

  const iniciar = () => {
    autoScrollInterval = setInterval(avancar, intervalo);
  };

  const pausar = () => {
    clearInterval(autoScrollInterval);
    clearTimeout(retornoTimer);

    retornoTimer = setTimeout(iniciar, pausaUsuario);
  };

  iniciar();

  // interação do usuário pausa
  ["wheel", "touchstart", "mousedown", "mouseenter"].forEach(evt => {
    container.addEventListener(evt, pausar, { passive: true });
  });

  // botões
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      pausar();
      avancar();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      pausar();
      voltar();
    });
  }
}

// ------------------------
// INIT
// ------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const sugestoes = await buscarImoveisSemelhantes();
  renderizarSugestoes(sugestoes);
});

// ------------------------
// INICIA QUANDO CHEGA NO CARROSSEL
// ------------------------
function iniciarLazyLoading() {
  const imagens = document.querySelectorAll("img.lazy-imovel");

  if (!("IntersectionObserver" in window)) {
    imagens.forEach(img => img.src = img.dataset.src);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove("lazy-imovel");
        obs.unobserve(img);
      }
    });
  }, {
    root: document.querySelector("#resultados"),
    rootMargin: "100px"
  });

  imagens.forEach(img => observer.observe(img));
}


