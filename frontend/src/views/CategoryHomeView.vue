<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getNotices, getStats } from '@/api/notices'
import { getSources } from '@/api/sources'
import TimeBucketBoard from '@/components/TimeBucketBoard.vue'
import DeadlineBadge from '@/components/DeadlineBadge.vue'
import AiAssistantDrawer from '@/components/AiAssistantDrawer.vue'
import {
  buildDynamicCatalog,
  defaultFocusKeys,
  type DynamicCatalog,
  type DynamicCategory,
  type DynamicGroup,
} from '@/utils/dynamicCategories'
import {
  getFocusedCategories,
  hasFocusPreferences,
  setFocusedCategories,
} from '@/utils/categoryPrefs'
import type { NoticeItem } from '@/types/notice'

interface VisibleGroup extends DynamicGroup {
  categories: DynamicCategory[]
}

const router = useRouter()
const loading = ref(true)
const error = ref('')
const keyword = ref('')
const sourceCount = ref(0)
const total = ref(0)
const allItems = ref<NoticeItem[]>([])
const urgentItems = ref<NoticeItem[]>([])
const focused = ref<string[]>([])
const draft = ref<string[]>([])
const drawerVisible = ref(false)
const popoverVisible = ref(false)
const askVisible = ref(false)

function openAsk() {
  askVisible.value = true
}

/** 类别完全由当前已采集的通知推导：新增网站同步后首页自动重新分配 */
const catalog = computed<DynamicCatalog>(() =>
  buildDynamicCatalog(allItems.value, new Set(urgentItems.value.map((n) => n.id))),
)
const availableKeys = computed(() => catalog.value.categories.map((c) => c.key))
const subscribedCategories = computed(() =>
  catalog.value.categories.filter((c) => focused.value.includes(c.key)),
)
const otherCategories = computed(() =>
  catalog.value.categories.filter((c) => !focused.value.includes(c.key)),
)
const visibleGroups = computed<VisibleGroup[]>(() =>
  catalog.value.groups
    .map((group) => ({
      ...group,
      categories: group.categories.filter((c) => focused.value.includes(c.key)),
    }))
    .filter((group) => group.categories.length > 0),
)
const urgentTotal = computed(() =>
  subscribedCategories.value.reduce((sum, c) => sum + c.urgent, 0),
)
const noticesByCategory = computed(() => {
  const map = new Map<string, NoticeItem[]>()
  for (const notice of allItems.value) {
    const key = catalog.value.categoryOf.get(notice.id)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(notice)
  }
  return map
})

