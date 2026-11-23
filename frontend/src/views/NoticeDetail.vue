<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import DeadlineBadge from '@/components/DeadlineBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getNoticeDetail } from '@/api/notices'
import type { NoticeDetail } from '@/types/notice'
import { formatDateFull } from '@/utils/date'
import { getFavoriteIds, toggleFavorite as toggleFavStore } from '@/utils/favorites'

const route = useRoute()
const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)
const detail = ref<NoticeDetail | null>(null)
const favorited = ref(false)

/** 原文证据字段中文名 */
const evidenceLabels: Record<string, string> = {
  deadline_date: '报名截止',
  deadline_time: '截止时间',
  application_method: '报名方式',
  audience: '参与对象',
  requirements: '报名要求',
  summary: '摘要',
}

const aiStatusLabel = computed(() => {
  if (!detail.value) return ''
  switch (detail.value.ai_status) {
    case 'done':
      return '已解析'
    case 'pending':
      return '信息整理中'
    default:
      return '解析失败'
  }
})

const aiStatusType = computed(() => {
  if (!detail.value) return 'info'
  switch (detail.value.ai_status) {
    case 'done':
      return 'success'
    case 'pending':
      return 'info'
    default:
      return 'danger'
  }
})

async function load() {
  const id = Number(route.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    detail.value = await getNoticeDetail(id)
    favorited.value = getFavoriteIds().includes(id)
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      notFound.value = true
    } else {
      loadError.value = '详情加载失败，请检查网络后重试'
    }
  } finally {
    loading.value = false
  }
}

function onToggleFavorite() {
  if (!detail.value) return
  toggleFavStore(detail.value.id)
  favorited.value = getFavoriteIds().includes(detail.value.id)
  ElMessage.success(favorited.value ? '已加入收藏' : '已取消收藏')
}

/** 字段值为空时统一显示「待核实」 */
function orPending(value: string | null | undefined): string {
  return value && value.trim() ? value : '待核实'
}

function joinOrPending(arr: string[] | undefined): string {
  return arr && arr.length ? arr.join('、') : '待核实'
}

onMounted(load)
watch(
  () => route.params.id,
  () => {
    if (route.name === 'notice-detail') load()
  },
)
</script>

