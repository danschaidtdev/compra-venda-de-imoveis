// /assets/js/builder-blog.js

// ------------------------
// 0. CARREGAR JSON DO BLOG
// ------------------------
async function carregarPosts() {
  try {
    const res = await fetch("assets/json/dados-blog.json");
    if (!res.ok) throw new Error("Erro ao carregar JSON do blog");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ================================
// CARROSSEL AUTOMÁTICO PARA BLOG
// ================================
async function gerarCarrosselParaBlog() {
  const [imoveis, posts] = await Promise.all([
    fetch("assets/json/dados-imoveis.json").then(r => r.json()),
    fetch("assets/json/dados-blog.json").then(r => r.json())
  ]);

  const metaSlug = document.querySelector('meta[name="slug"]')?.content || '';
  const postAtual = posts.find(p => p.slug === metaSlug);
  if (!postAtual) return;

  const normalize = str => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
  const tags = postAtual.tags.map(normalize);

  const imoveisRelacionados = imoveis.filter(imovel => {
    const bairro = normalize(imovel.bairro);
    const cidade = normalize(imovel.cidade);
    const endereco = normalize(imovel.endereco);

    if (endereco && tags.some(tag => normalize(tag).includes(endereco))) return true;
    if (bairro && tags.includes(bairro)) return true;
    if (cidade && tags.includes(cidade)) return true;
    return false;
  });

  const criarCard = imovel => {
    return `
      <article class="card-post" onclick="window.location.href='/imovel/${imovel.slug}.html'">
        ${imovel.imagens?.[0] ? `<img src="${imovel.imagens[0]}" alt="${imovel.titulo}">` : ''}
        <h3>${imovel.titulo}</h3>
        <p>${imovel.bairro} - ${imovel.cidade}</p>
      </article>
    `;
  };

  const container = document.getElementById('carrossel-relacionados');
  if (!container) return;

  if (imoveisRelacionados.length === 0) {
    container.innerHTML = `<p>Nenhum imóvel relacionado encontrado.</p>`;
    return;
  }

  container.innerHTML = imoveisRelacionados.map(criarCard).join('');

  const btnEsq = container.parentElement.querySelector('.carrossel-btn.esquerda');
  const btnDir = container.parentElement.querySelector('.carrossel-btn.direita');
  let scrollPos = 0;
  const scrollStep = 320;

  btnEsq?.addEventListener('click', () => {
    scrollPos -= scrollStep;
    if (scrollPos < 0) scrollPos = 0;
    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
  });

  btnDir?.addEventListener('click', () => {
    scrollPos += scrollStep;
    if (scrollPos > container.scrollWidth - container.clientWidth) {
      scrollPos = container.scrollWidth - container.clientWidth;
    }
    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
  });
}

document.addEventListener("DOMContentLoaded", gerarCarrosselParaBlog);

// ------------------------
// UTILIDADES DE DATA
// ------------------------
function normalizarData(dataISO) {
  if (!dataISO) return null;
  return new Date(`${dataISO}T12:00:00-03:00`);
}

function obterDataMaisRecente(post) {
  const publicada = normalizarData(post.dataPublicacao);
  const atualizada = normalizarData(post.dataAtualizacao);
  if (publicada && atualizada) {
    return atualizada > publicada ? atualizada : publicada;
  }
  return atualizada || publicada;
}

function formatarDataBR(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

// ------------------------
// 1. GERAR HTML DO POST
// ------------------------
function gerarHTMLPost(post) {

  // GALERIA (Mantida original se existir array de imagens)
  let galeriaHTML = '';
  if (post.imagens && post.imagens.length > 0) {
    galeriaHTML = `
<section class="bloco-galeria efeito-destaque">
  <div class="galeria-carrossel" id="galeria-${post.slug}">
    ${post.imagens.map(img => `<img src="${img}" alt="${post.tituloPrincipal}">`).join("\n")}
  </div>
</section>`;
  }

  let metaTagsHTML = '';
  if (Array.isArray(post.tags)) {
    metaTagsHTML = post.tags.map(tag => `<meta name="tag" content="${tag}">`).join("\n");
  }

  // Geração do HTML dos blocos dinâmicos
  // Dentro de gerarHTMLPost(post)
let conteudoDinamicoHTML = '';
if (post.blocos && post.blocos.length > 0) {
  conteudoDinamicoHTML = `
<section class="secao-conteudo">
  ${post.blocos.map(b => {
    // Usamos o valor bruto (b.valor) que já contém as tags <strong>, <span>, etc.
    if (b.tipo === 'h2') return `<h2 class="titulo-sessao">${b.valor}</h2>`;
    if (b.tipo === 'h3') return `<h3 class="subtitulo-sessao">${b.valor}</h3>`;
    if (b.tipo === 'p') return `<p class="paragrafo-blog">${b.valor}</p>`;
    if (b.tipo === 'img') return `
      <figure class="imagem-bloco">
        <img src="${b.url}" alt="${b.alt || ''}">
        ${b.alt ? `<figcaption>${b.alt}</figcaption>` : ''}
      </figure>`;
    if (b.tipo === 'html') return `<div class="custom-html">${b.valor}</div>`;
    return '';
  }).join("\n  ")}
</section>`;
} else {
    // Fallback: se o post não foi aberto no editor ainda e não migrou para "blocos"
    conteudoDinamicoHTML = `
<section>
  <p>${post.introducao?.paragrafo1 || ''}</p>
  <p>${post.introducao?.paragrafo2 || ''}</p>
  ${[post.secao1, post.secao2, post.secao3].map(secao => {
    if (!secao || !secao.tituloSecao) return ""; 
    return `
    <section class="secao-conteudo">
      <h2>${secao.tituloSecao}</h2>
      ${secao.subtituloSecao ? `<h3>${secao.subtituloSecao}</h3>` : ''}
      <p>${secao.paragrafo1 || ""}</p>
      <p>${secao.paragrafo2 || ""}</p>
    </section>
    `;
  }).join("")}
  <section class="conclusao">
    <p>${post.conclusao?.paragrafo1 || ''}</p>
    <p>${post.conclusao?.paragrafo2 || ''}</p>
  </section>
</section>`;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.tituloPrincipal,
    "description": post.descricaoSEO || post.descricaoResumo,
    "image": {
      "@type": "ImageObject",
      "url": post.imagemCapa,
      "width": 1200,
      "height": 630,
      "caption": post.textoAltImagemCapa
    },
    "keywords": post.tags?.join(", "),
    "articleSection": post.categoria,
    "author": {
      "@type": "Person",
      "name": post.autorNome,
      "url": `https://seusite.com.br/autor/${post.autorNome}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dan Schaidt Corretor de Imóveis",
      "logo": {
        "@type": "ImageObject",
        "url": "https://seusite.com.br/assets/img/logo.png"
      }
    },
    "datePublished": post.dataPublicacao,
    "dateModified": post.dataAtualizacao || post.dataPublicacao,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://seusite.com.br/blog/${post.slug}.html`
    }
  };

  const dataFinal = obterDataMaisRecente(post);
  const dataFormatada = dataFinal ? formatarDataBR(dataFinal) : '';
  const isAtualizado = post.dataAtualizacao && normalizarData(post.dataAtualizacao) > normalizarData(post.dataPublicacao);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="icon" href="../assets/img/favicon/fivicon-corretor-dan-schaidt-rio-grande-do-sul.png" type="image/x-icon">

<title>${post.tituloPrincipal}</title>

<meta name="slug" content="${post.slug}">
<meta name="description" content="${post.descricaoSEO || post.descricaoResumo}">
<meta name="category" content="${post.categoria}">

${metaTagsHTML}

<meta property="og:title" content="${post.tituloPrincipal}">
<meta property="og:description" content="${post.descricaoResumo}">
<meta property="og:image" content="${post.imagemCapa}">
<meta property="og:image:secure_url" content="${post.imagemCapa}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${post.textoAltImagemCapa}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://seusite.com.br/blog/${post.slug}.html">
<meta property="og:site_name" content="Dan Schaidt Corretor de Imóveis">
<meta property="og:locale" content="pt_BR">
<meta property="article:published_time" content="${post.dataPublicacao}">
<meta property="article:modified_time" content="${post.dataAtualizacao || post.dataPublicacao}">
<meta property="article:author" content="https://seusite.com.br/autor/${post.autorNome}">
<meta property="article:section" content="${post.categoria}">
${post.tags?.map(tag => `<meta property="article:tag" content="${tag}">`).join("\n")}

<link rel="canonical" href="https://seusite.com.br/blog/${post.slug}.html">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0" />

<link rel="stylesheet" href="../assets/css/estilo.css">
<link rel="stylesheet" href="../assets/css/galerias.css">
<link rel="stylesheet" href="../assets/css/galeria.css">
<link rel="stylesheet" href="../assets/css/blog.css">
<link rel="stylesheet" href="../assets/css/backgrounds.css">
<link rel="stylesheet" href="../assets/css/imoveis-sugeridos.css">

<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
</head>

<body>

<div class="fundoBlog">

<header>
  <div class="moldura-nav blocoMenu">
  <div id="logotipo">
    <a href="/index.html">
      <img src="/assets/img/logo-png-escuro-dan-schaidt-corretor-de-imoveis-rio-grande-do-sul.png" alt="LOGO Corretor de Imóveis Dan Schaidt">
    </a>
  </div>

  <button id="btnMenu" class="menu-toggle" aria-label="Abrir menu" aria-expanded="false">
    <span class="material-symbols-outlined icone-menu">menu</span>
  </button>

  <nav id="navPrincipal" class="nav-principal">
    <a href="http://whatsapp.com">Falar com o Corretor</a>
    <a href="/index.html#ver-lancamento">Ver Lançamento</a>
    <a href="/sobre-corretor-dan-schaidt.html">Missão e Valores</a>
    <a href="#mapa-do-site">+Mais</a>
  </nav>
</div>
</header>

<div class="layoutAuto">

  <h1 class="tituloBlog" style="margin-top: 5vh;">${post.tituloPrincipal}</h1>

<div class=" blocoDeTextoBlog">
  <div class="caixaDeTexto-Bloco">

  <h2>${post.subtituloPrincipal}</h2>

  <div class="meta-post">
    <span>Escrito por ${post.autorNome} e </span>
    <time class="meta-data" datetime="${(post.dataAtualizacao || post.dataPublicacao)}">
      ${isAtualizado ? "Atualizado em" : "Publicado em"} ${dataFormatada}
    </time>
    <span class="meta-separador">•</span>
    <span class="meta-leitura">${post.tempoLeitura} de leitura</span>
  </div>

  <img src="${post.imagemCapa}" alt="${post.textoAltImagemCapa}" class="imagem-capa" style="border-radius: 8px;">

  ${conteudoDinamicoHTML}

  </div>
</div>

<div class="efeito-revelador">
    ${galeriaHTML}
  </div>

<div class=" blocoDeTextoBlog">
      <div class="caixaDeTexto-Bloco">
        <h1>Tendências, dicas e notícias sobre o mercado imobiliário no Brasil.</h1>
        <strong>Matérias escritas com a sensibilidade e curadoria que só um humano pode oferecer.</strong>
        <section class="blog-container">
          <nav class="blog-filtros" id="filtrosCategorias"></nav>
          <div class="blog-grid" id="blogGrid" aria-live="polite"></div>
        </section>  
      </div>  
    </div>

<div id="sugestao-dinamica"></div>
<script>
if (typeof sugestaoBidirecional === 'function') {
  sugestaoBidirecional({
    urlImoveis: '/dados-imoveis.json',
    urlBlog: '/dados-blog.json',
    containerId: 'sugestao-dinamica',
    tipoVisual: 'imovel'
  });
}
</script>

<footer class="footer">
  <nav aria-label="Mapa do site" id="mapa-do-site" class="blocoMapa">
    <div class="molduraMapaSite">
      <span>Acompanhe as novas postagens</span><BR>
      <ul class="mapaDoSite" aria-label="Redes Sociais">
        <li><a href="/imoveis"><span class="material-symbols-outlined youtube_activity">youtube_activity</span>Visitas 360° no Youtube</a></li>
        <li><a href="/imoveis"><span class="material-symbols-outlined photo_library">photo_library</span>Album de Fotos no Instagram</a></li>
      </ul>
    </div>
    <span>Leituras Interessantes</span><BR>
    <ul class="mapaDoSite">
      <li><a href="/imoveis">Vantagens de anunciar o imóvel online</a></li>
      <li><a href="/comprar">Documentos que podem impedir a venda do imóvel</a></li>
      <li><a href="/alugar">Quando contratar um corretor de imóveis</a></li>
    </ul>
    <ul class="mapaDoSite">
      <li><a href="/mercado-imobiliario-blog.html" target="_blank"><span class="material-symbols-outlined add">add</span>Matérias do Site</a></li>
    </ul>
    <div class="molduraMapaSite">
      <span>Formas de Contato</span><BR>
      <ul class="mapaDoSite">
        <li><a href="/imoveis"><span class="material-symbols-outlined chat">chat</span>Contratar Dan Schaidt</a></li>
        <li><a href="/imoveis"><span class="material-symbols-outlined rewarded_ads">rewarded_ads</span>Quero ser Parceiro</a></li>
        <li><a href="/imoveis"><span class="material-symbols-outlined cancel">cancel</span>Relatar Erro</a></li>
        <li><a href="/imoveis"><span class="material-symbols-outlined star">star</span>Avaliações no Google</a></li>
      </ul>
    </div>
  </nav>
  <strong style="padding: 0 0 20vh 0; margin-top: 3vh; display: block;">CRECI: 00000 RS - Dan Schaidt</strong>
</footer>
</div>

<div class="modal-galeria" id="modalGaleria">
    <button class="fechar-modal" >X</button>
    <div class="modal-conteudo">
        <div id="modalContador" class="modal-contador">0 / 0</div>
        <img id="modalImagem" src="" alt="">
    </div>
    <div class="modal-controles">
        <button class="modal-voltar">< Voltar</button>
        <button class="modal-proximo"> Avançar ></button>
    </div>
</div>

</div></div><script src="/assets/js/galerias.js"></script>
  <script src="/assets/js/script.js"></script>
  <script src="/assets/js/galeria.js"></script>
  <script src="/assets/js/imoveis-sugeridos.js"></script>
  <script src="/assets/js/sugere-blog-imovel.js"></script>

</body>
</html>`;
}

// ------------------------
// 2. BAIXAR ARQUIVO
// ------------------------
function baixarArquivo(nome, conteudo, tipo = "text/html") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ------------------------
// 3. GERAR POSTS (Manual via botão no seu UI se houver)
// ------------------------
async function gerarPaginasBlog() {
  const posts = await carregarPosts();
  for (const post of posts) {
    if (post.atualizar === "sim") {
      const html = gerarHTMLPost(post);
      baixarArquivo(`${post.slug}.html`, html);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-gerar-paginas")?.addEventListener("click", gerarPaginasBlog);
});
