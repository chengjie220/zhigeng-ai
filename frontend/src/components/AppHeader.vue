<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <header class="app-header">
    <div class="zg-container header-inner">
      <router-link to="/" class="brand" @click="closeMenu">
        <span class="brand-logo" aria-hidden="true">🐦</span>
        <span class="brand-name">知更 AI</span>
        <span class="brand-sub">校园机会雷达</span>
      </router-link>

      <button
        class="menu-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-label="打开导航菜单"
        @click="menuOpen = !menuOpen"
      >
        <span class="bar" />
        <span class="bar" />
        <span class="bar" />
      </button>

      <nav class="nav" :class="{ open: menuOpen }">
        <router-link to="/" :class="{ active: route.path === '/' || route.path.startsWith('/category/') }" @click="closeMenu">
          分类首页
        </router-link>
        <router-link to="/notices" :class="{ active: route.path === '/notices' }" @click="closeMenu">
          全部通知
        </router-link>
        <router-link to="/favorites" :class="{ active: route.path === '/favorites' }" @click="closeMenu">
          我的收藏
        </router-link>
        <router-link to="/sources" :class="{ active: route.path === '/sources' }" @click="closeMenu">
          信息源管理
        </router-link>
        <router-link to="/about" :class="{ active: route.path === '/about' }" @click="closeMenu">
          关于项目
        </router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--zg-border);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  color: var(--zg-text);
}
.brand:hover {
  text-decoration: none;
}
.brand-logo {
  font-size: 22px;
}
.brand-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.brand-sub {
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.nav {
  display: flex;
  gap: 6px;
}
.nav a {
  padding: 7px 14px;
  border-radius: 8px;
  color: var(--zg-text-secondary);
  font-size: 14px;
  text-decoration: none;
}
.nav a:hover {
  background: var(--zg-primary-light);
  color: var(--zg-primary);
  text-decoration: none;
}
.nav a.active {
  background: var(--zg-primary);
  color: #fff;
}
.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px;
}
.menu-toggle .bar {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--zg-text);
  border-radius: 2px;
}

@media (max-width: 720px) {
  .brand-sub {
    display: none;
  }
  .menu-toggle {
    display: flex;
  }
  .nav {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: #fff;
    border-bottom: 1px solid var(--zg-border);
    padding: 8px 14px 14px;
    display: none;
  }
  .nav.open {
    display: flex;
  }
  .nav a {
    padding: 12px 14px;
    border-radius: 10px;
  }
}
</style>
