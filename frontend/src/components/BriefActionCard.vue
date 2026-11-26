<script setup lang="ts">
import { computed } from 'vue'
import type { BriefAction } from '@/utils/brief'
import { formatDate } from '@/utils/date'
import { buildCategoryFields, getCategorySpec } from '@/config/categories'

const props = defineProps<{
  action: BriefAction
  favorited: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
}>()

/** 倒计时主数字：今天截止显示「今」，其余显示剩余天数 */
const countdown = computed(() => {
  const days = props.action.daysLeft
  if (days === null) return { number: '?', unit: '待核实' }
  if (days === 0) return { number: '今', unit: '天截止' }
  return { number: String(days), unit: '天后截止' }
})

/** 有具体报名方式时高亮，占位文案弱化显示 */
const isPlaceholder = computed(() => props.action.actionText.includes('待核实'))

/** 不同类别看不同字段：公示看公示对象/异议反馈，讲座看主讲人/地点，竞赛看级别/团队规模 */
const categoryFields = computed(() =>
  buildCategoryFields(props.action.detail, props.action.notice.category, 6).filter(
    (f) => {
      const category = props.action.notice.category
      // 已在顶部/上方展示过的内容不再重复占位
      if (category === '公示' && (f.label === '公示期至' || f.label === '异议反馈')) return false
      if (category === '升学就业' && ['报名截止', '报名方式', '报考对象'].includes(f.label)) {
        return false
      }
      if (category === '考试安排' && ['办理截止', '准考证打印'].includes(f.label)) return false
      if (category === '选课成绩' && ['完成截止', '办理事项'].includes(f.label)) return false
      if (category === '学籍毕业' && ['办理截止', '办理事项'].includes(f.label)) return false
      if (category === '招投标' && f.label === '异议截止') return false
      return true
    },
  ).slice(0, 3),
)

const actionLabel = computed(() => {
  const category = props.action.notice.category
  if (category === '公示' || category === '招投标') return '异议'
  if (category === '讲座') return '参与'
  if (category === '考试安排') return '应考'
  if (category === '选课成绩' || category === '学籍毕业') return '要办'
  return '下一步'
})

const countdownLabel = computed(() => {
  if (props.action.daysLeft === null) return '待核实'
  if (props.action.notice.category === '公示') return '公示期至'
  if (props.action.notice.category === '升学就业') {
    return props.action.daysLeft === 0 ? '今天报名' : '天后报名'
  }
  if (props.action.daysLeft === 0) return '天截止'
  return '天后截止'
})

const categoryDesc = computed(() => getCategorySpec(props.action.notice.category).description)
</script>

<template>
  <article class="brief-action zg-card">
    <div class="countdown" :class="{ today: action.daysLeft === 0 }">
      <strong>{{ countdown.number }}</strong>
      <span>{{ countdownLabel }}</span>
    </div>

    <div class="action-body">
      <div class="action-top">
        <el-tag size="small" effect="plain" disable-transitions :title="categoryDesc">
          {{ action.notice.category }}
        </el-tag>
        <span class="action-deadline">截止 {{ formatDate(action.notice.deadline_date) }}</span>
        <span v-if="action.detail?.evidence && Object.keys(action.detail.evidence).length" class="evidence-hint">
          有原文依据
        </span>
      </div>

      <router-link :to="`/notice/${action.notice.id}`" class="action-title">
        {{ action.notice.title }}
      </router-link>

      <div class="action-line" :class="{ placeholder: isPlaceholder }">
        <span class="line-label">{{ actionLabel }}</span>
        <span class="line-value">{{ action.actionText }}</span>
      </div>
      <div class="action-line">
        <span class="line-label">对象</span>
        <span class="line-value">{{ action.audienceText }}</span>
      </div>
      <div v-for="field in categoryFields" :key="field.label" class="action-line category-field">
        <span class="line-label">{{ field.label }}</span>
        <span class="line-value">{{ field.value }}</span>
      </div>

      <div class="action-footer">
        <span class="source-name">{{ action.notice.source_name }}</span>
        <div class="action-buttons">
          <el-button size="small" text :type="favorited ? 'warning' : 'default'" @click="emit('toggleFavorite', action.notice.id)">
            {{ favorited ? '★ 已收藏' : '☆ 收藏' }}
          </el-button>
          <router-link :to="`/notice/${action.notice.id}#evidence`">
            <el-button size="small" plain>看依据</el-button>
          </router-link>
          <router-link :to="`/notice/${action.notice.id}`">
            <el-button size="small" type="primary">查看详情</el-button>
          </router-link>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.brief-action {
  display: flex;
  gap: 18px;
  padding: 18px 20px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.brief-action:hover {
  box-shadow: 0 6px 18px rgba(34, 48, 43, 0.1);
  transform: translateY(-2px);
}
.countdown {
  flex: 0 0 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  padding: 10px 4px;
  border-radius: 10px;
  background: var(--zg-primary-light);
  color: var(--zg-primary);
  line-height: 1.2;
}
.countdown.today {
  background: #fdecec;
  color: var(--zg-danger);
}
.countdown strong {
  font-size: 28px;
  font-weight: 800;
}
.countdown span {
  font-size: 11px;
  margin-top: 4px;
}
.action-body {
  flex: 1;
  min-width: 0;
}
.action-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.action-deadline {
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.evidence-hint {
  font-size: 12px;
  color: var(--zg-primary);
}
.action-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: var(--zg-text);
  line-height: 1.45;
  text-decoration: none;
  margin-bottom: 10px;
}
.action-title:hover {
  color: var(--zg-primary);
  text-decoration: none;
}
.action-line {
  display: flex;
  gap: 10px;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 2px;
}
.line-label {
  flex: 0 0 40px;
  color: var(--zg-text-secondary);
  white-space: nowrap;
}
.line-value {
  color: var(--zg-text);
  word-break: break-all;
}
.action-line.placeholder .line-value {
  color: var(--zg-text-secondary);
}
.category-field {
  font-size: 12.5px;
}
.category-field .line-label {
  flex-basis: 64px;
  color: var(--zg-primary);
}
.action-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.source-name {
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
@media (max-width: 540px) {
  .brief-action {
    gap: 12px;
    padding: 14px;
  }
  .countdown {
    flex-basis: 58px;
  }
  .countdown strong {
    font-size: 22px;
  }
  .action-title {
    font-size: 15px;
  }
  .action-buttons {
    width: 100%;
    margin-left: 0;
  }
}
</style>
