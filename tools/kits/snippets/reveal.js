// Scroll reveal for product cards: each card rises in as it enters the screen, once.
const app = document.getElementById('app');
app.innerHTML = Array.from({ length: 8 }, (_, i) => `<div class="c" style="height:120px;margin:16px;border-radius:16px;background:hsl(${30 + i * 6} 30% ${80 - i * 3}%);opacity:0;transform:translateY(24px);transition:.6s cubic-bezier(.22,1,.36,1)"></div>`).join('');
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.style.opacity = 1;
  e.target.style.transform = 'none';
  io.unobserve(e.target);
}), { threshold: 0.2 });
document.querySelectorAll('.c').forEach((c) => io.observe(c));
