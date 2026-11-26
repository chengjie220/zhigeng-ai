<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CATEGORY_KEYS,
  GROUPS,
  getGroupCategories,
  type CategoryKey,
  type GroupKey,
} from '@/config/categories'
import { getNotices, getStats } from '@/api/notices'
import { getSources } from '@/api/sources'
import { getFocusedCategories, setFocusedCategories } from '@/utils/categoryPrefs'
import type { NoticeItem } from '@/types/notice'

interface CategoryCard {
  key: CategoryKey
  total: number
  urgent: number
}

interface GroupCard {
  key: GroupKey
  description: string
  total: number
  urgent: number
  categories: CategoryCard[]
}

const router = useRouter()
const loading = ref(true)
const error = ref('')
const groups = ref<GroupCard[]>([])
const keyword = ref('')
const sourceCount = ref(0)
const total = ref(0)

const urgentTotal = computed(() => groups.value.reduce((sum, g) => sum + g.urgent, 0))
const focused = ref<CategoryKey[]>(getFocusedCategories())
const drawerVisible = ref(false)
const allItems = ref<NoticeItem[]>([])
const urgentItems = ref<NoticeItem[]>([])

/** 只按用户关注的类别聚合，切换关注无需重新请求接口 */
function recompute() {
  const watching = new Set<CategoryKey>(focused.value)
  const totalByCategory = new Map<string, number>()
  for (const n of allItems.value) {
    if (watching.has(n.category as CategoryKey)) {
      totalByCategory.set(n.category, (totalByCategory.get(n.category) ?? 0) + 1)
    }
  }
  const urgentByCategory = new Map<string, number>()
  for (const n of urgentItems.value) {
    if (watching.has(n.category as CategoryKey)) {
      urgentByCategory.set(n.category, (urgentByCategory.get(n.category) ?? 0) + 1)
    }
  }

  groups.value = GROUPS.map((group) => {
    const categories: CategoryCard[] = getGroupCategories(group.key)
      .filter((spec) => watching.has(spec.key))
      .map((spec) => ({
        key: spec.key,
        total: totalByCategory.get(spec.key) ?? 0,
        urgent: urgentByCategory.get(spec.key) ?? 0,
      }))
    return {
      key: group.key,
      description: group.description,
      total: categories.reduce((sum, c) => sum + c.total, 0),
      urgent: categories.reduce((sum, c) => sum + c.urgent, 0),
      categories,
    }
  }).filter((group) => group.categories.length > 0)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [stats, sources, all, urgent] = await Promise.all([
      getStats(),
      getSources().catch(() => []),
      getNotices({ sort: 'published', page_size: 100 }),
      getNotices({ deadline_status: 'urgent', page_size: 100 }),
    ])
    total.value = stats.total
    sourceCount.value = sources.length
    allItems.value = all.items
    urgentItems.value = urgent.items
    recompute()
  } catch {
    error.value = '分类数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function openFocusSettings() {
  focused.value = getFocusedCategories()
  drawerVisible.value = true
}

function saveFocus() {
  setFocusedCategories(focused.value)
  drawerVisible.value = false
  recompute()
}

function focusAll() {
  focused.value = [...CATEGORY_KEYS]
}

function openCategory(key: CategoryKey) {
  router.push(`/category/${encodeURIComponent(key)}`)
}

function goSearch() {
  router.push({ path: '/notices', query: keyword.value.trim() ? { q: keyword.value.trim() } : {} })
}

onMounted(load)
</script>

