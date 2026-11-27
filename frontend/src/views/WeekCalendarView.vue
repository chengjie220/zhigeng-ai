<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWeekEvents } from '@/api/calendar'
import { getNotices } from '@/api/notices'
import type { CalendarEvent, WeekDay } from '@/types/calendar'
import type { NoticeItem } from '@/types/notice'
import { deadlineLabel, formatDate } from '@/utils/date'
import {
  buildWeekDays,
  isSameWeek,
  shiftWeek,
  startOfWeek,
  toISODate,
  weekRangeLabel,
} from '@/utils/weekGrid'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const events = ref<CalendarEvent[]>([])
const noticeCount = ref(0)
const disclaimer = ref('')
const monday = ref(startOfWeek())
/** 下周以后最近的几条，本周内容稀疏时页面不至于空着 */
const upcoming = ref<NoticeItem[]>([])

const days = computed<WeekDay[]>(() => buildWeekDays(monday.value, events.value))
const weekLabel = computed(() => weekRangeLabel(monday.value))
const isCurrentWeek = computed(() => isSameWeek(monday.value, new Date()))

const deadlineCount = computed(() => events.value.filter((e) => e.kind === 'deadline').length)
const eventCount = computed(() => events.value.filter((e) => e.kind === 'event').length)

/** 有事件的活跃日数，用于小结 */
const activeDays = computed(() => days.value.filter((d) => d.events.length > 0).length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getWeekEvents(toISODate(monday.value))
    // 后端以周一为起点，回填一次保证与展示对齐
    events.value = res.events
    noticeCount.value = res.notice_count
    disclaimer.value = res.disclaimer
  } catch {
    error.value = '这一周的日历没能加载出来，可能是网络或服务暂时不可用。'
    events.value = []
  } finally {
    loading.value = false
  }
}

function goWeek(offset: number) {
  monday.value = shiftWeek(monday.value, offset)
  load()
}

function goToday() {
  monday.value = startOfWeek()
  load()
}

function openNotice(id: number) {
  router.push(`/notice/${id}`)
}

/** 侧栏：下周一以后的截止，按最近优先 */
async function loadUpcoming() {
  try {
    const res = await getNotices({ deadline_status: 'upcoming', sort: 'deadline', page_size: 6 })
    upcoming.value = res.items
  } catch {
    upcoming.value = []
  }
}

onMounted(() => {
  load()
  loadUpcoming()
})
</script>

