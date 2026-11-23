<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
}>()

function onInput(value: string) {
  emit('update:modelValue', value)
}
function onSubmit() {
  emit('search', props.modelValue.trim())
}
function onClear() {
  emit('update:modelValue', '')
  emit('search', '')
}
</script>

<template>
  <div class="search-bar">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder ?? '搜索竞赛、实践、讲座…'"
      size="large"
      clearable
      class="search-input"
      @update:model-value="onInput"
      @keyup.enter="onSubmit"
      @clear="onClear"
    >
      <template #prefix>
        <span aria-hidden="true">🔍</span>
      </template>
    </el-input>
    <el-button type="primary" size="large" class="search-btn" @click="onSubmit">搜索</el-button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 10px;
  width: 100%;
}
.search-input {
  flex: 1;
}
.search-btn {
  font-weight: 600;
}
@media (max-width: 540px) {
  .search-btn {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