<template>
  <div class="category-home">
    <section class="cat-hero">
      <div class="zg-container cat-hero-inner">
        <div class="brief-eyebrow">知更 AI · 校园信息分组</div>
        <h1>先分三件事，再看具体通知</h1>
        <p>
          从 {{ sourceCount }} 个校园网站的 {{ total }} 条通知里，按「要不要参加 / 要不要办 / 只需知晓」分成三组
        </p>
        <div class="cat-search">
          <el-input
            v-model="keyword"
            size="large"
            clearable
            placeholder="不确定属于哪一组？直接搜关键词，例如「四六级」"
            @keyup.enter="goSearch"
          >
            <template #append>
              <el-button type="primary" @click="goSearch">搜索全部</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </section>

    <div class="zg-container cat-content">
      <div class="cat-summary zg-card">
        <div>
          <strong>{{ urgentTotal }}</strong>
          <span>件事即将截止</span>
        </div>
        <div>
          <strong>{{ total }}</strong>
          <span>条通知已整理</span>
        </div>
        <span class="focus-count">已关注 {{ focused.length }} / {{ CATEGORY_KEYS.length }} 类</span>
        <el-button type="primary" plain size="small" @click="openFocusSettings">选择重点关注类别</el-button>
        <router-link to="/notices" class="cat-all-link">进入完整清单 →</router-link>
      </div>

      <div v-if="loading" class="group-grid">
        <el-skeleton v-for="i in 3" :key="i" :rows="5" animated class="cat-skeleton" />
      </div>

      <div v-else-if="error" class="cat-error">
        <el-alert type="error" :title="error" :closable="false" show-icon />
        <el-button type="primary" @click="load">重新加载</el-button>
      </div>

      <div v-else-if="groups.length === 0" class="cat-empty zg-card">
        <h2>还没有关注任何类别</h2>
        <p>到设置里勾选你关心的类别，首页就会只展示这些通知。</p>
        <el-button type="primary" @click="openFocusSettings">选择重点关注类别</el-button>
      </div>

      <template v-else>
        <div class="group-grid">
          <section v-for="group in groups" :key="group.key" class="group-card zg-card">
            <header class="group-head">
              <h2>{{ group.key }}</h2>
              <span v-if="group.urgent" class="cat-urgent">{{ group.urgent }} 件临期</span>
            </header>
            <p class="group-desc">{{ group.description }}</p>
            <div class="group-numbers">
              <strong>{{ group.total }}</strong><span>条</span>
            </div>
            <ul class="group-categories">
              <li v-for="cat in group.categories" :key="cat.key">
                <button type="button" class="cat-chip" @click="openCategory(cat.key)">
                  <span>{{ cat.key }}</span>
                  <em>{{ cat.total }}</em>
                  <i v-if="cat.urgent">{{ cat.urgent }} 临期</i>
                </button>
              </li>
            </ul>
          </section>
        </div>
        <p class="cat-note">
          分类依据来自教务处官网真实发布内容：选修课督促、四六级考试、毕业设计属于「学业事务」；
          比选公告与结果公示属于「公告信息」。每组提取的关键词不同，字段无原文依据时标「待核实」。
        </p>
      </template>
    </div>

    <el-drawer v-model="drawerVisible" title="选择重点关注的类别" size="460px">
      <p class="drawer-tip">
        信息源会持续增加，类别也会变多。勾选你关心的类别，首页只展示这些部分；完整检索始终可以搜到全部通知。
      </p>
      <div v-for="group in GROUPS" :key="group.key" class="pref-group">
        <h3>{{ group.key }} <span>{{ group.description }}</span></h3>
        <el-checkbox-group v-model="focused">
          <el-checkbox
            v-for="spec in getGroupCategories(group.key)"
            :key="spec.key"
            :value="spec.key"
          >
            {{ spec.key }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="focusAll">全部关注</el-button>
          <el-button type="primary" @click="saveFocus">保存设置</el-button>
        </div>
      </template>
    </el-drawer>
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
.brief-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--zg-primary);
  background: #fff;
  border: 1px solid var(--zg-primary-light);
  border-radius: 999px;
  padding: 3px 12px;
  margin-bottom: 14px;
}
.cat-hero h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
}
.cat-hero p {
  margin: 8px 0 20px;
  color: var(--zg-text-secondary);
  font-size: 15px;
}
.cat-search {
  width: 100%;
  max-width: 640px;
}
.cat-content {
  padding-top: 24px;
  padding-bottom: 40px;
}
.cat-summary {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 16px 24px;
  margin-bottom: 20px;
}
.cat-summary > div {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.cat-summary strong {
  font-size: 24px;
  color: var(--zg-primary);
}
.cat-summary span {
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.focus-count {
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.cat-all-link {
  margin-left: auto;
  font-size: 13px;
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
.drawer-tip {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--zg-text-secondary);
}
.pref-group {
  margin-bottom: 20px;
}
.pref-group h3 {
  margin: 0 0 10px;
  font-size: 15px;
  border-bottom: 1px solid var(--zg-border);
  padding-bottom: 8px;
}
.pref-group h3 span {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--zg-text-secondary);
}
.pref-group :deep(.el-checkbox) {
  margin: 0 16px 8px 0;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  align-items: start;
}
.group-card {
  padding: 20px;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.group-head h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
}
.cat-urgent {
  font-size: 12px;
  color: var(--zg-danger);
  background: #fdecec;
  border-radius: 999px;
  padding: 2px 9px;
}
.group-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.group-numbers {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 14px 0 10px;
}
.group-numbers strong {
  font-size: 30px;
  color: var(--zg-primary);
}
.group-numbers span {
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.group-categories {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.cat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--zg-border);
  border-radius: 8px;
  background: #fff;
  color: var(--zg-text);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.cat-chip:hover {
  border-color: var(--zg-primary);
  background: var(--zg-primary-light);
}
.cat-chip span {
  font-weight: 600;
}
.cat-chip em {
  margin-left: auto;
  font-style: normal;
  color: var(--zg-text-secondary);
  font-size: 12px;
}
.cat-chip i {
  font-style: normal;
  font-size: 11px;
  color: var(--zg-danger);
}
.cat-note {
  margin: 18px 0 0;
  font-size: 12.5px;
  color: var(--zg-text-secondary);
  text-align: center;
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
    font-size: 13px;
  }
  .cat-summary {
    gap: 16px;
    padding: 12px;
    flex-wrap: wrap;
  }
  .cat-summary strong {
    font-size: 20px;
  }
  .cat-all-link {
    margin-left: 0;
  }
  .group-grid {
    grid-template-columns: 1fr;
  }
}
</style>