<template>
  <div class="zg-container detail-page">
    <!-- 加载中 -->
    <div v-if="loading" class="skeleton-card zg-card">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="text" style="width: 40%; height: 22px" />
          <el-skeleton-item variant="text" style="width: 90%; height: 30px" />
          <el-skeleton-item variant="text" style="width: 100%; height: 16px" />
          <el-skeleton-item variant="text" style="width: 100%; height: 16px" />
          <el-skeleton-item variant="text" style="width: 70%; height: 16px" />
        </template>
      </el-skeleton>
    </div>

    <!-- 未找到 -->
    <EmptyState
      v-else-if="notFound"
      title="通知不存在或已下架"
      description="这条通知可能已被来源网站移除，返回首页看看其他机会吧"
    >
      <router-link to="/">
        <el-button type="primary">返回首页</el-button>
      </router-link>
    </EmptyState>

    <!-- 加载失败 -->
    <EmptyState v-else-if="loadError" title="内容加载失败" :description="loadError">
      <el-button type="primary" @click="load">重新加载</el-button>
    </EmptyState>

    <!-- 详情 -->
    <template v-else-if="detail">
      <!-- 第一部分：基本信息 -->
      <section class="section zg-card">
        <div class="head-row">
          <el-tag size="small" effect="plain">{{ detail.category }}</el-tag>
          <el-tag size="small" :type="aiStatusType" effect="light">{{ aiStatusLabel }}</el-tag>
          <DeadlineBadge :deadline-date="detail.deadline_date" />
        </div>
        <h1 class="detail-title">{{ detail.title }}</h1>
        <div class="meta-row">
          <span>🏷 {{ detail.source_name }}</span>
          <span>📅 发布于 {{ formatDateFull(detail.published_at) }}</span>
        </div>
      </section>

      <!-- 第二部分：AI 提取结果 -->
      <section class="section zg-card">
        <h2 class="section-title">AI 提取结果</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="AI 摘要">
            {{ orPending(detail.ai_status === 'done' ? detail.summary : null) }}
            <span v-if="detail.ai_status === 'pending'" class="hint">信息整理中</span>
            <span v-else-if="detail.ai_status === 'failed'" class="hint">
              AI 解析失败，以下字段可能缺失，请以原文为准
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="参与对象">
            {{ joinOrPending(detail.audience) }}
          </el-descriptions-item>
          <el-descriptions-item label="报名截止">
            {{ detail.deadline_date ? formatDateFull(detail.deadline_date) : '待核实' }}
            <span v-if="detail.deadline_time" class="hint">{{ detail.deadline_time }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="报名方式">
            {{ orPending(detail.application_method) }}
          </el-descriptions-item>
          <el-descriptions-item label="所需材料">
            <template v-if="detail.requirements && detail.requirements.length">
              <ul class="req-list">
                <li v-for="(r, i) in detail.requirements" :key="i">{{ r }}</li>
              </ul>
            </template>
            <span v-else>待核实</span>
          </el-descriptions-item>
          <el-descriptions-item label="信息状态">
            {{ aiStatusLabel }}
          </el-descriptions-item>
        </el-descriptions>
        <p class="disclaimer">
          以上为 AI 从原文提取的整理结果，仅供参考；无法确认的字段已标注「待核实」，请以原文为准。
        </p>
      </section>

      <!-- 第三部分：原文依据 -->
      <section class="section zg-card">
        <h2 class="section-title">原文依据</h2>
        <template v-if="detail.evidence && Object.keys(detail.evidence).length">
          <div v-for="(text, field) in detail.evidence" :key="field" class="evidence-item">
            <div class="evidence-field">{{ evidenceLabels[field] ?? field }}</div>
            <blockquote class="evidence-quote">「{{ text }}」</blockquote>
          </div>
        </template>
        <p v-else class="muted-text">暂无已核验的原文依据片段。</p>
      </section>

      <!-- 第四部分：操作 -->
      <section class="section zg-card">
        <h2 class="section-title">操作</h2>
        <div class="action-row">
          <el-button type="primary" tag="a" :href="detail.original_url" target="_blank" rel="noopener">
            查看原文 ↗
          </el-button>
          <el-button :type="favorited ? 'warning' : 'default'" @click="onToggleFavorite">
            {{ favorited ? '★ 已收藏' : '☆ 收藏通知' }}
          </el-button>
          <template v-if="detail.attachments && detail.attachments.length">
            <a
              v-for="att in detail.attachments"
              :key="att.url"
              :href="att.url"
              target="_blank"
              rel="noopener"
            >
              <el-button plain>📎 {{ att.name }}</el-button>
            </a>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section {
  padding: 22px 24px;
}
.section-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 700;
}
.head-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.detail-title {
  margin: 0 0 12px;
  font-size: 22px;
  line-height: 1.4;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  color: var(--zg-text-secondary);
  font-size: 14px;
}
.hint {
  margin-left: 8px;
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.req-list {
  margin: 0;
  padding-left: 18px;
}
.disclaimer {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.evidence-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--zg-border);
}
.evidence-item:last-child {
  border-bottom: none;
}
.evidence-field {
  font-weight: 600;
  font-size: 13px;
  color: var(--zg-primary);
  margin-bottom: 4px;
}
.evidence-quote {
  margin: 0;
  padding: 8px 14px;
  background: var(--zg-bg);
  border-left: 3px solid var(--zg-primary);
  border-radius: 6px;
  color: var(--zg-text);
  font-size: 14px;
}
.muted-text {
  color: var(--zg-text-secondary);
  font-size: 14px;
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.skeleton-card {
  padding: 24px;
}
@media (max-width: 720px) {
  .section {
    padding: 16px 14px;
  }
  .detail-title {
    font-size: 18px;
  }
}
</style>
