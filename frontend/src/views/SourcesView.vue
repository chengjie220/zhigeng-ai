<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import { getSources } from '@/api/sources'
import type { SourceItem } from '@/types/notice'
import { getSelectedSourceIds, isSourceSubscribed, toggleSourceId } from '@/utils/sourcePrefs'

const loading = ref(true)
const error = ref('')
const sources = ref<SourceItem[]>([])
/** 订阅状态映射，驱动开关显示 */
const subscribedMap = ref<Record<number, boolean>>({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    sources.value = await getSources()
    const map: Record<number, boolean> = {}
    for (const s of sources.value) {
      map[s.id] = isSourceSubscribed(s.id)
    }
    subscribedMap.value = map
  } catch {
    error.value = '信息源加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onToggle(id: number, val: boolean) {
  const nowOn = toggleSourceId(id)
  subscribedMap.value = { ...subscribedMap.value, [id]: nowOn }
  const ids = getSelectedSourceIds()
  ElMessage.success(nowOn ? '已订阅，首页将展示该来源' : '已取消订阅')
  // 提示订阅范围
  if (ids && ids.length === 0) {
    ElMessage.warning('已取消全部订阅，首页将没有内容可展示')
  }
  void val
}

onMounted(load)
</script>

<template>
  <div class="zg-container sources-page">
    <div class="page-head">
      <h1>信息源管理</h1>
      <p>选择你关注的校园信息来源，首页将优先展示已订阅来源的通知</p>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="source-grid">
      <div v-for="i in 3" :key="i" class="zg-card source-card">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 50%; height: 22px" />
            <el-skeleton-item variant="text" style="width: 90%; height: 16px" />
            <el-skeleton-item variant="text" style="width: 60%; height: 16px" />
          </template>
        </el-skeleton>
      </div>
    </div>

    <EmptyState v-else-if="error" title="信息源加载失败" :description="error">
      <el-button type="primary" @click="load">重新加载</el-button>
    </EmptyState>

    <EmptyState
      v-else-if="sources.length === 0"
      title="暂无预置信息源"
      description="管理员还未配置采集来源，请稍后再来"
    />

    <template v-else>
      <div class="source-grid">
        <div v-for="s in sources" :key="s.id" class="zg-card source-card">
          <div class="source-head">
            <div class="source-name">{{ s.name }}</div>
            <div class="source-toggle">
              <span class="toggle-label">{{ subscribedMap[s.id] ? '已订阅' : '未订阅' }}</span>
              <el-switch
                :model-value="subscribedMap[s.id] ?? false"
                @change="(val: string | number | boolean) => onToggle(s.id, Boolean(val))"
              />
            </div>
          </div>
          <div class="source-types">{{ s.content_types }}</div>
          <a class="source-url" :href="s.url" target="_blank" rel="noopener">{{ s.url }} ↗</a>
          <div class="source-sync">
            最近同步：{{ s.last_synced_at ?? '暂未同步' }}
          </div>
        </div>
      </div>

      <el-alert
        class="tip"
        type="info"
        :closable="false"
        title="订阅偏好仅保存在当前浏览器（localStorage），不会触发后端重新抓取；系统维护一份公共通知数据库。"
      />
    </template>
  </div>
</template>

<style scoped>
.sources-page {
  padding-bottom: 40px;
}
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.source-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.source-name {
  font-size: 16px;
  font-weight: 700;
}
.source-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.toggle-label {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.source-types {
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.source-url {
  font-size: 13px;
  word-break: break-all;
}
.source-sync {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.tip {
  border-radius: 10px;
}
@media (max-width: 540px) {
  .source-grid {
    grid-template-columns: 1fr;
  }
}
</style>
