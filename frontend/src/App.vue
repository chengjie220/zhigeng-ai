<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import { USE_MOCK } from '@/api/notices'
</script>

<template>
  <div class="app-shell">
    <div v-if="USE_MOCK" class="mock-banner">
      当前为示例数据（Mock 模式）—— 非真实校园通知，联调真实后端后自动切换
    </div>
    <AppHeader />
    <main class="app-main">
      <router-view />
    </main>
    <footer class="zg-footer">
      <div class="links">
        <router-link to="/">首页</router-link>
        <router-link to="/sources">信息源管理</router-link>
        <router-link to="/favorites">我的收藏</router-link>
        <router-link to="/about">关于项目</router-link>
      </div>
      <div>知更 AI · 成都大学校园机会雷达 —— 学生参赛作品，非学校官方平台</div>
      <div>信息以各来源官网原文为准；AI 提取内容仅供整理参考</div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
}
</style>
