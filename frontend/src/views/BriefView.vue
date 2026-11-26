<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import BriefActionCard from '@/components/BriefActionCard.vue'
import DeadlineBadge from '@/components/DeadlineBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getBriefData, type BriefData } from '@/api/brief'
import { formatDate } from '@/utils/date'
import { briefHeadline } from '@/utils/brief'
import { getCategorySpec } from '@/config/categories'
import { getFavoriteIds, toggleFavorite as toggleFavStore } from '@/utils/favorites'
import { isCategoryFocused, toggleFocusedCategory } from '@/utils/categoryPrefs'

const route = useRoute()
const router = useRouter()
/** 新网站带来的类别不在预置 14 类里，也照样能打开它的分类页 */
const category = computed(() => {
  const raw = route.params.category
  if (typeof raw !== 'string' || !raw.trim()) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
})
const categorySpec = computed(() => (category.value ? getCategorySpec(category.value) : null))
const subscribed = ref(false)
const data = ref<BriefData | null>(null)
const loading = ref(true)
const error = ref('')
const keyword = ref('')
const favoriteIds = ref<number[]>(getFavoriteIds())

const headline = computed(() => briefHeadline(data.value?.urgentTotal ?? 0, category.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await getBriefData(category.value || undefined)
    subscribed.value = category.value ? isCategoryFocused(category.value) : false
  } catch {
    error.value = '简报加载失败，请检查后端服务后重试'
  } finally {
    loading.value = false
  }
}

function onToggleSubscribe() {
  if (!category.value) return
  const now = toggleFocusedCategory(category.value)
  subscribed.value = now
  ElMessage.success(now ? '已订阅，首页会放大显示这一类' : '已取消订阅，首页不再显示这一类')
}

function goSearch() {
  router.push({ path: '/notices', query: keyword.value.trim() ? { q: keyword.value.trim() } : {} })
}

function goList(query: Record<string, string>) {
  router.push({ path: '/notices', query: category.value ? { ...query, category: category.value } : query })
}

function onToggleFavorite(id: number) {
  toggleFavStore(id)
  favoriteIds.value = getFavoriteIds()
  ElMessage.success(favoriteIds.value.includes(id) ? '已加入收藏' : '已取消收藏')
}

watch(() => route.params.category, load)

onMounted(load)
</script>

