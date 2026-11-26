<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import SearchBar from '@/components/SearchBar.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import NoticeCard from '@/components/NoticeCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getNotices } from '@/api/notices'
import { getSources } from '@/api/sources'
import type { DeadlineFilter, NoticeItem, NoticeSort, SourceItem } from '@/types/notice'
import { getFavoriteIds, toggleFavorite as toggleFavStore } from '@/utils/favorites'
import { getSelectedSourceIds } from '@/utils/sourcePrefs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const items = ref<NoticeItem[]>([])
const total = ref(0)
const pageSize = 10

/** keyword：输入框实时值；appliedKeyword：已生效的查询值（与 URL 的 q 同步） */
const keyword = ref('')
const appliedKeyword = ref('')
const category = ref('')
const sourceId = ref<number | ''>('')
const deadlineStatus = ref<DeadlineFilter>('all')
const sort = ref<NoticeSort>('deadline')
const page = ref(1)

const sources = ref<SourceItem[]>([])
const favoriteIds = ref<number[]>(getFavoriteIds())
/** 订阅过滤是否生效（null = 未设置过，展示全部来源） */
const subscribedIds = ref<number[] | null>(getSelectedSourceIds())

const sortOptions: { label: string; value: NoticeSort }[] = [
  { label: '最近截止优先', value: 'deadline' },
  { label: '最新发布优先', value: 'published' },
]

const hasActiveFilter = computed(
  () =>
    !!appliedKeyword.value ||
    !!category.value ||
    sourceId.value !== '' ||
    deadlineStatus.value !== 'all',
)

/** 当前页出现的类别 + URL 里的类别，避免新网站的动态类别在筛选下拉里消失 */
const categoryOptions = computed(() =>
  [...new Set([...items.value.map((n) => n.category), category.value])].filter(Boolean),
)

/** 当前生效的筛选条件摘要，让用户清楚「为什么只看到这几条」 */
const filterSummary = computed(() => {
  const parts: string[] = []
  if (appliedKeyword.value) parts.push(`关键词「${appliedKeyword.value}」`)
  if (category.value) parts.push(category.value)
  if (sourceId.value !== '') {
    const hit = sources.value.find((s) => s.id === sourceId.value)
    if (hit) parts.push(hit.name)
  }
  if (deadlineStatus.value === 'urgent') parts.push('7天内截止')
  if (deadlineStatus.value === 'upcoming') parts.push('未截止')
  if (deadlineStatus.value === 'expired') parts.push('已截止')
  if (deadlineStatus.value === 'unknown') parts.push('截止待核实')
  return parts.join(' · ')
})

/** 把 URL query 归一化成可比较的纯字符串对象 */
function normalizedQuery(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string' && value !== '') result[key] = value
  }
  return result
}

/**
 * 以当前 URL 为基础合并补丁后写回地址栏。
 * 返回 false 表示 URL 没有变化（此时调用方需要自己触发一次加载）。
 */
function updateQuery(patch: Record<string, string | number | undefined>): boolean {
  const before = normalizedQuery()
  const next: Record<string, string> = { ...before }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '' || value === null) delete next[key]
    else next[key] = String(value)
  }
  if (JSON.stringify(before) === JSON.stringify(next)) return false
  router.replace({ query: next })
  return true
}

