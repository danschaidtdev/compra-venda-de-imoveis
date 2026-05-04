// /assets/js/builder.js

// ------------------------
// 0. CARREGAR JSON DE IMÓVEIS
// ------------------------
// /assets/js/builder.js

// ------------------------
// 0. CARREGAR JSON DE IMÓVEIS
// ------------------------
async function carregarImoveis() {
  try {
    const res = await fetch("assets/json/dados-imoveis.json");
    if (!res.ok) throw new Error("Erro ao carregar JSON de imóveis");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ------------------------
// CARROSSEL DO IMOVEL
// ------------------------
// Normaliza strings (case-insensitive + remove acentos)
function normalizar(str = '') {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Encontra posts relacionados a um imóvel
function postsPorImovel(imovel, dadosBlog) {
  return dadosBlog.filter(post => {
    const tags = post.tags.map(normalizar);

    const cidadeMatch = tags.includes(normalizar(imovel.cidade));
    const bairroMatch = tags.includes(normalizar(imovel.bairro));
    const enderecoMatch = tags.some(tag =>
      normalizar(imovel.endereco).includes(tag) || tag.includes(normalizar(imovel.endereco))
    );

    return cidadeMatch || bairroMatch || enderecoMatch;
  });
}

// Encontra imóveis relacionados a um post
function imoveisPorPost(post, dadosImoveis) {
  return dadosImoveis.filter(imovel => {
    const tags = post.tags.map(normalizar);

    const cidadeMatch = tags.includes(normalizar(imovel.cidade));
    const bairroMatch = tags.includes(normalizar(imovel.bairro));
    const enderecoMatch = tags.some(tag =>
      normalizar(imovel.endereco).includes(tag) || tag.includes(normalizar(imovel.endereco))
    );

    return cidadeMatch || bairroMatch || enderecoMatch;
  });
}

function gerarCard(item, tipo = 'blog') {
  const titulo = tipo === 'blog' ? item.tituloPrincipal : item.titulo;
  const link   = tipo === 'blog' ? `/blog/${item.slug}.html` : `imovel/${item.slug}.html`;
  const img    = item.imagens?.[0] || '';

  return `
    <article class="card-post" onclick="window.location.href='${link}'">
      ${img ? `<img src="${img}" alt="${titulo}">` : ''}
      <h3>${titulo}</h3>
    </article>
  `;
}

function gerarCarrossel(items, id, tipo = 'blog') {
  if (!items.length) return '';

  return `
    <section class="carrossel-posts">
      <div class="carrossel" id="${id}">
        ${items.map(item => gerarCard(item, tipo)).join("\n")}
      </div>
    </section>
  `;
}



// ------------------------
// 1. GERAR HTML DO IMÓVEL
// ------------------------
function gerarHTMLImovel(imovel) {
  // ------------------------
  // Ajuste para categoria como array e valor como objeto
  // ------------------------
  let precoFormatado = '';

  if (Array.isArray(imovel.categoria) && imovel.categoria.length > 0) {
    const precos = [];
    if (imovel.categoria.includes("venda") && imovel.valor.venda) {
      precos.push(`Venda: R$ ${imovel.valor.venda.toLocaleString('pt-BR')}`);
    }
    if (imovel.categoria.includes("aluguel") && imovel.valor.aluguel) {
      precos.push(`Aluguel: R$ ${imovel.valor.aluguel.toLocaleString('pt-BR')}/mês`);
    }
    precoFormatado = precos.join(" <br> ");
  } else if (imovel.valor) {
    precoFormatado = `R$ ${imovel.valor.toLocaleString('pt-BR')}`;

    
  }

  
  // ------------------------
  // Schema JSON-LD
  // ------------------------
  const offers = [];

  if (imovel.categoria.includes("venda") && imovel.valor.venda) {
    offers.push({
      "@type": "Offer",
      "price": imovel.valor.venda,
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock",
      "businessFunction": "http://purl.org/goodrelations/v1#Sell"
    });
  }

  if (imovel.categoria.includes("aluguel") && imovel.valor.aluguel) {
    offers.push({
      "@type": "Offer",
      "price": imovel.valor.aluguel,
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock",
      "businessFunction": "http://purl.org/goodrelations/v1#LeaseOut"
    });
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": imovel.titulo,
    "description": imovel.descricao,
    "image": imovel.imagens[0] || imovel.imagemCapa,
    "datePosted": imovel.dataPublicacao,
    "offers": offers.length === 1 ? offers[0] : offers,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": imovel.endereco,
      "addressLocality": imovel.cidade,
      "addressRegion": imovel.estado
    }
  };

  // ------------------------
  // Gerar HTML da galeria de imagens
  // ------------------------
  let galeriaHTML = '';
  if (imovel.imagens && imovel.imagens.length > 0) {
    galeriaHTML = `
<section class="bloco-galeria efeito-destaque">
  <div class="galeria-carrossel" id="galeria-${imovel.slug}">
    ${imovel.imagens.map(img => `<img src="${img}" alt="${imovel.titulo}">`).join("\n")}
  </div>
</section>`;
  }

  // ------------------------
  // Adicionando tags personalizadas no HTML (meta)
  // ------------------------
  let metaTagsHTML = '';
  if (Array.isArray(imovel.tags) && imovel.tags.length > 0) {
    metaTagsHTML = imovel.tags.map(tag => `<meta name="tag" content="${tag}">`).join("\n");
  }

  
  // ------------------------
  // Retorna o HTML completo
  // ------------------------
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${imovel.titulo} - Corretor de Imóveis ${imovel.corretor.nome}</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">

<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0" />
<!-- ESTILOS -->
<link rel="stylesheet" href="../assets/css/estilo.css">
<link rel="stylesheet" href="../assets/css/galerias.css">
<link rel="stylesheet" href="../assets/css/galeria.css">
<link rel="stylesheet" href="../assets/css/blog.css">
<link rel="stylesheet" href="../assets/css/backgrounds.css">
<link rel="stylesheet" href="../assets/css/imoveis-sugeridos.css">

<!-- FAVICON -->
<link rel="icon" href="../assets/img/favicon/fivicon-corretor-dan-schaidt-rio-grande-do-sul.png" type="image/x-icon">

<!-- META OBRIGATÓRIO PARA busca.js -->
<meta name="description" content="${imovel.descricaoSEO}">
<meta name="category" content="${Array.isArray(imovel.categoria) ? imovel.categoria.join(',') : imovel.categoria}">
<meta name="bairro" content="${imovel.bairro}">
<meta name="endereco" content="${imovel.endereco}">
<meta name="cidade" content="${imovel.cidade}">
${metaTagsHTML}  <!-- NOVO: tags personalizadas -->

<meta property="og:title" content="${imovel.titulo}">
<meta property="og:image" content="${imovel.imagemCapa}">

<link rel="canonical" href="https://danschaidtdev.github.io/compra-venda-de-imoveis/imovel/${imovel.slug}.html">

<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "${imovel.titulo.cidade}",
  "description": "${imovel.descricaoSEO}",
  "thumbnailUrl": "https://img.youtube.com/vi/${imovel.idDoVideo}/maxresdefault.jpg",
  "uploadDate": "2024-05-20", 
  "contentUrl": "https://www.youtube.com/watch?v=${imovel.idDoVideo}",
  "embedUrl": "https://www.youtube.com/embed/${imovel.idDoVideo}"
}
</script>
</head>

<body>

<div class="fundoImoveis">

<header>
  <div class="moldura-nav blocoMenu">
  <div id="logotipo">
    <a href="/index.html">
      <img src="../assets/img/logo-png-escuro-dan-schaidt-corretor-de-imoveis-rio-grande-do-sul.png" alt="LOGO Corretor de Imóveis Dan Schaidt">
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

  <hr class="barra">

  <h1 class="tituloBlog">${imovel.titulo} no bairro ${imovel.bairro} em ${imovel.cidade}</h1>

<!-- GALERIA -->
  <div class="efeito-revelador">
    ${galeriaHTML}
  </div>

  <hr class="barra">


  <div class="blocoDeTextoBlog">
    <div class="caixaDeTexto-Bloco efeito-revelador">

    <div class="alinhadorHorizontal">
        <button class="botaoCopia" onclick="copiarTexto(this, '${imovel.numReferencia}')">
        <span class="material-symbols-outlined content_copy">content_copy</span>${imovel.numReferencia || 'N/A'}</button>

        <a href="#video360" class="botao360">Assistir o Vídeo 360°
        <span class="material-symbols-outlined">360</span></a>
      </div>

      
      <hr class="barra">

      <p>${imovel.descricao}</p>

      <hr class="barra">

      
<!-- ****************************************************************************-->
 <!--                        VIDEO DO YOUTUBE                               -->
<!-- ****************************************************************************-->
  <h1 class="tituloBlog" id="video360">Tour virtual do imóvel em ${imovel.cidade}</h1>
<div class="video-container">
    <iframe
    loading="lazy"
    class="video-auto-play"
    src="https://www.youtube.com/embed/${imovel.idDoVideo}?autoplay=1&mute=1&rel=0&enablejsapi=1" 
    title="Tour pelo Imóvel ${imovel.titulo} Corretor Dan Schaidt" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    allowfullscreen>
</iframe>



</div>

      <ul>
        <li><strong>Área:</strong> ${imovel.area}</li>
        <li><strong>Quartos:</strong> ${imovel.quartos}</li>
        <li><strong>Banheiros:</strong> ${imovel.banheiros}</li>
        <li><strong>Garagem:</strong> ${imovel.garagem}</li>
        <li><strong>Bairro:</strong> ${imovel.bairro}</li>
        <li><strong>Localização:</strong> ${imovel.endereco}</li>
      </ul>
      <strong>${imovel.tags}</strong>
    </div>

    <div class="container-precos">
    <strong class="precoEstilo">${precoFormatado}</strong>
    </div>
    </div>

  <hr class="barra">
<!-- ****************************************************************************-->
 <!--                        BOTAO CTA                               -->
<!-- ****************************************************************************-->
          <div class="efeito revelador divisor gradiente-azul">
            
          <div class="img-fixa" >
            <div class="botaoCTA" style="margin-top: 3vh;">
                  <button type="button" >Agendar uma Visita</button>
              </div>
          <img class=" img-decorada" src="../assets/img/completo-fundo-azul-amarelo.webp"
              alt="Corretor de Imóveis no Rio Grande do Sul, Dan Schaidt">
              
        </div>
        </div>

  <hr class="barra">

<!-- ****************************************************************************-->
 <!--                        SUGESTAO DE IMOVEIS                               -->
<!-- ****************************************************************************-->
  <section class="bloco-sugestao">

  <h3 id="titulo-h3">Imóveis semelhantes com a sua busca <strong>${imovel.titulo}</strong></h3>
 
  <div id="contador-sugestoes" class="contador-sugestoes"></div>

  <div class="carrossel-wrapper">


    <div id="resultados"></div>

   

  </div>
</section>

  <hr class="barra">

<!-- ****************************************************************************-->
 <!--                        SUGESTAO DE BLOG                               -->
<!-- ****************************************************************************-->
  <div id="sugestao-dinamica"></div>

<script>
sugestaoBidirecional({
  urlImoveis: '/dados-imoveis.json',
  urlBlog: '/dados-blog.json',
  containerId: 'sugestao-dinamica',
  tipoVisual: 'blog'
});
</script>




  

<!-- ****************************************************************************-->
 <!--                        BOTÃO FIXO DE CONTATO                               -->
<!-- ****************************************************************************-->

  
  <a href="https://api.whatsapp.com/send?phone=5551992671278&text=Olá%20tenho%20interesse%20em%20informações%20sobre%20este%20imóvel:%0A
  *Ref.:*%20_${imovel.numReferencia}_%0A
  *-*%20_${imovel.titulo}_%0A
  *-*%20_${imovel.categoria}_%0A
  *-*%20_${imovel.bairro}_%0A
  *-*%20_${imovel.endereco}_%0A
  *-*%20_${imovel.cidade}_%0A
  " target="_blank" rel="noopener noreferrer">
    <div class="botaoFIXO">
      <img src="../assets/img/img-geral/logo-whatsapp.png" alt="">

    </div>
</a>  

  <!-- ****************************************************************************-->
 <!--                           RODAPÉ                               -->
<!-- ****************************************************************************-->

<footer class="footer">
  <nav aria-label="Mapa do site" id="mapa-do-site" class="blocoMapa">

    <div class="molduraMapaSite">
      <span>Acompanhe as novas postagens</span><br>
    <ul class="mapaDoSite" aria-label="Redes Sociais">
        
      <li><a href="/imoveis" > <span class="material-symbols-outlined youtube_activity">youtube_activity</span>Visitas 360° no Youtube</a></li>

      <li><a href="/imoveis" > <span class="material-symbols-outlined photo_library">photo_library</span>Album de Fotos no Instagram</a></li>
    </ul>
    </div>
    

    <span>Leituras Interessantes</span><br>
    <ul class="mapaDoSite">
      <li><a href="/imoveis">Vantagens de anunciar o imóvel online</a></li>
      <li><a href="/comprar">Documentos que podem impedir a venda do imóvel</a></li>
      <li><a href="/alugar">Quando contratar um corretor de imóveis</a></li>
      
      
    </ul>
    <ul class="mapaDoSite">

      <li><a href="/mercado-imobiliario-blog.html" target="_blank"> <span class="material-symbols-outlined add">add</span>Matérias do Site</a></li>
      
    </ul>
<div class="molduraMapaSite">
  <span>Formas de Contato</span><br>
    <ul class="mapaDoSite">
      <li><a href="/imoveis" > <span class="material-symbols-outlined chat">chat</span>Contratar Dan Schaidt</a></li>
      <li><a href="/imoveis" > <span class="material-symbols-outlined rewarded_ads">rewarded_ads</span>Quero ser Parceiro</a></li>
      <li><a href="/imoveis" > <span class="material-symbols-outlined cancel">cancel</span>Relatar Erro</a></li>
      <li><a href="/imoveis" > <span class="material-symbols-outlined star">star</span>Avaliações no Google</a></li>
      
    </ul>
</div>
    
  </nav>

  <strong style="padding: 0 0 20vh 0; margin-top: 3vh; display: block;">CRECI: 00000 RS - Dan Schaidt</strong>
</footer>
</div>

<!-- ****************************************************************************-->
 <!--                           MODAL GALERIA                               -->
<!-- ****************************************************************************-->
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

     
        <script src="../assets/js/galerias.js"></script>
        <script src="../assets/js/script.js"></script>
        <script src="../assets/js/galeria.js"></script>
        <script src="../assets/js/imoveis-sugeridos.js"></script>
        <script src="../assets/js/sugere-blog-imovel.js"></script>


</div>
</body>
</html>
`
;


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
// 3. VERIFICA EXISTÊNCIA DA PÁGINA
// ------------------------
async function paginaExiste(slug) {
  try {
    const res = await fetch(`imovel/${slug}.html`, { method: "HEAD" });
    return res.ok;
  } catch (err) {
    return false;
  }
}

// ------------------------
// 4. GERAR PÁGINAS E ATUALIZAR JSON
// ------------------------
async function gerarPaginas() {
  const imoveis = await carregarImoveis();
  if (imoveis.length === 0) {
    alert("Nenhum imóvel encontrado no JSON.");
    return;
  }

  // Carregar lista existente
  let lista = [];
  try {
    const res = await fetch("../assets/json/lista-imoveis.json");
    if (res.ok) lista = await res.json();
  } catch {
    console.warn("Não foi possível carregar lista-imoveis.json. Será criada uma nova.");
  }

  let atualizouJSON = false;

 for (const imovel of imoveis) {
  const slug = imovel.slug
    ? imovel.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "")
    : imovel.titulo.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");

  // ==========================
  // 1. GARANTIR REGISTRO NA LISTA
  // ==========================
  const registro = {
    slug,
    titulo: imovel.titulo,
    categoria: imovel.categoria,
    bairro: imovel.bairro,
    cidade: imovel.cidade,
    valor: imovel.valor,
    dataPublicacao: imovel.dataPublicacao || null
  };

  const index = lista.findIndex(item => item.slug === slug);
  if (index >= 0) {
    lista[index] = { ...lista[index], ...registro };
  } else {
    lista.push(registro);
  }

  atualizouJSON = true;

  // ==========================
  // 2. GERAR HTML SOMENTE SE NECESSÁRIO
  // ==========================
  const existe = await paginaExiste(slug);

  if (imovel.atualizar === "sim" || !existe) {
    const html = gerarHTMLImovel({ ...imovel, slug });
    baixarArquivo(`${slug}.html`, html);
    console.log(`Página gerada: ${slug}.html`);
  } else {
    console.log(`Página mantida: ${slug}.html`);
  }
}


  // Baixar JSON atualizado apenas 1 vez
  if (atualizouJSON) {
    baixarArquivo("lista-imoveis.json", JSON.stringify(lista, null, 2), "application/json");
    console.log("JSON lista-imoveis.json atualizado e baixado.");
  } else {
    console.log("Nenhum imóvel precisou de atualização no JSON.");
  }
}

// ------------------------
// 5. BOTÃO NO builder.html
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
  const btnGerar = document.getElementById("btn-gerar-paginas");
  if (btnGerar) {
    btnGerar.addEventListener("click", gerarPaginas);
  }
});