<template>
  <div class="week-page">
    <section class="week-hero">
      <div class="zg-container">
        <h1>我的本周日历</h1>
        <p class="week-sub">把截止、考试与活动铺到一周上，一眼看清哪天撞车</p>
      </div>
    </section>

    <div class="zg-container week-body">
      <div class="week-toolbar">
        <div class="week-nav">
          <el-button text @click="goWeek(-1)">‹ 上一周</el-button>
          <el-button :disabled="isCurrentWeek" @click="goToday">回到本周</el-button>
          <el-button text @click="goWeek(1)">下一周 ›</el-button>
        </div>
        <div class="week-range">
          {{ weekLabel }}
          <span v-if="isCurrentWeek" class="week-tag">本周</span>
        </div>
      </div>

      <div v-if="!loading && !error" class="week-summary">
        <span><b>{{ deadlineCount }}</b> 个截止</span>
        <span class="dot">·</span>
        <span><b>{{ eventCount }}</b> 个考试 / 活动</span>
        <span class="dot">·</span>
        <span>涉及 <b>{{ noticeCount }}</b> 条通知</span>
        <span class="dot">·</span>
        <span>分布在 <b>{{ activeDays }}</b> 天</span>
      </div>

      <el-skeleton v-if="loading" :rows="6" animated />

      <el-alert v-else-if="error" :title="error" type="error" :closable="false" show-icon>
        <template #default>
          <el-button size="small" @click="load">重试</el-button>
        </template>
      </el-alert>

      <template v-else>
        <el-alert
          v-if="events.length === 0"
          class="week-empty-tip"
          type="info"
          :closable="false"
          show-icon
          title="这一周没有写明具体日期的截止或活动"
          description="原文没写日期的通知不会被推测着塞进日历，它们在「全部通知」里标为「待核实」。可以翻到下一周，或直接去全部通知翻看。"
        />
        <div class="week-main">
          <div class="week-cal">
            <div class="week-grid">
          <div
            v-for="day in days"
            :key="day.date"
            class="week-col"
            :class="{ today: day.isToday, past: day.isPast }"
          >
            <header class="col-head">
              <span class="col-weekday">{{ day.weekday }}</span>
              <span class="col-day">{{ day.dayNum }}</span>
              <span v-if="day.isToday" class="col-today-tag">今天</span>
            </header>

            <div v-if="day.events.length === 0" class="col-empty">—</div>

            <button
              v-for="e in day.events"
              :key="`${e.notice_id}-${e.date}-${e.kind}`"
              type="button"
              class="event-card"
              :class="[e.kind, { past: day.isPast }]"
              @click="openNotice(e.notice_id)"
            >
              <div class="event-top">
                <span class="event-label">{{ e.label }}</span>
                <span v-if="e.time" class="event-time">{{ e.time }}</span>
              </div>
              <div class="event-title">{{ e.title }}</div>
              <div class="event-cat">{{ e.category }}</div>
            </button>
          </div>
        </div>

            <div class="week-legend">
              <span class="legend-item"><i class="swatch deadline" /> 报名/参与截止</span>
              <span class="legend-item"><i class="swatch event" /> 考试、活动等发生时间</span>
              <span class="legend-note">{{ disclaimer }}</span>
            </div>
          </div>

          <aside class="week-side">
            <div class="side-head">
              <h3>下周以后</h3>
              <p>本周没排上的，提前看一眼</p>
            </div>
            <div v-if="upcoming.length === 0" class="side-empty">暂时没有更远的截止日期</div>
            <button
              v-for="n in upcoming"
              :key="n.id"
              type="button"
              class="side-item"
              @click="openNotice(n.id)"
            >
              <div class="side-date">
                {{ formatDate(n.deadline_date) }}
                <span class="side-badge">{{ deadlineLabel(n.deadline_date, true) }}</span>
              </div>
              <div class="side-title">{{ n.title }}</div>
            </button>
            <router-link to="/notices" class="side-more">查看全部通知 →</router-link>
          </aside>
        </div>

        <div class="week-foot">
          <router-link to="/notices">
            <el-button>去「全部通知」按截止时间翻看</el-button>
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.week-page {
  padding-bottom: 48px;
}
.week-hero {
  padding: 34px 0 26px;
  background: linear-gradient(160deg, rgba(46, 125, 96, 0.1), rgba(46, 125, 96, 0.02));
  border-bottom: 1px solid var(--zg-border, #e8ecef);
}
.week-hero h1 {
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: -0.5px;
}
.week-sub {
  margin: 0;
  color: var(--zg-text-secondary);
}
.week-body {
  padding-top: 22px;
}
.week-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.week-range {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-tag {
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  color: #2e7d60;
  background: rgba(46, 125, 96, 0.12);
}
.week-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: var(--zg-text-secondary);
  margin-bottom: 16px;
}
.week-summary b {
  color: var(--zg-text);
  font-size: 15px;
}
.dot {
  opacity: 0.45;
}
.week-empty-tip {
  margin-bottom: 14px;
}
.week-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 18px;
  align-items: start;
}
.week-cal {
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}
.week-side {
  padding: 14px 14px 12px;
  border: 1px solid var(--zg-border, #e8ecef);
  border-radius: 12px;
  background: var(--zg-card, #fff);
}
.side-head h3 {
  margin: 0 0 3px;
  font-size: 15px;
}
.side-head p {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--zg-text-secondary);
}
.side-empty {
  padding: 10px 0;
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.side-item {
  display: block;
  width: 100%;
  padding: 9px 0;
  text-align: left;
  border: none;
  border-top: 1px dashed var(--zg-border, #e8ecef);
  background: transparent;
  cursor: pointer;
  font: inherit;
}
.side-item:hover .side-title {
  color: #2e7d60;
}
.side-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--zg-text);
  margin-bottom: 3px;
}
.side-badge {
  font-weight: 400;
  color: var(--zg-text-secondary);
}
.side-title {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--zg-text);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.side-more {
  display: block;
  margin-top: 10px;
  font-size: 12.5px;
  color: #2e7d60;
  text-decoration: none;
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 10px;
  min-width: 860px;
}
.week-col {
  min-height: 230px;
  padding: 10px 9px 12px;
  border: 1px solid var(--zg-border, #e8ecef);
  border-radius: 12px;
  background: var(--zg-card, #fff);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.week-col.today {
  border-color: #2e7d60;
  box-shadow: 0 0 0 1px rgba(46, 125, 96, 0.25);
}
.week-col.past {
  background: rgba(0, 0, 0, 0.015);
}
.col-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--zg-border, #e8ecef);
}
.col-weekday {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.col-day {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.week-col.today .col-day {
  color: #2e7d60;
}
.col-today-tag {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #2e7d60;
}
.col-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--zg-text-secondary);
  opacity: 0.35;
}
.event-card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 9px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: rgba(46, 125, 96, 0.07);
  cursor: pointer;
  font: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.event-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.event-card.event {
  background: rgba(230, 145, 56, 0.1);
}
.event-card.past {
  opacity: 0.55;
}
.event-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.event-label {
  font-size: 11px;
  font-weight: 700;
  color: #2e7d60;
}
.event-card.event .event-label {
  color: #b4671c;
}
.event-time {
  font-size: 11px;
  color: var(--zg-text-secondary);
}
.event-title {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--zg-text);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
.event-cat {
  margin-top: 5px;
  font-size: 11px;
  color: var(--zg-text-secondary);
}
.week-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}
.swatch.deadline {
  background: rgba(46, 125, 96, 0.55);
}
.swatch.event {
  background: rgba(230, 145, 56, 0.65);
}
.legend-note {
  flex: 1 1 320px;
  min-width: 240px;
}
.week-foot {
  margin-top: 26px;
}

/* 侧栏挤占宽度会让第 7 列被横向滚动吃掉，所以窄于 1400 时改为上下堆叠 */
@media (max-width: 1400px) {
  .week-main {
    grid-template-columns: minmax(0, 1fr);
  }
  /* 堆叠后条目横向平铺，避免变成又长又窄的一列 */
  .week-side {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    column-gap: 18px;
  }
  .side-head,
  .side-more {
    grid-column: 1 / -1;
  }
}
@media (max-width: 900px) {
  .week-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
  }
  .week-col {
    min-height: 150px;
  }
}
@media (max-width: 560px) {
  .week-grid {
    grid-template-columns: 1fr;
    min-width: 0;
  }
  .week-col {
    min-height: 0;
  }
  .col-empty {
    display: none;
  }
  .week-hero h1 {
    font-size: 23px;
  }
}
</style>
