// ===========================
// GALERIA UNIQUE MODAL + LAZY LOAD
// ===========================

const modalUnique = document.getElementById('modalGaleria');
const modalImgUnique = document.getElementById('modalImagem');
const modalContUnique = document.getElementById('modalContador');
const btnPrevUnique = document.querySelector('.modal-voltar');
const btnNextUnique = document.querySelector('.modal-proximo');
const btnFecharUnique = document.querySelector('.fechar-modal');

let imgsAtivasUnique = [];
let idxAtualUnique = 0;
let xIniUnique = null;
let animUnique = false;
const placeholderUnique = 'assets/img/logo-completo-png-branco-dan-schaidt-corretor-de-imoveis-rio-grande-do-sul.png';

function vibrarUnique(){ if("vibrate" in navigator) navigator.vibrate(15); }

// ---------------------------
// Lazy load
// ---------------------------
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.galeria-unique-wrapper img').forEach(img=>{
    img.dataset.src = img.src;
    img.src = placeholderUnique;
  });
});

const observerUnique = new IntersectionObserver((entries,obs)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const img = entry.target;
      const realSrc = img.dataset.src;
      if(realSrc && img.src !== realSrc){
        const tmp = new Image();
        tmp.src = realSrc;
        tmp.onload = ()=>{ img.src=realSrc; img.classList.add('carregada'); setTimeout(()=>img.classList.add('img-real'),50);}
      }
      obs.unobserve(img);
    }
  });
},{ rootMargin:'100px' });

document.querySelectorAll('.galeria-unique-wrapper img').forEach(img=>observerUnique.observe(img));

// ---------------------------
// Click nas capas
// ---------------------------
document.querySelectorAll('.galeria-unique-capa img').forEach(img=>{
  img.addEventListener('click',()=>{
    const container = img.closest('.galeria-unique-wrapper');
    imgsAtivasUnique = Array.from(container.querySelectorAll('img')); // inclui ocultas
    idxAtualUnique = imgsAtivasUnique.indexOf(img);
    abrirModalUnique();
  });
});

// ---------------------------
// Modal
// ---------------------------
function abrirModalUnique(){
  atualizarImgUnique();
  modalUnique.classList.add('ativo');
  document.body.classList.add('modal-aberto');
}

function atualizarImgUnique(){
  if(imgsAtivasUnique.length===0) return;
  modalImgUnique.classList.add('img-fade-out');
  setTimeout(()=>{
    modalImgUnique.src = imgsAtivasUnique[idxAtualUnique].src;
    modalContUnique.innerText = `${idxAtualUnique+1} / ${imgsAtivasUnique.length}`;
    modalImgUnique.classList.remove('img-fade-out');
  },250);
}

// ---------------------------
// Navegação
// ---------------------------
const proxImgUnique = ()=>{ if(animUnique) return; vibrarUnique(); animUnique=true;
  idxAtualUnique=(idxAtualUnique+1)%imgsAtivasUnique.length;
  atualizarImgUnique();
  setTimeout(()=>animUnique=false,450);
};

const antImgUnique = ()=>{ if(animUnique) return; vibrarUnique(); animUnique=true;
  idxAtualUnique=(idxAtualUnique-1+imgsAtivasUnique.length)%imgsAtivasUnique.length;
  atualizarImgUnique();
  setTimeout(()=>animUnique=false,450);
};

btnNextUnique.addEventListener('click', proxImgUnique);
btnPrevUnique.addEventListener('click', antImgUnique);

// Swipe mobile
modalUnique.addEventListener('touchstart', e=>{ xIniUnique=e.touches[0].clientX; }, {passive:true});
modalUnique.addEventListener('touchend', e=>{
  if(!xIniUnique) return;
  let xFim=e.changedTouches[0].clientX;
  let diff=xIniUnique-xFim;
  if(Math.abs(diff)>60) diff>0 ? proxImgUnique() : antImgUnique();
  xIniUnique=null;
});

// Teclado
document.addEventListener('keydown', e=>{
  if(!modalUnique.classList.contains('ativo')) return;
  if(e.key==='ArrowRight') proxImgUnique();
  if(e.key==='ArrowLeft') antImgUnique();
  if(e.key==='Escape') fecharModalUnique();
});

// Fechar modal
function fecharModalUnique(){
  modalUnique.classList.remove('ativo');
  document.body.classList.remove('modal-aberto');
}

btnFecharUnique.addEventListener('click', fecharModalUnique);
modalUnique.addEventListener('click', e=>{ if(e.target===modalUnique) fecharModalUnique(); });
