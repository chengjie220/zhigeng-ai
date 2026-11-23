<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import DeadlineBadge from '@/components/DeadlineBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getNoticeDetail } from '@/api/notices'
import type { NoticeDetail } from '@/types/notice'
import { formatDateFull } from '@/utils/date'
import { getFavoriteIds, toggleFavorite as toggleFavStore } from '@/utils/favorites'
import { containsText, splitByKeyword } from '@/utils/highlight'

const route = useRoute()
const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)
const detail = ref<NoticeDetail | null>(null)
const favorited = ref(false)

/** 正文是否展开、是否发生实际溢出、当前高亮的证据原文 */
const bodyExpanded = ref(false)
const bodyOverflow = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const activeEvidence = ref('')

/** 与 .body-text.collapsed 的 max-height 保持一致 */
const BODY_CLAMP_PX = 240

/** 正文按空行切成段落，再把当前高亮词切出来 */
const bodyParagraphs = computed(() => {
  const text = detail.value?.body_text?.trim() ?? ''
  if (!text) return []
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => splitByKeyword(p, activeEvidence.value))
})

const bodyCollapsed = computed(() => bodyOverflow.value && !bodyExpanded.value)

/**
 * 按真实渲染高度判断正文是否需要折叠。
 * 用字数阈值会让「字数多但排版后没超屏」的正文也显示「展开全文」，点击却没反应。
 */
async function measureBodyOverflow() {
  await nextTick()
  const el = bodyEl.value
  if (!el) {
    bodyOverflow.value = false
    return
  }
  bodyOverflow.value = el.scrollHeight > BODY_CLAMP_PX + 4
}

/** 切换到另一条通知时重置展开状态并按新正文重新测量 */
watch(
  () => detail.value?.id,
  () => {
    bodyExpanded.value = false
    bodyOverflow.value = false
    measureBodyOverflow()
  },
)

/** 高亮只会改变正文内容渲染，不应把用户手动展开的正文重新折叠 */
watch(activeEvidence, () => {
  measureBodyOverflow()
})

/** 点击「在正文中定位」：命中则展开并滚动到正文，未命中则提示去原文核对 */
function locateEvidence(text: string) {
  if (!detail.value) return
  if (!containsText(detail.value.body_text, text)) {
    ElMessage.info('这段依据不在已采集的正文中，请点击「查看原文」核对')
    return
  }
  activeEvidence.value = activeEvidence.value === text ? '' : text
  bodyExpanded.value = true
  nextTick(() => {
    document.getElementById('notice-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

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
    // 切换通知时重置正文展开与高亮状态
    bodyExpanded.value = false
    activeEvidence.value = ''
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

onMounted(() => {
  load()
  window.addEventListener('resize', measureBodyOverflow)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureBodyOverflow)
})
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
            <div class="evidence-head">
              <span class="evidence-field">{{ evidenceLabels[field] ?? field }}</span>
              <el-button link type="primary" size="small" @click="locateEvidence(text)">
                在正文中定位
              </el-button>
            </div>
            <blockquote class="evidence-quote" :class="{ active: activeEvidence === text }">
              「{{ text }}」
            </blockquote>
          </div>
        </template>
        <p v-else class="muted-text">暂无已核验的原文依据片段。</p>
      </section>

      <!-- 第四部分：原文正文（抓取清洗后的正文，用于原文打不开时核对） -->
      <section id="notice-body" class="section zg-card">
        <div class="body-head">
          <h2 class="section-title">原文正文</h2>
          <span class="body-source">抓取自 {{ detail.source_name }} · 仅做排版清洗</span>
        </div>

        <template v-if="bodyParagraphs.length">
          <div v-if="activeEvidence" class="highlight-tip">
            正在高亮「{{ activeEvidence }}」
            <el-button link type="primary" size="small" @click="activeEvidence = ''">取消高亮</el-button>
          </div>
          <div ref="bodyEl" class="body-text" :class="{ collapsed: bodyCollapsed }">
            <p v-for="(paragraph, i) in bodyParagraphs" :key="i">
              <template v-for="(seg, j) in paragraph" :key="j">
                <mark v-if="seg.hit" class="body-mark">{{ seg.text }}</mark>
                <template v-else>{{ seg.text }}</template>
              </template>
            </p>
          </div>
          <el-button v-if="bodyOverflow" link type="primary" @click="bodyExpanded = !bodyExpanded">
            {{ bodyExpanded ? '收起正文' : '展开全文' }}
          </el-button>
        </template>
        <p v-else class="muted-text">正文尚未采集完成，请点击「查看原文」前往来源网站。</p>

        <p class="disclaimer">
          正文由系统自动抓取，可能存在排版丢失或内容截断；如与来源页面不一致，以
          <a :href="detail.original_url" target="_blank" rel="noopener">原文</a> 为准。
        </p>
      </section>

      <!-- 第五部分：操作 -->
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
.evidence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.evidence-field {
  font-weight: 600;
  font-size: 13px;
  color: var(--zg-primary);
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
.evidence-quote.active {
  border-left-color: var(--zg-accent);
  background: #fdf3e7;
}
.body-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.body-source {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.highlight-tip {
  margin-bottom: 10px;
  padding: 6px 12px;
  background: #fdf3e7;
  border-radius: 6px;
  font-size: 13px;
  color: #8a5320;
}
.body-text {
  position: relative;
  font-size: 15px;
  line-height: 1.85;
  color: var(--zg-text);
  word-break: break-word;
}
.body-text p {
  margin: 0 0 12px;
  text-indent: 2em;
}
.body-text.collapsed {
  max-height: 240px;
  overflow: hidden;
}
.body-text.collapsed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff);
  pointer-events: none;
}
.body-mark {
  background: #ffe9c7;
  color: #7a4a10;
  padding: 1px 2px;
  border-radius: 3px;
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
