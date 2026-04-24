// ==========================================
// 1. ROLAGEM DINÂMICA (Hash Anchor)
// ==========================================
window.addEventListener('load', () => {
    if (window.location.hash) {
        const elemento = document.querySelector(window.location.hash);
        if (elemento) {
            setTimeout(() => {
                elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
});

// ==========================================
// 2. BLOCO DE ROLAGEM (Snap e Drag)
// ==========================================
const bloco = document.getElementById('bloco-rolagem');

if (bloco) {
    const maisCima = bloco.querySelector('.mais-cima');
    const maisBaixo = bloco.querySelector('.mais-baixo');
    let scrollTimeout, snapTimeout, startY = 0, isDragging = false, dragStartY = 0;

    const precisaScroll = () => bloco.scrollHeight > bloco.clientHeight + 2;

    const aplicarSombra = () => {
        bloco.classList.add('scroll-focus');
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => bloco.classList.remove('scroll-focus'), 400);
    };

    const atualizarIndicadores = () => {
        if (!precisaScroll()) {
            if (maisCima) fadeEsconder(maisCima);
            if (maisBaixo) fadeEsconder(maisBaixo);
            return;
        }
        const scrollTop = bloco.scrollTop;
        const maxScroll = bloco.scrollHeight - bloco.clientHeight;
        
        if (maisCima) scrollTop > 5 ? fadeMostrar(maisCima) : fadeEsconder(maisCima);
        if (maisBaixo) scrollTop < maxScroll - 5 ? fadeMostrar(maisBaixo) : fadeEsconder(maisBaixo);
    };

    const aplicarSnap = () => {
        const alturaTela = window.innerHeight;
        const posicaoAtual = bloco.getBoundingClientRect().top + window.scrollY;
        const snapDestino = Math.round(posicaoAtual / alturaTela) * alturaTela;
        window.scrollTo({ top: snapDestino, behavior: 'smooth' });
    };

    // Eventos Mouse
    bloco.addEventListener('mousedown', e => {
        isDragging = true;
        dragStartY = e.clientY + bloco.scrollTop;
        bloco.classList.add('scroll-focus');
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        bloco.scrollTop = dragStartY - e.clientY;
        atualizarIndicadores();
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        bloco.classList.remove('scroll-focus');
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(aplicarSnap, 150);
    });

    bloco.addEventListener('wheel', () => {
        aplicarSombra();
        atualizarIndicadores();
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(aplicarSnap, 180);
    }, { passive: true });

    // Touch Mobile
    bloco.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY + bloco.scrollTop;
        aplicarSombra();
    }, { passive: true });

    bloco.addEventListener('touchmove', e => {
        bloco.scrollTop = startY - e.touches[0].clientY;
        aplicarSombra();
        atualizarIndicadores();
    }, { passive: false });

    bloco.addEventListener('touchend', () => {
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(aplicarSnap, 150);
    });

    bloco.addEventListener('scroll', atualizarIndicadores);
    window.addEventListener('resize', atualizarIndicadores);
    atualizarIndicadores();
}

// ==========================================
// 3. FUNÇÕES DE APOIO (Fade e Utils)
// ==========================================
function fadeMostrar(el) {
    if (!el) return;
    el.style.display = 'block';
    setTimeout(() => el.style.opacity = '1', 10);
}

function fadeEsconder(el) {
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => el.style.display = 'none', 250);
}

// ==========================================
// 4. EFEITO REVELADOR (IntersectionObserver)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.style.setProperty('--delay', el.style.animationDelay || '0s');
                el.style.setProperty('--duration', el.style.animationDuration || '1.2s');
                el.classList.add("visivel");
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".efeito-revelador").forEach(el => observer.observe(el));
});

// ==========================================
// 5. EXPANDIR CONTEÚDO (Botão Carregar)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById('btnCarregarRestante');
    const areaOculta = document.getElementById('secao-oculta');
    const containerBotao = document.getElementById('wrapper-botao-expandir');

    if (botao && areaOculta) {
        botao.addEventListener('click', () => {
            areaOculta.style.display = 'block';
            setTimeout(() => { areaOculta.style.opacity = '1'; }, 10);
            areaOculta.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (containerBotao) containerBotao.remove();
            window.dispatchEvent(new Event('resize'));
        });
    }
});

// ==========================================
// 6. VÍDEO DO YOUTUBE (Auto-pause/play)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const todosOsVideos = document.querySelectorAll(".video-auto-play");
    if (todosOsVideos.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target;
            const comando = entry.isIntersecting ? "playVideo" : "pauseVideo";
            iframe.contentWindow.postMessage(JSON.stringify({
                event: "command",
                func: comando,
                args: []
            }), "*");
        });
    }, { threshold: 0.5 });

    todosOsVideos.forEach(video => observer.observe(video));
});

// ==========================================
// 7. BOTÃO DE COPIAR
// ==========================================
function copiarTexto(botao, texto) {
    if (!botao) return;
    const textoOriginal = botao.innerHTML;

    navigator.clipboard.writeText(texto).then(() => {
        botao.innerHTML = '<span class="material-symbols-outlined check">check</span> Copiado!';
        setTimeout(() => { botao.innerHTML = textoOriginal; }, 2000);
    }).catch(err => console.error("Erro ao copiar: ", err));
}


//NAVEÇÃO NOVA

document.addEventListener("DOMContentLoaded", function() {
  const btnMenu = document.getElementById('btnMenu');
  const navPrincipal = document.getElementById('navPrincipal');
  const iconeMenu = btnMenu.querySelector('.icone-menu');

  // Evento de clique no botão
  btnMenu.addEventListener('click', function() {
    // Alterna a classe 'ativo' que mostra/esconde o menu
    navPrincipal.classList.toggle('ativo');
    
    // Verifica se o menu está aberto
    const menuAberto = navPrincipal.classList.contains('ativo');
    
    // Troca o ícone (usa o Material Symbols: 'menu' ou 'close')
    iconeMenu.textContent = menuAberto ? 'close' : 'menu';
    
    // Acessibilidade (Leitores de tela)
    btnMenu.setAttribute('aria-expanded', menuAberto);
  });

  // Opcional: Fechar o menu automaticamente ao clicar em um link
  // Muito útil para links âncora como href="#ver-lancamento"
  const linksNav = navPrincipal.querySelectorAll('a');
  linksNav.forEach(link => {
    link.addEventListener('click', () => {
      navPrincipal.classList.remove('ativo');
      iconeMenu.textContent = 'menu';
      btnMenu.setAttribute('aria-expanded', 'false');
    });
  });
});