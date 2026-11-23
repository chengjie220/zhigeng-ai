<script setup lang="ts">
import { computed } from 'vue'
import type { NoticeItem } from '@/types/notice'
import DeadlineBadge from './DeadlineBadge.vue'
import { formatDate } from '@/utils/date'

const props = defineProps<{
  notice: NoticeItem
  favorited: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
}>()

/** AI 未完成时的摘要占位 */
const summaryText = computed(() => {
  if (props.notice.ai_status === 'pending') return '信息整理中，AI 正在解析这条通知…'
  if (props.notice.ai_status === 'failed') return 'AI 解析失败，可点击「查看详情」查看原文信息。'
  return props.notice.summary
})

const aiTag = computed(() => {
  if (props.notice.ai_status === 'pending') return { text: '信息整理中', type: 'info' as const }
  if (props.notice.ai_status === 'failed') return { text: '解析失败', type: 'danger' as const }
  return null
})
</script>

<template>
  <article class="notice-card zg-card">
    <div class="card-top">
      <el-tag size="small" effect="plain" disable-transitions>{{ notice.category }}</el-tag>
      <el-tag v-if="aiTag" size="small" :type="aiTag.type" effect="light" disable-transitions>
        {{ aiTag.text }}
      </el-tag>
      <DeadlineBadge :deadline-date="notice.deadline_date" />
    </div>

    <router-link :to="`/notice/${notice.id}`" class="card-title">
      {{ notice.title }}
    </router-link>

    <p class="card-summary">{{ summaryText }}</p>

    <div class="card-meta">
      <span class="meta-item" :title="notice.source_name">🏷 {{ notice.source_name }}</span>
      <span class="meta-item">📅 发布于 {{ formatDate(notice.published_at) }}</span>
      <span v-if="notice.deadline_date" class="meta-item">
        ⏰ 截止 {{ formatDate(notice.deadline_date) }}
      </span>
      <span v-else class="meta-item muted">⏰ 截止待核实</span>
    </div>

    <div class="card-actions">
      <el-button
        size="small"
        :type="favorited ? 'warning' : 'default'"
        plain
        @click="emit('toggleFavorite', notice.id)"
      >
        {{ favorited ? '★ 已收藏' : '☆ 收藏' }}
      </el-button>
      <router-link :to="`/notice/${notice.id}`">
        <el-button size="small" type="primary" plain>查看详情</el-button>
      </router-link>
    </div>
  </article>
</template>

<style scoped>
.notice-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.notice-card:hover {
  box-shadow: 0 6px 18px rgba(34, 48, 43, 0.1);
  transform: translateY(-2px);
}
.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.card-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--zg-text);
  line-height: 1.45;
  text-decoration: none;
}
.card-title:hover {
  color: var(--zg-primary);
  text-decoration: none;
}
.card-summary {
  margin: 0;
  color: var(--zg-text-secondary);
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.meta-item.muted {
  opacity: 0.75;
}
.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 2px;
}
@media (max-width: 540px) {
  .notice-card {
    padding: 14px 14px;
  }
  .card-title {
    font-size: 15.5px;
  }
}
</style>
