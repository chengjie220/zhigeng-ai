<script setup lang="ts">
import type { DeadlineFilter, SourceItem } from '@/types/notice'
import { CATEGORIES } from '@/config/categories'

defineProps<{
  category: string
  sourceId: number | ''
  deadlineStatus: DeadlineFilter
  sources: SourceItem[]
}>()

const emit = defineEmits<{
  'update:category': [value: string]
  'update:sourceId': [value: number | '']
  'update:deadlineStatus': [value: DeadlineFilter]
  reset: []
}>()

const categoryOptions = CATEGORIES.map((c) => c.key)
const deadlineOptions: { label: string; value: DeadlineFilter }[] = [
  { label: '全部截止状态', value: 'all' },
  { label: '7天内截止', value: 'urgent' },
  { label: '未截止', value: 'upcoming' },
  { label: '已截止', value: 'expired' },
  { label: '截止待核实', value: 'unknown' },
]
</script>

<template>
  <div class="filter-panel">
    <el-select
      :model-value="category"
      class="filter-item"
      placeholder="全部类别"
      clearable
      @update:model-value="emit('update:category', ($event as string) ?? '')"
    >
      <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
    </el-select>

    <el-select
      :model-value="sourceId"
      class="filter-item"
      placeholder="全部来源"
      clearable
      @update:model-value="emit('update:sourceId', ($event as number) ?? '')"
    >
      <el-option v-for="s in sources" :key="s.id" :label="s.name" :value="s.id" />
    </el-select>

    <el-select
      :model-value="deadlineStatus"
      class="filter-item"
      @update:model-value="emit('update:deadlineStatus', $event as DeadlineFilter)"
    >
      <el-option
        v-for="opt in deadlineOptions"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>

    <el-button class="filter-item reset-btn" @click="emit('reset')">清空筛选</el-button>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.filter-item {
  width: 180px;
}
.reset-btn {
  width: auto;
}
@media (max-width: 720px) {
  .filter-item {
    width: calc(50% - 5px);
  }
  .reset-btn {
    width: 100%;
  }
}
</style>
