<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import NoticeCard from '@/components/NoticeCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getNoticeDetail } from '@/api/notices'
import type { NoticeItem } from '@/types/notice'
import { getFavoriteIds, removeFavorite } from '@/utils/favorites'
import { daysUntil } from '@/utils/date'

interface FavEntry {
  id: number
  notice: NoticeItem | null
  unavailable: boolean
}

const loading = ref(true)
const entries = ref<FavEntry[]>([])
const sortBy = ref<'deadline' | 'added'>('deadline')

async function load() {
  loading.value = true
  const ids = getFavoriteIds()
  const results = await Promise.allSettled(ids.map((id) => getNoticeDetail(id)))
  entries.value = ids.map((id, i) => {
    const r = results[i]
    if (r.status === 'fulfilled') {
      return { id, notice: r.value, unavailable: false }
    }
    return { id, notice: null, unavailable: true }
  })
  loading.value = false
}

/** 排序：按截止时间升序（待核实排最后）；或按收藏顺序 */
const sortedEntries = computed(() => {
  const list = [...entries.value]
  if (sortBy.value === 'added') return list
  return list.sort((a, b) => {
    const da = a.notice ? daysUntil(a.notice.deadline_date) : null
    const db = b.notice ? daysUntil(b.notice.deadline_date) : null
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })
})

function onRemove(id: number) {
  removeFavorite(id)
  entries.value = entries.value.filter((e) => e.id !== id)
  ElMessage.success('已取消收藏')
}

onMounted(load)
</script>

<template>
  <div class="zg-container favorites-page">
    <div class="page-head">
      <h1>我的收藏</h1>
      <p>按截止时间排列，快到期的机会排在前面</p>
    </div>

    <el-alert
      class="tip"
      type="info"
      :closable="false"
      title="收藏仅保存在当前浏览器，清除浏览器数据或更换设备后可能丢失。"
    />

    <!-- 工具条 -->
    <div v-if="!loading && entries.length" class="toolbar">
      <span class="count">共 {{ entries.length }} 条收藏</span>
      <el-radio-group v-model="sortBy" size="small">
        <el-radio-button value="deadline">按截止时间</el-radio-button>
        <el-radio-button value="added">按收藏顺序</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="fav-list">
      <div v-for="i in 2" :key="i" class="zg-card skeleton-card">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 40%; height: 20px" />
            <el-skeleton-item variant="text" style="width: 80%; height: 24px" />
            <el-skeleton-item variant="text" style="width: 60%; height: 16px" />
          </template>
        </el-skeleton>
      </div>
    </div>

    <EmptyState
      v-else-if="entries.length === 0"
      title="还没有收藏任何机会"
      description="在首页或详情页点击「收藏」，之后就能在这里快速查看"
    >
      <router-link to="/">
        <el-button type="primary">去发现校园机会</el-button>
      </router-link>
    </EmptyState>

    <div v-else class="fav-list">
      <template v-for="entry in sortedEntries" :key="entry.id">
        <!-- 已下架通知 -->
        <div v-if="entry.unavailable" class="zg-card unavailable-card">
          <div class="unavailable-title">通知已下架或不可用</div>
          <div class="unavailable-desc">该通知（ID: {{ entry.id }}）可能已被来源网站移除</div>
          <el-button size="small" plain @click="onRemove(entry.id)">从收藏中移除</el-button>
        </div>
        <NoticeCard
          v-else-if="entry.notice"
          :notice="entry.notice"
          :favorited="true"
          @toggle-favorite="onRemove"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.favorites-page {
  padding-bottom: 40px;
}
.tip {
  margin-bottom: 16px;
  border-radius: 10px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}
.count {
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.fav-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.unavailable-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  background: #fafafa;
}
.unavailable-title {
  font-weight: 700;
  color: var(--zg-text-secondary);
}
.unavailable-desc {
  font-size: 13px;
  color: var(--zg-text-secondary);
}
</style>
