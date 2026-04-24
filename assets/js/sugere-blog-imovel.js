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
        return tags.some(tag => alvo.includes(tag));
      });
    }

    // IMÓVEL → SUGERE BLOG
    if (isImovel) {
      const termos = [endereco, bairro, cidade].filter(Boolean);
      resultados = posts.filter(post =>
        post.tags?.some(tag =>
          termos.some(t => tag.toLowerCase().includes(t))
        )
      );
    }

    renderSugestoes(resultados, containerId, tipoVisual);
  } catch (error) {
    console.error("Erro ao buscar dados para sugestão:", error);
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
        <h3 id="titulo-h3-sugestao">Imóveis semelhantes à sua busca</h3>
        <div id="contador-sugestoes-imovel">${lista.length} sugestões encontradas</div>
        <div class="carrossel-wrapper">
          <div id="resultados-imoveis ">
            ${lista.map(imovel => `
              <div class="margem">
              <a href="/imovel/${imovel.slug}.html" class="card-imovel">
                <p>${imovel.bairro}</p>
                <p>${imovel.endereco} – ${imovel.cidade}</p>
                <span>${Array.isArray(imovel.tags) ? imovel.tags.join(', ') : (imovel.tags || '')}</span>
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
        <div class="carrossel-blog-wrapper" style="position: relative;">
          <button class="carrossel-btn esquerda" aria-label="Anterior">❮</button>
          
          <div class="carrossel-blog" id="carrossel-blog-${containerId}">
            ${lista.map(post => {
              const dataFinal = formatarDataBR(obterDataMaisRecente(post));
              return `
                <a href="/blog/${post.slug}.html" class="blog-card">
                  <img data-src="${post.imagemCapa || ''}" 
                       alt="${post.textoAltImagemCapa || post.tituloPrincipal || ''}" 
                       loading="lazy">
                  <span class="blog-card-data">${dataFinal}</span>
                  <div class="blog-card-content">
                    <h3>${post.tituloPrincipal}</h3>
                    <p class="introducao-fade">${(post.introducao?.paragrafo1 || '').slice(0, 60)}...</p>
                    <span>Continuar a leitura →</span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
          
          <button class="carrossel-btn direita" aria-label="Próximo">❯</button>
        </div>
      </section>
    `;

    // Lazy load das imagens
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        if(img.dataset.src) {
            img.src = img.dataset.src;
            observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    container.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));

    // Inicializa carrossel horizontal mobile-first
    initCarrosselHorizontal(container.querySelector('.carrossel-blog-wrapper'));
  }
}

// =======================================
// CARROSSEL HORIZONTAL MOBILE-FIRST
// =======================================
function initCarrosselHorizontal(wrapper) {
  if (!wrapper) return;
  const carrossel = wrapper.querySelector('.carrossel-blog');
  const btnEsq = wrapper.querySelector('.carrossel-btn.esquerda');
  const btnDir = wrapper.querySelector('.carrossel-btn.direita');

  if (!carrossel) return;

  const itemWidth = carrossel.querySelector('a.blog-card')?.offsetWidth || 250;

  if (btnDir) btnDir.addEventListener('click', () => carrossel.scrollBy({ left: itemWidth, behavior: 'smooth' }));
  if (btnEsq) btnEsq.addEventListener('click', () => carrossel.scrollBy({ left: -itemWidth, behavior: 'smooth' }));

  // Drag e touch mobile
  let isDown = false, startX, scrollLeft;

  carrossel.addEventListener('mousedown', e => {
    isDown = true;
    carrossel.classList.add('ativo');
    startX = e.pageX - carrossel.offsetLeft;
    scrollLeft = carrossel.scrollLeft;
  });
  carrossel.addEventListener('mouseleave', () => { isDown = false; carrossel.classList.remove('ativo'); });
  carrossel.addEventListener('mouseup', () => { isDown = false; carrossel.classList.remove('ativo'); });
  carrossel.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    carrossel.scrollLeft = scrollLeft - (e.pageX - startX);
  });

  carrossel.addEventListener('touchstart', e => {
    isDown = true;
    startX = e.touches[0].pageX - carrossel.offsetLeft;
    scrollLeft = carrossel.scrollLeft;
  }, { passive: true });
  carrossel.addEventListener('touchend', () => { isDown = false; });
  carrossel.addEventListener('touchmove', e => {
    if (!isDown) return;
    carrossel.scrollLeft = scrollLeft - (e.touches[0].pageX - startX);
  }, { passive: true });
}

// =======================================
// GRID DE BLOG (Com verificação de escopo)
// =======================================
const GRID = document.getElementById('blogGrid');
const FILTROS = document.getElementById('filtrosCategorias');
const JSON_URL = '../assets/json/dados-blog.json';

let posts = [];
let categoriaAtiva = 'todas';
let pagina = 0;
const POR_PAGINA = 8;
let carregando = false;

async function carregarPosts() {
  try {
    const res = await fetch(JSON_URL);
    const data = await res.json();

    posts = data
      .filter(p => p.slug && p.categoria)
      .map(p => ({
        ...p,
        _dataOrdenacao: obterDataMaisRecente(p)
      }))
      .sort((a, b) => b._dataOrdenacao - a._dataOrdenacao);

    if (FILTROS) criarFiltros(posts);
    renderizarGrid();
  } catch (error) {
    console.error("Erro ao carregar os posts do blog:", error);
  }
}

function criarFiltros(lista) {
  const categorias = ['todas', ...new Set(lista.map(p => p.categoria))];

  FILTROS.innerHTML = categorias.map(cat => `
    <button class="${cat === 'todas' ? 'ativo' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');

  FILTROS.addEventListener('click', e => {
    if (!e.target.dataset.cat) return;
    categoriaAtiva = e.target.dataset.cat;
    pagina = 0;
    
    document.querySelectorAll('.blog-filtros button, #filtrosCategorias button')
            .forEach(b => b.classList.remove('ativo'));
            
    e.target.classList.add('ativo');
    GRID.innerHTML = '';
    renderizarGrid();
  });
}

function renderizarGrid() {
  if (!GRID) return; // Segurança caso a página não tenha o grid
  
  const filtrados = categoriaAtiva === 'todas'
    ? posts
    : posts.filter(p => p.categoria === categoriaAtiva);

  // Evita renderizar se já mostrou todos os posts
  if (pagina * POR_PAGINA >= filtrados.length && pagina > 0) return;

  const slice = filtrados.slice(
    pagina * POR_PAGINA,
    (pagina + 1) * POR_PAGINA
  );

  slice.forEach(criarCard);
  pagina++;
}

function criarCard(post) {
  const link = `/blog/${post.slug}.html`;
  const dataFinal = post._dataOrdenacao ? formatarDataBR(post._dataOrdenacao) : '';

  const card = document.createElement('a');
  card.href = link;
  card.target = '_blank';
  card.className = 'blog-card';

  card.innerHTML = `
    <img data-src="${post.imagemCapa || ''}" 
         alt="${post.textoAltImagemCapa || post.tituloPrincipal || ''}" 
         loading="lazy">
    <span class="blog-card-data">${dataFinal}</span>
    <div class="blog-card-content">
      <h3>${post.tituloPrincipal}</h3>
      <p class="introducao-fade">${(post.introducao?.paragrafo1 || '').slice(0, 60)}...</p>
      <span>Continuar a leitura →</span>
    </div>
  `;

  GRID.appendChild(card);
  observarImagem(card.querySelector('img'));
}

const observerGrid = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    if(img.dataset.src) {
        img.src = img.dataset.src;
        observerGrid.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

function observarImagem(img) {
  if (img && img.dataset.src) observerGrid.observe(img);
}

// =======================================
// INICIALIZAÇÃO
// =======================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializa o carrossel bidirecional
  const isBlog = document.querySelector('meta[name="tags"]');
  const isImovel = document.querySelector('meta[name="bairro"], meta[name="cidade"], meta[name="endereco"]');

  if (document.getElementById('sugestao-dinamica')) {
      sugestaoBidirecional({
        urlImoveis: '../assets/json/dados-imoveis.json',
        urlBlog: '../assets/json/dados-blog.json',
        containerId: 'sugestao-dinamica',
        tipoVisual: isBlog ? 'imovel' : 'blog'
      });
  }

  // ATENÇÃO: A função heroCarrosselBlog não foi definida no seu código original.
  // Comentei para não gerar erro no console.
  /*
  heroCarrosselBlog({
    urlBlog: '../assets/json/dados-blog.json',
    containerId: 'hero-blog-container',
    autoplay: true,
    intervalo: 6000
  });
  */

  // 2. Inicializa a grade do blog APENAS se os elementos existirem na página
  if (GRID) {
    carregarPosts();

    // Scroll infinito vinculado à existência do GRID
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        renderizarGrid();
      }
    });
  }
});