<template>
  <div class="brief-view">
    <section class="brief-hero">
      <div class="zg-container brief-hero-inner">
        <div class="brief-eyebrow">
          {{ category ? `知更 AI · ${category}简报` : '知更 AI · 今日简报' }}
        </div>
        <h1>{{ error ? '先看看今天的情况' : headline }}</h1>
        <p v-if="data" class="brief-sub">
          {{ categorySpec?.description ?? '把散落的校园通知，整理成你今天该做的事' }} ·
          共 {{ data.total }} 条{{ category ? `${category}通知` : '通知' }}，按截止时间排序
        </p>
        <p v-else class="brief-sub">把散落的校园通知，整理成你今天该做的事</p>
        <el-button v-if="category" size="small" :type="subscribed ? 'default' : 'primary'" plain class="subscribe-btn" @click="onToggleSubscribe">
          {{ subscribed ? '已订阅 · 点击取消' : '订阅到首页' }}
        </el-button>
        <div class="brief-search">
          <el-input
            v-model="keyword"
            placeholder="还想找点什么？试试竞赛、社会实践、讲座…"
            size="large"
            clearable
            @keyup.enter="goSearch"
          >
            <template #append>
              <el-button type="primary" @click="goSearch">搜索全部</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </section>

    <div class="zg-container brief-content">
      <div v-if="loading" class="brief-loading">
        <el-skeleton :rows="1" animated class="skeleton-head" />
        <div class="kpi-grid">
          <el-skeleton v-for="i in 3" :key="i" :rows="2" animated class="skeleton-kpi" />
        </div>
        <el-skeleton v-for="i in 3" :key="i" :rows="4" animated class="skeleton-card" />
      </div>

      <EmptyState v-else-if="error" title="简报加载失败" :description="error">
        <el-button type="primary" @click="load">重试</el-button>
      </EmptyState>

      <template v-else-if="data">
        <div class="kpi-grid">
          <button class="kpi zg-card" type="button" @click="goList({ deadline_status: 'urgent' })">
            <span class="kpi-label">7 天内截止</span>
            <strong>{{ data.urgentTotal }}</strong>
            <span class="kpi-hint">还能报名 · 点击查看 →</span>
          </button>
          <button class="kpi zg-card" type="button" @click="goList({ sort: 'published' })">
            <span class="kpi-label">近 7 天新增</span>
            <strong>{{ data.recentTotal }}</strong>
            <span class="kpi-hint">刚发布的通知 →</span>
          </button>
          <button class="kpi zg-card" type="button" @click="goList({ deadline_status: 'unknown' })">
            <span class="kpi-label">截止待核实</span>
            <strong>{{ data.unknownTotal }}</strong>
            <span class="kpi-hint">原文未写明 · 需自行核对 →</span>
          </button>
        </div>

        <section class="brief-block">
          <div class="block-head">
            <div>
              <h2>优先处理</h2>
              <p>
                {{ category === '公示' ? '按公示期排序，只列仍在公示期内的条目' : '按截止时间排序，只列还能行动的机会' }}
              </p>
            </div>
            <router-link
              :to="{ path: '/notices', query: category ? { deadline_status: 'urgent', category } : { deadline_status: 'urgent' } }"
              class="block-link"
            >
              全部 {{ data.urgentTotal }} 条 →
            </router-link>
          </div>

          <div v-if="data.actions.length" class="action-list">
            <BriefActionCard
              v-for="action in data.actions"
              :key="action.notice.id"
              :action="action"
              :favorited="favoriteIds.includes(action.notice.id)"
              @toggle-favorite="onToggleFavorite"
            />
          </div>
          <EmptyState
            v-else
            :title="`这周没有临近截止的${category || '校园'}机会`"
            description="可以看看下面刚发布的通知，或者去全部通知里按类别逛逛"
          />
        </section>

        <section class="brief-block">
          <div class="block-head">
            <div>
              <h2>最近发布</h2>
              <p>还没来得及细看的，先扫一眼标题</p>
            </div>
            <router-link
              :to="{ path: '/notices', query: category ? { sort: 'published', category } : { sort: 'published' } }"
              class="block-link"
            >
              查看全部 →
            </router-link>
          </div>
          <div class="latest-list zg-card">
            <router-link
              v-for="n in data.latest"
              :key="n.id"
              :to="`/notice/${n.id}`"
              class="latest-row"
            >
              <span class="latest-date">{{ formatDate(n.published_at) }}</span>
              <span class="latest-title">{{ n.title }}</span>
              <DeadlineBadge :deadline-date="n.deadline_date" />
            </router-link>
          </div>
        </section>

        <p class="brief-disclaimer">
          以上行动信息由 AI 从通知原文提取，未找到依据的字段一律标为「待核实」；最终以来源官网原文为准。
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.brief-hero {
  background: linear-gradient(160deg, #eaf4ef 0%, #f6f9f7 58%, #fdf3e7 100%);
  border-bottom: 1px solid var(--zg-border);
  padding: 40px 0 36px;
}
.brief-hero-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brief-eyebrow {
  display: inline-block;
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
.brief-hero h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.brief-sub {
  margin: 8px 0 12px;
  color: var(--zg-text-secondary);
  font-size: 15px;
}
.subscribe-btn {
  margin-bottom: 8px;
}
.brief-search {
  width: 100%;
  max-width: 620px;
}
.brief-content {
  padding-top: 24px;
  padding-bottom: 40px;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 30px;
}
.kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 16px 20px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: var(--zg-text);
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.kpi:hover {
  border-color: var(--zg-primary);
  transform: translateY(-2px);
}
.kpi-label {
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.kpi strong {
  font-size: 30px;
  line-height: 1.3;
  color: var(--zg-primary);
}
.kpi-hint {
  font-size: 12px;
  color: var(--zg-primary);
}
.brief-block {
  margin-bottom: 30px;
}
.block-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.block-head h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}
.block-head p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.block-link {
  font-size: 13px;
  white-space: nowrap;
}
.action-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.latest-list {
  overflow: hidden;
}
.latest-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--zg-border);
  text-decoration: none;
  color: var(--zg-text);
}
.latest-row:last-child {
  border-bottom: none;
}
.latest-row:hover {
  background: var(--zg-bg);
  text-decoration: none;
}
.latest-date {
  flex: 0 0 64px;
  font-size: 13px;
  color: var(--zg-text-secondary);
  white-space: nowrap;
}
.latest-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brief-disclaimer {
  font-size: 12px;
  color: var(--zg-text-secondary);
  text-align: center;
  margin: 8px 0 0;
}
.brief-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-head,
.skeleton-kpi,
.skeleton-card {
  padding: 12px;
}
@media (max-width: 720px) {
  .brief-hero {
    padding: 28px 0 26px;
  }
  .brief-hero h1 {
    font-size: 23px;
  }
  .brief-sub {
    font-size: 13px;
  }
  .kpi-grid {
    gap: 8px;
  }
  .kpi {
    padding: 12px;
  }
  .kpi strong {
    font-size: 24px;
  }
  .kpi-hint {
    font-size: 11px;
  }
  .block-head {
    align-items: flex-start;
  }
  .block-head h2 {
    font-size: 17px;
  }
  .latest-row {
    padding: 12px;
    gap: 8px;
  }
  .latest-date {
    flex-basis: 58px;
    font-size: 12px;
  }
}
@media (max-width: 420px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
