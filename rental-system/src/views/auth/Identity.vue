<template>
  <div class="id-root">
    <div class="id-grain" aria-hidden="true" />
    <div class="id-glow" aria-hidden="true" />

    <main class="id-main">
      <header class="id-header">
        <button
          class="id-mark"
          @click="handleIconClick"
          tabindex="-1"
          aria-hidden="true"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 12 12 3 21 12" />
            <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
          </svg>
        </button>
        <div class="id-brand">
          <h1 class="id-name">租屋管家</h1>
          <p class="id-tagline">Rental Management</p>
        </div>
      </header>

      <div class="id-cards" role="group" aria-label="選擇登入身份">
        <button
          class="id-card id-card--tenant"
          @click="selectRole('tenant')"
        >
          <span class="id-card-num" aria-hidden="true">01</span>
          <div class="id-card-mid">
            <strong class="id-card-zh">租客</strong>
            <em class="id-card-en">Tenant</em>
          </div>
          <p class="id-card-desc">帳單繳費・報修申請・查看公告</p>
          <span class="id-card-go" aria-hidden="true">進入 →</span>
        </button>

        <button
          class="id-card id-card--landlord"
          @click="selectRole('landlord')"
        >
          <span class="id-card-num" aria-hidden="true">02</span>
          <div class="id-card-mid">
            <strong class="id-card-zh">房東</strong>
            <em class="id-card-en">Landlord</em>
          </div>
          <p class="id-card-desc">房源管理・電表抄錄・帳務總覽</p>
          <span class="id-card-go" aria-hidden="true">進入 →</span>
        </button>
      </div>

      <footer class="id-footer">
        <RouterLink to="/explore" class="id-explore">
          還在找房？瀏覽空置房源（無需登入）
        </RouterLink>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore() as any;

const selectRole = (role: string) => {
  authStore.setRole(role);
  router.push({ name: 'Login' });
};

const iconClickCount = ref(0);
let iconClickTimer: ReturnType<typeof setTimeout> | null = null;

const handleIconClick = () => {
  iconClickCount.value++;
  if (iconClickTimer) clearTimeout(iconClickTimer);

  if (iconClickCount.value >= 3) {
    iconClickCount.value = 0;
    router.push({ name: 'AdminLogin' });
    return;
  }

  iconClickTimer = setTimeout(() => {
    iconClickCount.value = 0;
  }, 3000);
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
</style>

<style scoped>
/* ── Root ── */
.id-root {
  min-height: 100svh;
  min-height: 100vh;
  background: #08080E;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  position: relative;
  overflow: hidden;
  animation: id-appear 0.5s ease both;
}

@keyframes id-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Grain overlay ── */
.id-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  background-size: 300px 300px;
  opacity: 0.5;
}

/* ── Ambient glow ── */
.id-glow {
  position: fixed;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(201, 168, 76, 0.05) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ── Main container ── */
.id-main {
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.75rem;
  position: relative;
  z-index: 1;
}

/* ── Header ── */
.id-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: id-rise 0.6s ease both;
}

.id-mark {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.id-mark:hover {
  border-color: rgba(201, 168, 76, 0.25);
}

.id-brand {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.id-name {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #F0EBE0;
  letter-spacing: 0.1em;
  font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
}

.id-tagline {
  margin: 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 0.72rem;
  color: rgba(240, 235, 224, 0.3);
  letter-spacing: 0.18em;
}

/* ── Cards ── */
.id-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  width: 100%;
  animation: id-rise 0.6s 0.08s ease both;
}

@media (max-width: 440px) {
  .id-cards {
    grid-template-columns: 1fr;
  }
}

.id-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.75rem 1.5rem 1.5rem;
  border-radius: 14px;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  min-height: 230px;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s ease,
              border-color 0.3s ease;
}

.id-card:focus-visible {
  outline: 2px solid #C9A84C;
  outline-offset: 3px;
}

.id-card:hover {
  transform: translateY(-5px);
}

/* Tenant — warm paper */
.id-card--tenant {
  background: #EDE6D8;
}

.id-card--tenant:hover {
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.35);
}

.id-card--tenant .id-card-num  { color: rgba(30, 22, 14, 0.22); }
.id-card--tenant .id-card-zh   { color: #1C1610; }
.id-card--tenant .id-card-en   { color: rgba(30, 22, 14, 0.38); }
.id-card--tenant .id-card-desc { color: rgba(30, 22, 14, 0.5); }
.id-card--tenant .id-card-go   { color: #1C1610; }

/* Landlord — night + gold */
.id-card--landlord {
  background: #101018;
  border-color: rgba(201, 168, 76, 0.22);
}

.id-card--landlord:hover {
  border-color: rgba(201, 168, 76, 0.48);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(201, 168, 76, 0.08);
}

.id-card--landlord .id-card-num  { color: rgba(201, 168, 76, 0.35); }
.id-card--landlord .id-card-zh   { color: #F0EBE0; }
.id-card--landlord .id-card-en   { color: rgba(201, 168, 76, 0.5); }
.id-card--landlord .id-card-desc { color: rgba(240, 235, 224, 0.38); }
.id-card--landlord .id-card-go   { color: #C9A84C; }

/* Card internals */
.id-card-num {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.id-card-mid {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 1.75rem;
}

.id-card-zh {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
}

.id-card-en {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
}

.id-card-desc {
  font-size: 0.72rem;
  line-height: 1.65;
  margin-top: 0.875rem;
  letter-spacing: 0.02em;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

.id-card-go {
  position: absolute;
  bottom: 1.4rem;
  right: 1.4rem;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.id-card:hover .id-card-go {
  opacity: 1;
  transform: translateX(0);
}

/* ── Footer ── */
.id-footer {
  animation: id-rise 0.6s 0.16s ease both;
}

.id-explore {
  font-size: 0.72rem;
  color: rgba(240, 235, 224, 0.25);
  text-decoration: none;
  letter-spacing: 0.06em;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  transition: color 0.2s;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.id-explore:hover {
  color: rgba(240, 235, 224, 0.6);
}

.id-explore:focus-visible {
  outline: 2px solid rgba(201, 168, 76, 0.5);
  outline-offset: 3px;
}

/* ── Animations ── */
@keyframes id-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .id-root,
  .id-header,
  .id-cards,
  .id-footer { animation: none; }
  .id-card,
  .id-card-go { transition: none; }
}
</style>
