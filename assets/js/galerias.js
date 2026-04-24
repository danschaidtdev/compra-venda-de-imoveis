// ===========================
// GALERIA MODAL + LAZY LOAD AUTOMÁTICO
// ===========================

// SELEÇÃO DE ELEMENTOS
const modal = document.getElementById('modalGaleria');
const modalImagem = document.getElementById('modalImagem');
const modalContador = document.getElementById('modalContador');
const btnPrev = document.querySelector('.modal-voltar');
const btnNext = document.querySelector('.modal-proximo');
const btnFechar = document.querySelector('.fechar-modal');

let imagensAtivas = [];
let indexAtual = 0;
let xInicial = null;
let animando = false;

// Placeholder leve enquanto a imagem real carrega
const placeholder = 'assets/img/logo-completo-png-branco-dan-schaidt-corretor-de-imoveis-rio-grande-do-sul.png';

// --- FUNÇÃO AUXILIAR DE VIBRAÇÃO ---
function vibrar() {
    if ("vibrate" in navigator) navigator.vibrate(15);
}

// ===========================
// WRAPPER + ÍCONE + LAZY LOAD
// ===========================
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.galeria-carrossel img').forEach(img => {
        // 1️⃣ Guardar src real e aplicar placeholder
        img.dataset.src = img.src;   // Guarda imagem real
        img.src = placeholder;       // Placeholder inicial

        // 2️⃣ Criar wrapper + ícone se não existir
        if (!img.parentNode.classList.contains('img-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.classList.add('img-wrapper');
            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined icon-expand';
            icon.textContent = 'open_in_full';
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            wrapper.appendChild(icon);
        }
    });
});

// ===========================
// LAZY LOAD AUTOMÁTICO COM FADE-IN
// ===========================
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const realSrc = img.dataset.src;

            if (realSrc && img.src !== realSrc) {
                const tmp = new Image();
                tmp.src = realSrc;
                tmp.onload = () => {
                    img.src = realSrc;
                    img.classList.add('carregada');
                    setTimeout(() => img.classList.add('img-real'), 50);
                };
            }

            obs.unobserve(img);
        }
    });
}, { rootMargin: '100px' });

// Observa todas as imagens da galeria
document.querySelectorAll('.galeria-carrossel img').forEach(img => observer.observe(img));

// ===========================
// CLICK NAS IMAGENS (MODAL)
// ===========================
document.querySelectorAll('.galeria-carrossel img').forEach(img => {
    img.addEventListener('click', () => {
        const containerPai = img.closest('.galeria-carrossel');
        const idGaleria = containerPai.id;

        if (idGaleria === 'fotosGerais') {
            // Imagens de galerias com ID (ignora logos/fundos)
            const imgsDeGalerias = Array.from(document.querySelectorAll('.galeria-carrossel'))
                .filter(g => g.id)
                .flatMap(g => Array.from(g.querySelectorAll('img'))
                    .filter(i => !i.classList.contains('logo') && !i.classList.contains('fundo'))
                );

            // Imagens soltas com ID
            const imgsSoltasComId = Array.from(document.querySelectorAll('img[id]'))
                .filter(i => !i.closest('.galeria-carrossel'));

            imagensAtivas = [...imgsDeGalerias, ...imgsSoltasComId];

            indexAtual = 0; // Sempre começa na primeira imagem
        } else {
            imagensAtivas = Array.from(containerPai.querySelectorAll('img'));
            indexAtual = imagensAtivas.indexOf(img);
        }

        abrirModal();
    });
});

// ===========================
// MODAL
// ===========================
function abrirModal() {
    atualizarImagem();
    modal.classList.add('ativo');
    document.body.classList.add('modal-aberto');
}

function atualizarImagem() {
    if (imagensAtivas.length === 0) return;

    modalImagem.classList.add('img-fade-out');

    setTimeout(() => {
        modalImagem.src = imagensAtivas[indexAtual].src;
        modalContador.innerText = `${indexAtual + 1} / ${imagensAtivas.length}`;
        modalImagem.classList.remove('img-fade-out');
    }, 250);
}

// ===========================
// NAVEGAÇÃO
// ===========================
const proximaImg = () => {
    if (animando) return;
    vibrar();
    animando = true;
    indexAtual = (indexAtual + 1) % imagensAtivas.length;
    atualizarImagem();
    setTimeout(() => animando = false, 450);
};

const anteriorImg = () => {
    if (animando) return;
    vibrar();
    animando = true;
    indexAtual = (indexAtual - 1 + imagensAtivas.length) % imagensAtivas.length;
    atualizarImagem();
    setTimeout(() => animando = false, 450);
};

// Botões
btnNext.addEventListener('click', proximaImg);
btnPrev.addEventListener('click', anteriorImg);

// Swipe mobile
modal.addEventListener('touchstart', e => { xInicial = e.touches[0].clientX; }, {passive:true});
modal.addEventListener('touchend', e => {
    if (!xInicial) return;
    let xFinal = e.changedTouches[0].clientX;
    let diferenca = xInicial - xFinal;
    if (Math.abs(diferenca) > 60) diferenca > 0 ? proximaImg() : anteriorImg();
    xInicial = null;
});

// Teclado
document.addEventListener('keydown', e => {
    if (!modal.classList.contains('ativo')) return;
    if (e.key === 'ArrowRight') proximaImg();
    if (e.key === 'ArrowLeft') anteriorImg();
    if (e.key === 'Escape') fecharModal();
});

// Fechar modal
function fecharModal() {
    modal.classList.remove('ativo');
    document.body.classList.remove('modal-aberto');
}

btnFechar.addEventListener('click', fecharModal);
modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

// Wrapper adicional para imagens inseridas dinamicamente
document.addEventListener('click', e => {
    const img = e.target.closest('.galeria-carrossel img');
    if (!img) return;

    if (!img.parentNode.classList.contains('img-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('img-wrapper');
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined icon-expand';
        icon.textContent = 'open_in_full';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(icon);
    }
});

// Rolagem dinâmica via hash
window.addEventListener('load', () => {
    if (window.location.hash) {
        const elemento = document.querySelector(window.location.hash);
        if (elemento) setTimeout(() => elemento.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
});
