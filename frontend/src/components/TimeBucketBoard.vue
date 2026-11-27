<script setup lang="ts">
import { computed } from 'vue'
import type { NoticeItem } from '@/types/notice'
import { bucketByDeadline, bucketDateLabel } from '@/utils/timeBuckets'

const props = defineProps<{
  notices: NoticeItem[]
  /** 每桶最多显示几条 */
  limit?: number
}>()

const buckets = computed(() => bucketByDeadline(props.notices, props.limit ?? 5))
</script>

<template>
  <section v-if="buckets.length" class="time-board">
    <div class="time-board-head">
      <h2>按时间看</h2>
      <p>快到期的排在前面，别让机会溜走</p>
    </div>
    <div class="time-grid">
      <div v-for="bucket in buckets" :key="bucket.key" class="time-col" :class="bucket.tone">
        <div class="time-col-head">
          <span class="time-label">{{ bucket.label }}</span>
          <span class="time-count">{{ bucket.items.length }}<em v-if="bucket.items.length >= (limit ?? 5)">+</em></span>
        </div>
        <div class="time-hint">{{ bucket.hint }}</div>
        <ul class="time-list">
          <li v-for="n in bucket.items" :key="n.id">
            <router-link :to="`/notice/${n.id}`" class="time-item">
              <span class="time-date">{{ bucketDateLabel(n.deadline_date) }}</span>
              <span class="time-title">{{ n.title }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.time-board {
  margin: 22px 0 8px;
}
.time-board-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.time-board-head h2 {
  margin: 0;
  font-size: 19px;
}
.time-board-head p {
  margin: 0;
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.time-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.time-col {
  background: #fff;
  border: 1px solid var(--zg-border);
  border-radius: 12px;
  padding: 12px 14px;
  border-top: 3px solid var(--zg-border);
}
.time-col.danger {
  border-top-color: var(--zg-danger);
}
.time-col.warn {
  border-top-color: #e6a23c;
}
.time-col.info {
  border-top-color: var(--zg-primary);
}
.time-col.neutral {
  border-top-color: #b7c4be;
}
.time-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.time-label {
  font-weight: 700;
  font-size: 14px;
}
.danger .time-label {
  color: var(--zg-danger);
}
.time-count {
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.time-count em {
  font-style: normal;
}
.time-hint {
  font-size: 11.5px;
  color: var(--zg-text-secondary);
  margin: 2px 0 8px;
}
.time-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.time-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  text-decoration: none;
  color: var(--zg-text);
  font-size: 13px;
  line-height: 1.45;
}
.time-item:hover .time-title {
  color: var(--zg-primary);
}
.time-date {
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--zg-text-secondary);
  min-width: 44px;
}
.danger .time-date {
  color: var(--zg-danger);
  font-weight: 600;
}
.time-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 720px) {
  .time-board-head {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
