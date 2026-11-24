<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, type CategoryKey } from '@/config/categories'
import { getNotices, getStats } from '@/api/notices'
import { getSources } from '@/api/sources'

interface CategoryCard {
  key: CategoryKey
  description: string
  total: number
  urgent: number
  latest: string
}

const router = useRouter()
const loading = ref(true)
const error = ref('')
const cards = ref<CategoryCard[]>([])
const keyword = ref('')
const sourceCount = ref(0)
const total = ref(0)

const urgentTotal = computed(() => cards.value.reduce((sum, c) => sum + c.urgent, 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [stats, sources] = await Promise.all([getStats(), getSources().catch(() => [])])
    total.value = stats.total
    sourceCount.value = sources.length

    const results = await Promise.all(
      CATEGORIES.map(async (spec) => {
        const [all, urgent] = await Promise.all([
          getNotices({ category: spec.key, sort: 'published', page_size: 1 }),
          getNotices({ category: spec.key, deadline_status: 'urgent', page_size: 1 }),
        ])
        return {
          key: spec.key,
          description: spec.description,
          total: all.total,
          urgent: urgent.total,
          latest: all.items[0]?.title ?? '',
        }
      }),
    )
    cards.value = results
  } catch {
    error.value = '分类数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
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
        <div class="brief-eyebrow">知更 AI · 校园机会雷达</div>
        <h1>先看分类，再看细节</h1>
        <p>把 {{ sourceCount }} 个校园网站的 {{ total }} 条通知分成五类，每类只看和你有关的字段</p>
        <div class="cat-search">
          <el-input
            v-model="keyword"
            size="large"
            clearable
            placeholder="不确定属于哪一类？直接搜关键词，例如「挑战杯」"
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
        <router-link to="/notices" class="cat-all-link">进入完整清单 →</router-link>
      </div>

      <div v-if="loading" class="cat-grid">
        <el-skeleton v-for="i in 5" :key="i" :rows="3" animated class="cat-skeleton" />
      </div>

      <div v-else-if="error" class="cat-error">
        <el-alert type="error" :title="error" :closable="false" show-icon />
        <el-button type="primary" @click="load">重新加载</el-button>
      </div>

      <template v-else>
        <div class="cat-grid">
          <button
            v-for="card in cards"
            :key="card.key"
            type="button"
            class="cat-card zg-card"
            @click="openCategory(card.key)"
          >
            <div class="cat-card-head">
              <h2>{{ card.key }}</h2>
              <span v-if="card.urgent" class="cat-urgent">{{ card.urgent }} 件临期</span>
            </div>
            <p class="cat-desc">{{ card.description }}</p>
            <div class="cat-numbers">
              <strong>{{ card.total }}</strong><span>条</span>
            </div>
            <p class="cat-latest">{{ card.latest || '这一类暂时没有通知' }}</p>
            <span class="cat-enter">查看{{ card.key }}简报 →</span>
          </button>
        </div>
        <p class="cat-note">
          每类提取的字段不同：竞赛看报名方式与团队规模，公示看公示期与异议反馈，讲座看主讲人与地点。
          所有字段均来自原文，找不到依据则标「待核实」。
        </p>
      </template>
    </div>
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
.cat-all-link {
  margin-left: auto;
  font-size: 13px;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.cat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 20px;
  text-align: left;
  font: inherit;
  color: var(--zg-text);
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.cat-card:hover {
  border-color: var(--zg-primary);
  transform: translateY(-2px);
}
.cat-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.cat-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.cat-urgent {
  font-size: 12px;
  color: var(--zg-danger);
  background: #fdecec;
  border-radius: 999px;
  padding: 2px 9px;
}
.cat-desc {
  margin: 0;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.cat-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 6px 0 2px;
}
.cat-numbers strong {
  font-size: 28px;
  color: var(--zg-primary);
}
.cat-numbers span {
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.cat-latest {
  margin: 0;
  font-size: 12.5px;
  color: var(--zg-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cat-enter {
  margin-top: auto;
  padding-top: 10px;
  font-size: 13px;
  color: var(--zg-primary);
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
    font-size: 24px;
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
  .cat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