/** 从 URL 读取筛选条件（刷新、分享、前进后退都会走这里） */
function hydrateFromQuery() {
  const q = route.query
  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  appliedKeyword.value = str(q.q)
  keyword.value = appliedKeyword.value
  category.value = str(q.category)
  const sid = Number(str(q.source_id))
  sourceId.value = Number.isInteger(sid) && sid > 0 ? sid : ''
  const ds = str(q.deadline_status)
  const deadlineValues: DeadlineFilter[] = ['all', 'urgent', 'upcoming', 'expired', 'unknown']
  deadlineStatus.value = deadlineValues.includes(ds as DeadlineFilter)
    ? (ds as DeadlineFilter)
    : 'all'
  sort.value = str(q.sort) === 'published' ? 'published' : 'deadline'
  const p = Number(str(q.page))
  page.value = Number.isInteger(p) && p > 1 ? p : 1
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const resp = await getNotices({
      q: appliedKeyword.value || undefined,
      category: category.value || undefined,
      source_id: sourceId.value === '' ? undefined : sourceId.value,
      source_ids: subscribedIds.value ?? undefined,
      deadline_status: deadlineStatus.value,
      sort: sort.value,
      page: page.value,
      page_size: pageSize,
    })
    items.value = resp.items
    total.value = resp.total
  } catch {
    error.value = '加载失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

/** URL 变化 → 同步状态 → 拉数据（唯一的数据加载入口） */
watch(
  () => route.query,
  () => {
    hydrateFromQuery()
    load()
  },
  { immediate: true },
)

function onSearch(value: string) {
  keyword.value = value
  appliedKeyword.value = value
  const changed = updateQuery({ q: value || undefined, page: undefined })
  if (!changed) load()
}

function onFilterChange() {
  const changed = updateQuery({
    category: category.value || undefined,
    source_id: sourceId.value === '' ? undefined : sourceId.value,
    deadline_status: deadlineStatus.value === 'all' ? undefined : deadlineStatus.value,
    page: undefined,
  })
  if (!changed) load()
}

function onSortChange(value: NoticeSort) {
  sort.value = value
  const changed = updateQuery({ sort: value === 'deadline' ? undefined : value, page: undefined })
  if (!changed) load()
}

function resetFilters() {
  keyword.value = ''
  appliedKeyword.value = ''
  category.value = ''
  sourceId.value = ''
  deadlineStatus.value = 'all'
  page.value = 1
  const changed = updateQuery({
    q: undefined,
    category: undefined,
    source_id: undefined,
    deadline_status: undefined,
    page: undefined,
  })
  if (!changed) load()
}

function onPageChange(p: number) {
  page.value = p
  const changed = updateQuery({ page: p > 1 ? p : undefined })
  if (!changed) load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onToggleFavorite(id: number) {
  toggleFavStore(id)
  favoriteIds.value = getFavoriteIds()
  ElMessage.success(favoriteIds.value.includes(id) ? '已加入收藏' : '已取消收藏')
}

onMounted(async () => {
  try {
    sources.value = await getSources()
  } catch {
    // 来源列表加载失败不阻塞首页，仅筛选下拉为空
  }
})
</script>

<template>
  <div class="home-view">
    <!-- 顶部介绍区 -->
    <section class="hero">
      <div class="zg-container hero-inner">
        <h1>别让校园机会从你身边溜走</h1>
        <p class="hero-sub">竞赛、实践、讲座与校园活动，一站发现</p>
        <SearchBar
          v-model="keyword"
          class="hero-search"
          placeholder="搜索竞赛、实践、讲座…"
          @search="onSearch"
        />
      </div>
    </section>

    <div class="zg-container content-area">
      <!-- 筛选区 -->
      <div class="filter-wrap">
        <FilterPanel
          v-model:category="category"
          v-model:source-id="sourceId"
          v-model:deadline-status="deadlineStatus"
          :sources="sources"
          :categories="categoryOptions"
          @update:category="onFilterChange"
          @update:source-id="onFilterChange"
          @update:deadline-status="onFilterChange"
          @reset="resetFilters"
        />
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="skeleton-list">
        <el-skeleton v-for="i in 3" :key="i" animated>
          <template #template>
            <div class="skeleton-card zg-card">
              <el-skeleton-item variant="text" style="width: 30%; height: 20px" />
              <el-skeleton-item variant="text" style="width: 80%; height: 24px" />
              <el-skeleton-item variant="text" style="width: 100%; height: 16px" />
              <el-skeleton-item variant="text" style="width: 60%; height: 16px" />
            </div>
          </template>
        </el-skeleton>
      </div>

      <!-- 加载失败 -->
      <EmptyState v-else-if="error" title="内容加载失败" :description="error">
        <el-button type="primary" @click="load">重新加载</el-button>
      </EmptyState>

      <!-- 空结果 -->
      <EmptyState
        v-else-if="items.length === 0"
        :title="hasActiveFilter ? '没有找到匹配的校园机会' : '暂时没有校园机会'"
        :description="
          hasActiveFilter
            ? `当前条件：${filterSummary || '未设置'}。试试减少筛选条件或换一个更宽泛的关键词。`
            : '管理员还未采集到通知，稍后再来看看'
        "
        show-clear
        @clear="resetFilters"
      />

      <!-- 结果列表 -->
      <template v-else>
        <div class="list-toolbar">
          <div class="result-count">
            共 {{ total }} 条校园机会
            <span v-if="filterSummary" class="count-filter">· {{ filterSummary }}</span>
            <router-link v-if="subscribedIds" to="/sources" class="count-sub">
              · 仅显示已订阅来源
            </router-link>
          </div>
          <el-select
            :model-value="sort"
            size="small"
            class="sort-select"
            @update:model-value="onSortChange"
          >
            <el-option
              v-for="opt in sortOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="notice-list">
          <NoticeCard
            v-for="n in items"
            :key="n.id"
            :notice="n"
            :favorited="favoriteIds.includes(n.id)"
            @toggle-favorite="onToggleFavorite"
          />
        </div>
        <div class="pager">
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="onPageChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(160deg, #eaf4ef 0%, #f6f9f7 60%, #fdf3e7 100%);
  border-bottom: 1px solid var(--zg-border);
  padding: 52px 0 44px;
  margin-bottom: 24px;
}
.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}
.hero h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 1px;
}
.hero-sub {
  margin: 0 0 12px;
  color: var(--zg-text-secondary);
  font-size: 16px;
}
.hero-search {
  max-width: 620px;
}
.content-area {
  padding-bottom: 40px;
}
.filter-wrap {
  margin-bottom: 18px;
}
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 2px 12px;
}
.result-count {
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.count-filter {
  color: var(--zg-primary);
}
.count-sub {
  color: var(--zg-text-secondary);
  text-decoration: none;
  border-bottom: 1px dashed currentColor;
}
.count-sub:hover {
  color: var(--zg-primary);
}
.sort-select {
  width: 132px;
  flex: none;
}
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-list {
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
.pager {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
@media (max-width: 720px) {
  .hero {
    padding: 36px 0 30px;
  }
  .hero h1 {
    font-size: 22px;
  }
  .hero-sub {
    font-size: 14px;
  }
  .result-count {
    flex: 1;
    min-width: 0;
  }
  .pager :deep(.el-pagination) {
    --el-pagination-font-size: 13px;
  }
}
</style>