/** 首页时间板：已订阅类别的全部通知，按截止时间分桶 */
const timeBoardNotices = computed(() =>
  subscribedCategories.value.flatMap((c) => noticesByCategory.value.get(c.key) ?? []),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [stats, sources, all, urgent] = await Promise.all([
      getStats(),
      getSources().catch(() => []),
      getNotices({ sort: 'published', page_size: 200 }),
      getNotices({ deadline_status: 'urgent', page_size: 200 }),
    ])
    total.value = stats.total
    sourceCount.value = sources.length
    allItems.value = all.items
    urgentItems.value = urgent.items
    const available = catalog.value.categories.map((c) => c.key)
    focused.value = hasFocusPreferences()
      ? getFocusedCategories(available)
      : defaultFocusKeys(catalog.value.categories)
  } catch {
    error.value = '分类数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/** 即时保存的快捷订阅（下拉框、卡片取消订阅、其他类别的 +） */
function persist(next: string[]) {
  const keys = next.filter((key) => availableKeys.value.includes(key))
  setFocusedCategories(keys)
  focused.value = keys
}

function toggleQuick(key: string) {
  const next = new Set(focused.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  persist([...next])
}

function openSettings() {
  draft.value = [...focused.value]
  popoverVisible.value = false
  drawerVisible.value = true
}

function toggleDraft(key: string) {
  const next = new Set(draft.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  draft.value = [...next]
}

function subscribeAllDraft() {
  draft.value = [...availableKeys.value]
}

function clearDraft() {
  draft.value = []
}

function saveSettings() {
  persist(draft.value)
  drawerVisible.value = false
}

function openCategory(key: string) {
  router.push(`/category/${encodeURIComponent(key)}`)
}

function goSearch() {
  router.push({ path: '/notices', query: keyword.value.trim() ? { q: keyword.value.trim() } : {} })
}

/** 示例数据的前缀没有信息量，不占卡片空间 */
function cleanTitle(title: string): string {
  return title.replace(/^【示例】/, '')
}

onMounted(load)
</script>

<template>
  <div class="category-home">
    <section class="cat-hero">
      <div class="zg-container cat-hero-inner">
        <h1>首页只放你关心的事</h1>
        <p>{{ sourceCount }} 个网站 · {{ total }} 条通知 · {{ catalog.categories.length }} 类</p>
        <div class="cat-search-row">
          <div class="cat-search">
            <el-input
              v-model="keyword"
              size="large"
              clearable
              placeholder="搜索全部通知"
              @keyup.enter="goSearch"
            >
              <template #append>
                <el-button type="primary" @click="goSearch">搜索</el-button>
              </template>
            </el-input>
          </div>
          <el-button size="large" class="cat-ask-btn" @click="openAsk">
            <span class="cat-ask-spark">✦</span> 问知更
          </el-button>
        </div>
      </div>
    </section>

    <div class="zg-container cat-content">
      <div class="cat-summary zg-card">
        <div class="summary-main">
          <strong>{{ urgentTotal }}</strong><span>件临期</span>
          <i></i>
          <strong>{{ subscribedCategories.length }}</strong><span>类在首页</span>
        </div>
        <div class="summary-actions">
          <el-popover v-model:visible="popoverVisible" placement="bottom-end" :width="280" trigger="click">
            <template #reference>
              <el-button type="primary" plain>类别 {{ focused.length }}/{{ catalog.categories.length }} ▾</el-button>
            </template>
            <div class="popover-head">
              <strong>选择要放大显示的类别</strong>
              <el-button link type="primary" @click="openSettings">管理</el-button>
            </div>
            <div class="popover-list">
              <el-checkbox
                v-for="cat in catalog.categories"
                :key="cat.key"
                :model-value="focused.includes(cat.key)"
                @change="toggleQuick(cat.key)"
              >
                {{ cat.key }}
              </el-checkbox>
            </div>
          </el-popover>
          <router-link to="/notices" class="cat-all-link">全部通知 →</router-link>
        </div>
      </div>

      <div v-if="loading" class="group-grid">
        <el-skeleton v-for="i in 3" :key="i" :rows="5" animated class="cat-skeleton" />
      </div>

      <div v-else-if="error" class="cat-error">
        <el-alert type="error" :title="error" :closable="false" show-icon />
        <el-button type="primary" @click="load">重新加载</el-button>
      </div>

      <div v-else-if="catalog.categories.length === 0" class="cat-empty zg-card">
        <h2>还没有采集到通知</h2>
        <router-link to="/sources"><el-button type="primary">去添加网站</el-button></router-link>
      </div>

      <div v-else-if="visibleGroups.length === 0" class="cat-empty zg-card">
        <h2>还没有订阅任何类别</h2>
        <el-button type="primary" @click="openSettings">选择关注类别</el-button>
      </div>

      <template v-else>
        <TimeBucketBoard :notices="timeBoardNotices" />

        <section v-for="group in visibleGroups" :key="group.key" class="focus-group">
          <h2 class="focus-group-head">{{ group.key }}</h2>
          <div class="focus-grid">
            <article v-for="cat in group.categories" :key="cat.key" class="focus-card zg-card">
              <div class="focus-card-head">
                <h3>{{ cat.key }}</h3>
                <em v-if="cat.urgent">{{ cat.urgent }} 件临期</em>
              </div>
              <div class="focus-metrics"><strong>{{ cat.total }}</strong><span>条</span></div>
              <ul class="focus-items">
                <li v-for="notice in (noticesByCategory.get(cat.key) ?? []).slice(0, 2)" :key="notice.id">
                  <router-link :to="`/notice/${notice.id}`" class="focus-item-link">{{ cleanTitle(notice.title) }}</router-link>
                  <DeadlineBadge :deadline-date="notice.deadline_date" compact />
                </li>
              </ul>
              <button type="button" class="view-all" @click="openCategory(cat.key)">查看全部 →</button>
            </article>
          </div>
        </section>

        <section v-if="otherCategories.length" class="other-cats zg-card">
          <h2>其他类别</h2>
          <div class="other-chips">
            <div v-for="cat in otherCategories" :key="cat.key" class="other-chip">
              <button type="button" class="other-chip-main" @click="openCategory(cat.key)">
                {{ cat.key }} <em>{{ cat.total }}</em>
              </button>
              <button type="button" class="other-chip-add" title="订阅到首页" @click="toggleQuick(cat.key)">+</button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <el-drawer v-model="drawerVisible" title="管理类别订阅" size="520px">
      <div class="drawer-actions">
        <el-button @click="subscribeAllDraft">全部订阅</el-button>
        <el-button @click="clearDraft">清空选择</el-button>
      </div>
      <div v-for="group in catalog.groups" :key="group.key" class="pref-group">
        <h3>{{ group.key }}</h3>
        <div v-for="cat in group.categories" :key="cat.key" class="pref-row">
          <el-checkbox :model-value="draft.includes(cat.key)" @change="toggleDraft(cat.key)">
            {{ cat.key }} · {{ cat.total }} 条
          </el-checkbox>
          <el-button link type="primary" @click="openCategory(cat.key)">查看</el-button>
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </template>
    </el-drawer>

    <AiAssistantDrawer v-model="askVisible" />
  </div>
</template>

<style scoped>
.cat-hero {
  background: linear-gradient(160deg, #eaf4ef 0%, #f6f9f7 58%, #fdf3e7 100%);
  border-bottom: 1px solid var(--zg-border);
  padding: 42px 0 36px;
}
.cat-hero-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.cat-hero h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
}
.cat-hero p {
  margin: 10px 0 22px;
  color: var(--zg-text-secondary);
  font-size: 16px;
}
.cat-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 820px;
}
.cat-search {
  flex: 1;
  min-width: 0;
}
.cat-ask-btn {
  flex-shrink: 0;
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
  background: rgba(64, 128, 255, 0.06);
}
.cat-ask-spark {
  margin-right: 2px;
}
@media (max-width: 720px) {
  .cat-search-row {
    flex-direction: column;
    align-items: stretch;
  }
  .cat-ask-btn {
    width: 100%;
  }
}
.cat-content {
  padding-top: 24px;
  padding-bottom: 40px;
}
.cat-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 26px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.summary-main,
.summary-actions {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.summary-main i {
  width: 1px;
  height: 22px;
  margin: 0 8px;
  background: var(--zg-border);
}
.cat-summary strong {
  font-size: 30px;
  color: var(--zg-primary);
}
.cat-summary span {
  font-size: 16px;
  color: var(--zg-text-secondary);
}
.summary-actions {
  align-items: center;
}
.cat-all-link {
  font-size: 16px;
}
.popover-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--zg-border);
  font-size: 13px;
}
.popover-list {
  max-height: 280px;
  overflow-y: auto;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.popover-list :deep(.el-checkbox) {
  height: 28px;
  margin: 0;
}
.cat-empty {
  padding: 40px 20px;
  text-align: center;
}
.cat-empty h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.cat-empty p {
  margin: 0 0 16px;
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.drawer-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.pref-group {
  margin-bottom: 20px;
}
.pref-group h3 {
  margin: 0 0 8px;
  font-size: 15px;
  border-bottom: 1px solid var(--zg-border);
  padding-bottom: 8px;
}
.pref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.focus-group {
  margin-bottom: 34px;
}
.focus-group-head {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 700;
}
.focus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
  align-items: stretch;
}
.focus-card {
  padding: 24px 26px;
  display: flex;
  flex-direction: column;
}
.focus-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.focus-card-head h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
}
.focus-card-head em {
  flex: 0 0 auto;
  font-style: normal;
  font-size: 13px;
  color: var(--zg-danger);
  background: #fdecec;
  border-radius: 999px;
  padding: 3px 10px;
}
.focus-metrics {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 16px 0 14px;
}
.focus-metrics strong {
  font-size: 38px;
  color: var(--zg-primary);
  line-height: 1;
}
.focus-metrics span {
  font-size: 15px;
  color: var(--zg-text-secondary);
}
.focus-items {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.focus-items li {
  font-size: 15px;
  line-height: 1.5;
  display: flex;
  align-items: baseline;
  gap: 8px;
  justify-content: space-between;
}
.focus-item-link {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--zg-text);
  text-decoration: none;
  flex: 1;
  min-width: 0;
}
.focus-item-link:hover {
  color: var(--zg-primary);
}
.view-all {
  align-self: flex-start;
  margin-top: 18px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  color: var(--zg-primary);
  cursor: pointer;
}
.other-cats {
  padding: 22px 26px;
}
.other-cats h2 {
  margin: 0 0 14px;
  font-size: 20px;
}
.other-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.other-chip {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--zg-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.other-chip-main {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 10px 14px;
  font: inherit;
  font-size: 16px;
  color: var(--zg-text);
  cursor: pointer;
}
.other-chip-main:hover {
  background: var(--zg-primary-light);
}
.other-chip-main em {
  font-style: normal;
  font-size: 14px;
  color: var(--zg-text-secondary);
}
.other-chip-add {
  border: none;
  border-left: 1px solid var(--zg-border);
  background: var(--zg-bg);
  color: var(--zg-primary);
  font-size: 20px;
  width: 38px;
  cursor: pointer;
}
.other-chip-add:hover {
  background: var(--zg-primary-light);
}
.cat-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cat-skeleton {
  padding: 16px;
}
@media (max-width: 720px) {
  .cat-hero {
    padding: 28px 0 26px;
  }
  .cat-hero h1 {
    font-size: 23px;
  }
  .cat-hero p {
    font-size: 14px;
  }
  .cat-summary {
    gap: 14px;
    padding: 14px 16px;
  }
  .cat-summary strong {
    font-size: 20px;
  }
  .cat-all-link {
    margin-left: 0;
  }
  .focus-grid {
    grid-template-columns: 1fr;
  }
}
</style>
