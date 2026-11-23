<script setup lang="ts">
import { computed } from 'vue'
import type { DeadlineStatus } from '@/types/notice'
import { deadlineLabel, getDeadlineStatus } from '@/utils/date'

const props = defineProps<{
  deadlineDate: string | null
  /** 仅显示「M月D日」形式（详情页用完整展示时可关掉动态文案） */
  compact?: boolean
}>()

const status = computed<DeadlineStatus>(() => getDeadlineStatus(props.deadlineDate))
const label = computed(() => deadlineLabel(props.deadlineDate, props.compact ?? false))
</script>

<template>
  <span class="deadline-badge" :class="status">{{ label }}</span>
</template>

<style scoped>
.deadline-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.8;
  white-space: nowrap;
}
.expired {
  background: #f1f1f1;
  color: #8a8f8c;
}
.urgent {
  background: #fdebe6;
  color: var(--zg-danger);
}
.upcoming {
  background: var(--zg-primary-light);
  color: var(--zg-primary);
}
.unknown {
  background: #fff4e2;
  color: #9a6a17;
}
</style>
