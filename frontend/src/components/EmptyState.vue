<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  showClear?: boolean
}>()

const emit = defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="empty-state zg-card">
    <div class="empty-icon" aria-hidden="true">📭</div>
    <div class="empty-title">{{ title ?? '暂无数据' }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <slot />
    <el-button v-if="showClear" type="primary" plain @click="emit('clear')">清空筛选条件</el-button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon {
  font-size: 40px;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
}
.empty-desc {
  color: var(--zg-text-secondary);
  font-size: 14px;
  max-width: 360px;
}
</style>
