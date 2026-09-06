// =======================================
// FORMATAÇÃO DE DATAS (Unificado)
// =======================================
function normalizarData(dataISO) {
  if (!dataISO) return null;
  // Força meio-dia para evitar problemas de fuso horário
  return new Date(`${dataISO}T12:00:00-03:00`);
}

function obterDataMaisRecente(post) {
  const publicacao = normalizarData(post.dataPublicacao);
  const atualizacao = normalizarData(post.dataAtualizacao);

  if (atualizacao && publicacao) {
    return atualizacao > publicacao ? atualizacao : publicacao;
  }
  return atualizacao || publicacao;
}

function formatarDataBR(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// =======================================
// CARROSSEL BIDIRECIONAL (IMÓVEIS & BLOG)
// =======================================
async function sugestaoBidirecional({ urlImoveis, urlBlog, containerId, tipoVisual }) {
  const meta = name =>
    document.querySelector(`meta[name="${name}"]`)?.content?.toLowerCase() || '';

  const tagsBlog = meta('tags');
  const cidade = meta('cidade');
  const bairro = meta('bairro');
  const endereco = meta('endereco');

  const isBlog = !!tagsBlog;
  const isImovel = !!(cidade || bairro || endereco);

  if (!isBlog && !isImovel) return;

  try {
    const [imoveis, posts] = await Promise.all([
      fetch(urlImoveis).then(r => r.json()),
      fetch(urlBlog).then(r => r.json())
    ]);

    let resultados = [];

    // BLOG → SUGERE IMÓVEIS
    if (isBlog) {
      const tags = tagsBlog.split(',').map(t => t.trim());

      resultados = imoveis.filter(imovel => {
        const alvo = `${imovel.endereco} ${imovel.bairro} ${imovel.cidade}`.toLowerCase();

        return tags.some(tag =>
          alvo.includes(tag)
        );
      });
    }

    // IMÓVEL → SUGERE BLOG
    if (isImovel) {
      const termos = [endereco, bairro, cidade].filter(Boolean);

      resultados = posts.filter(post =>
        post.tags?.some(tag =>
          termos.some(t =>
            tag.toLowerCase().includes(t)
          )
        )
      );
    }

    renderSugestoes(
      resultados,
      containerId,
      tipoVisual
    );

  } catch (error) {
    console.error(
      "Erro ao buscar dados para sugestão:",
      error
    );
  }
}

// =======================================
// RENDERIZAÇÃO DE SUGESTÕES
// =======================================
function renderSugestoes(lista, containerId, tipo) {
  const container = document.getElementById(containerId);

  if (!container || !lista.length) return;

  // CARROSSEL DE IMÓVEIS
  if (tipo === 'imovel') {
    container.innerHTML = `
      <section class="bloco-sugestao">
        <h3 id="titulo-h3-sugestao">
          Imóveis semelhantes à sua busca
        </h3>

        <div id="contador-sugestoes-imovel">
          ${lista.length} sugestões encontradas
        </div>

        <div class="carrossel-wrapper">
          <div id="resultados-imoveis ">
            ${lista.map(imovel => `
              <div class="margem">
                <a
                  href="/imovel/${imovel.slug}.html"
                  class="card-imovel"
                >
                  <p>${imovel.bairro}</p>

                  <p>
                    ${imovel.endereco} – ${imovel.cidade}
                  </p>

                  <span>
                    ${
                      Array.isArray(imovel.tags)
                        ? imovel.tags.join(', ')
                        : (imovel.tags || '')
                    }
                  </span>
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  // CARROSSEL HORIZONTAL DE BLOG
  if (tipo === 'blog') {
    container.innerHTML = `
      <section class="bloco-sugestao-blog">
        <p>Matérias relacionadas</p>

        <div
          class="carrossel-blog-wrapper"
          style="position: relative;"
        >
          <button
            class="carrossel-btn esquerda"
            aria-label="Anterior"
          >
            ❮
          </button>

          <div
            class="carrossel-blog"
            id="carrossel-blog-${containerId}"
          >
            ${lista.map(post => {
              const dataFinal =
                formatarDataBR(
                  obterDataMaisRecente(post)
                );

              return `
                <a
                  href="/blog/${post.slug}.html"
                  class="blog-card"
                >
                  <img
                    data-src="${post.imagemCapa || ''}"
                    alt="${
                      post.textoAltImagemCapa ||
                      post.tituloPrincipal ||
                      ''
                    }"
                    loading="lazy"
                  >

                  <span class="blog-card-data">
                    ${dataFinal}
                  </span>

                  <div class="blog-card-content">
                    <h3>
                      ${post.tituloPrincipal}
                    </h3>

                    <p class="introducao-fade">
                      ${
                        (
                          post.introducao?.paragrafo1 ||
                          ''
                        ).slice(0, 60)
                      }...
                    </p>

                    <span>
                      Continuar a leitura →
                    </span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>

          <button
            class="carrossel-btn direita"
            aria-label="Próximo"
          >
            ❯
          </button>
        </div>
      </section>
    `;

    // Lazy load das imagens
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          const img = entry.target;

          if (img.dataset.src) {
            img.src = img.dataset.src;
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '200px'
      }
    );

    container
      .querySelectorAll('img[data-src]')
      .forEach(img =>
        observer.observe(img)
      );

    // Inicializa carrossel horizontal mobile-first
    initCarrosselHorizontal(
      container.querySelector(
        '.carrossel-blog-wrapper'
      )
    );
  }
}

// =======================================
// CARROSSEL HORIZONTAL MOBILE-FIRST
// =======================================
function initCarrosselHorizontal(wrapper) {
  if (!wrapper) return;

  const carrossel =
    wrapper.querySelector('.carrossel-blog');

  const btnEsq =
    wrapper.querySelector(
      '.carrossel-btn.esquerda'
    );

  const btnDir =
    wrapper.querySelector(
      '.carrossel-btn.direita'
    );

  if (!carrossel) return;

  const itemWidth =
    carrossel.querySelector(
      'a.blog-card'
    )?.offsetWidth || 250;

  if (btnDir) {
    btnDir.addEventListener(
      'click',
      () =>
        carrossel.scrollBy({
          left: itemWidth,
          behavior: 'smooth'
        })
    );
  }

  if (btnEsq) {
    btnEsq.addEventListener(
      'click',
      () =>
        carrossel.scrollBy({
          left: -itemWidth,
          behavior: 'smooth'
        })
    );
  }

  // Drag e touch mobile
  let isDown = false;
  let startX;
  let scrollLeft;

  carrossel.addEventListener(
    'mousedown',
    e => {
      isDown = true;

      carrossel.classList.add(
        'ativo'
      );

      startX =
        e.pageX -
        carrossel.offsetLeft;

      scrollLeft =
        carrossel.scrollLeft;
    }
  );

  carrossel.addEventListener(
    'mouseleave',
    () => {
      isDown = false;

      carrossel.classList.remove(
        'ativo'
      );
    }
  );

  carrossel.addEventListener(
    'mouseup',
    () => {
      isDown = false;

      carrossel.classList.remove(
        'ativo'
      );
    }
  );

  carrossel.addEventListener(
    'mousemove',
    e => {
      if (!isDown) return;

      e.preventDefault();

      carrossel.scrollLeft =
        scrollLeft -
        (e.pageX - startX);
    }
  );

  carrossel.addEventListener(
    'touchstart',
    e => {
      isDown = true;

      startX =
        e.touches[0].pageX -
        carrossel.offsetLeft;

      scrollLeft =
        carrossel.scrollLeft;
    },
    {
      passive: true
    }
  );

  carrossel.addEventListener(
    'touchend',
    () => {
      isDown = false;
    }
  );

  carrossel.addEventListener(
    'touchmove',
    e => {
      if (!isDown) return;

      carrossel.scrollLeft =
        scrollLeft -
        (
          e.touches[0].pageX -
          carrossel.offsetLeft
        );
    },
    {
      passive: true
    }
  );
}

// =======================================
// GRID DE BLOG
// =======================================
const GRID =
  document.getElementById(
    'blogGrid'
  );

const FILTROS =
  document.getElementById(
    'filtrosCategorias'
  );

const JSON_URL =
  '../assets/json/dados-blog.json';

let posts = [];
let categoriaAtiva = 'todas';

// Quantidade de cards que permanecem
// visíveis antes da rolagem.
const CARDS_VISIVEIS = 8;


// =======================================
// CARREGAR POSTS
// =======================================
async function carregarPosts() {
  try {
    const res =
      await fetch(JSON_URL);

    const data =
      await res.json();

    posts = data
      .filter(
        p =>
          p.slug &&
          p.categoria
      )
      .map(p => ({
        ...p,
        _dataOrdenacao:
          obterDataMaisRecente(p)
      }))
      .sort(
        (a, b) =>
          b._dataOrdenacao -
          a._dataOrdenacao
      );

    if (FILTROS) {
      criarFiltros(posts);
    }

    renderizarGrid();

  } catch (error) {
    console.error(
      "Erro ao carregar os posts do blog:",
      error
    );
  }
}


// =======================================
// FILTROS
// =======================================
function criarFiltros(lista) {
  const categorias = [
    'todas',
    ...new Set(
      lista.map(
        p => p.categoria
      )
    )
  ];

  FILTROS.innerHTML =
    categorias
      .map(
        cat => `
          <button
            class="${
              cat === 'todas'
                ? 'ativo'
                : ''
            }"
            data-cat="${cat}"
          >
            ${cat}
          </button>
        `
      )
      .join('');

  FILTROS.addEventListener(
    'click',
    e => {
      if (!e.target.dataset.cat) return;

      categoriaAtiva =
        e.target.dataset.cat;

      document
        .querySelectorAll(
          '.blog-filtros button, #filtrosCategorias button'
        )
        .forEach(
          b =>
            b.classList.remove(
              'ativo'
            )
        );

      e.target.classList.add(
        'ativo'
      );

      GRID.innerHTML = '';

      renderizarGrid();
    }
  );
}


// =======================================
// AJUSTA O SCROLL DO GRID
// =======================================
// Mantém exatamente o layout dos cards.
//
// O próprio 8º card define a altura
// máxima do grid.
//
// Não usa altura fixa como 500px/720px,
// pois isso poderia cortar os cards.
function ajustarScrollGrid() {
  if (!GRID) return;

  const cards =
    GRID.querySelectorAll(
      '.blog-card'
    );

  // Até 8 cards: comportamento original
  if (
    cards.length <=
    CARDS_VISIVEIS
  ) {
    GRID.style.maxHeight = '';
    GRID.style.overflowY = '';
    GRID.style.overflowX = '';
    GRID.style.overscrollBehavior = '';

    return;
  }

  const oitavoCard =
    cards[
      CARDS_VISIVEIS - 1
    ];

  if (!oitavoCard) return;

  /*
   * Calcula exatamente onde termina
   * o 8º card dentro do grid.
   */
  const altura =
    oitavoCard.offsetTop +
    oitavoCard.offsetHeight;

  GRID.style.maxHeight =
    `${altura}px`;

  /*
   * Scroll somente vertical.
   *
   * "clip" evita que uma barra horizontal
   * seja criada sem cortar o layout como
   * acontecia com overflow-x: hidden.
   */
  GRID.style.overflowY =
    'auto';

  GRID.style.overflowX =
    'clip';

  GRID.style.overscrollBehavior =
    'contain';
}


// =======================================
// RENDERIZAÇÃO DO GRID
// =======================================
function renderizarGrid() {
  if (!GRID) return;

  const filtrados =
    categoriaAtiva === 'todas'
      ? posts
      : posts.filter(
          p =>
            p.categoria ===
            categoriaAtiva
        );

  /*
   * Renderiza TODAS as matérias.
   *
   * Não existe mais paginação.
   * Os 8 primeiros ficam visíveis.
   * Os demais ficam disponíveis
   * pela rolagem interna.
   */
  filtrados.forEach(
    criarCard
  );

  /*
   * Aguarda o navegador concluir
   * o cálculo do layout antes de
   * medir o 8º card.
   */
  requestAnimationFrame(
    () => {
      ajustarScrollGrid();
    }
  );
}


// =======================================
// CRIA CARD
// =======================================
function criarCard(post) {
  const link =
    `/blog/${post.slug}.html`;

  const dataFinal =
    post._dataOrdenacao
      ? formatarDataBR(
          post._dataOrdenacao
        )
      : '';

  const card =
    document.createElement('a');

  card.href = link;
  card.target = '_blank';
  card.className =
    'blog-card';

  card.innerHTML = `
    <img
      data-src="${post.imagemCapa || ''}"
      alt="${
        post.textoAltImagemCapa ||
        post.tituloPrincipal ||
        ''
      }"
      loading="lazy"
    >

    <span class="blog-card-data">
      ${dataFinal}
    </span>

    <div class="blog-card-content">
      <h3>
        ${post.tituloPrincipal}
      </h3>

      <p class="introducao-fade">
        ${
          (
            post.introducao
              ?.paragrafo1 ||
            ''
          ).slice(0, 60)
        }...
      </p>

      <span>
        Continuar a leitura →
      </span>
    </div>
  `;

  GRID.appendChild(
    card
  );

  observarImagem(
    card.querySelector('img')
  );
}


// =======================================
// LAZY LOAD DAS IMAGENS
// =======================================
const observerGrid =
  new IntersectionObserver(
    entries => {
      entries.forEach(
        entry => {
          if (
            !entry.isIntersecting
          ) return;

          const img =
            entry.target;

          if (
            img.dataset.src
          ) {
            img.src =
              img.dataset.src;

            observerGrid.unobserve(
              img
            );
          }
        }
      );
    },
    {
      rootMargin:
        '200px'
    }
  );


function observarImagem(img) {
  if (
    img &&
    img.dataset.src
  ) {
    observerGrid.observe(
      img
    );
  }
}


// =======================================
// RECALCULA O SCROLL NO REDIMENSIONAMENTO
// =======================================
let resizeTimer;

window.addEventListener(
  'resize',
  () => {
    clearTimeout(
      resizeTimer
    );

    resizeTimer =
      setTimeout(
        () => {
          ajustarScrollGrid();
        },
        100
      );
  }
);


// =======================================
// INICIALIZAÇÃO
// =======================================
document.addEventListener(
  'DOMContentLoaded',
  () => {

    // 1. Inicializa o carrossel bidirecional
    const isBlog =
      document.querySelector(
        'meta[name="tags"]'
      );

    const isImovel =
      document.querySelector(
        'meta[name="bairro"], ' +
        'meta[name="cidade"], ' +
        'meta[name="endereco"]'
      );

    if (
      document.getElementById(
        'sugestao-dinamica'
      )
    ) {
      sugestaoBidirecional({
        urlImoveis:
          '../assets/json/dados-imoveis.json',

        urlBlog:
          '../assets/json/dados-blog.json',

        containerId:
          'sugestao-dinamica',

        tipoVisual:
          isBlog
            ? 'imovel'
            : 'blog'
      });
    }

   
    // 2. Inicializa a grade do blog
    if (GRID) {
      carregarPosts();
    }
  }
);
