<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ASK_SUGGESTIONS, askQuestion } from '@/api/ai'
import type { ChatTurn } from '@/types/ai'
import DeadlineBadge from './DeadlineBadge.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const router = useRouter()
const input = ref('')
const loading = ref(false)
const turns = ref<ChatTurn[]>([])
const listRef = ref<HTMLElement | null>(null)

/** 窄屏铺满，避免固定 480px 在手机上溢出 */
const drawerSize = ref(typeof window !== 'undefined' && window.innerWidth < 560 ? '100%' : '480px')

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
  },
)

function close() {
  emit('update:modelValue', false)
}

async function scrollToBottom() {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function ask(question?: string) {
  const q = (question ?? input.value).trim()
  if (!q || loading.value) return
  input.value = ''
  turns.value.push({ role: 'user', content: q })
  loading.value = true
  await scrollToBottom()
  try {
    const res = await askQuestion(q)
    turns.value.push({
      role: 'assistant',
      content: res.answer,
      citations: res.citations,
      mode: res.mode,
    })
  } catch {
    turns.value.push({
      role: 'assistant',
      content: '没能拿到回答，可能是服务暂时不可用。可以稍后重试，或到「全部通知」里手动检索。',
      error: true,
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

function openNotice(id: number) {
  close()
  router.push(`/notice/${id}`)
}

function copySnippet(text: string) {
  navigator.clipboard
    ?.writeText(text)
    .then(() => ElMessage.success('已复制原文依据'))
    .catch(() => ElMessage.warning('复制失败，请手动选中'))
}
</script>

<template>
  <el-drawer
    v-model="visible"
    title="问知更"
    direction="rtl"
    :size="drawerSize"
    :with-header="true"
    class="ai-drawer"
    @update:model-value="(v: boolean) => !v && close()"
  >
    <div class="ai-body">
      <div ref="listRef" class="ai-list">
        <div v-if="turns.length === 0" class="ai-intro">
          <p class="ai-intro-title">用一句话问，直接给结论 + 原文依据</p>
          <p class="ai-intro-desc">只回答已采集到的校园通知里的内容，材料里没有的会直说，不编造。</p>
          <div class="ai-suggest">
            <button v-for="s in ASK_SUGGESTIONS" :key="s" class="ai-suggest-item" @click="ask(s)">
              {{ s }}
            </button>
          </div>
        </div>

        <div v-for="(turn, i) in turns" :key="i" class="ai-turn" :class="turn.role">
          <div class="ai-bubble" :class="{ error: turn.error }">
            <p class="ai-text">{{ turn.content }}</p>
          </div>

          <div v-if="turn.citations && turn.citations.length" class="ai-citations">
            <div class="ai-citations-head">
              原文依据 · {{ turn.citations.length }} 条
              <span v-if="turn.mode === 'rule'" class="ai-mode">规则检索</span>
            </div>
            <div v-for="c in turn.citations" :key="c.notice_id" class="ai-citation">
              <div class="ai-citation-title" @click="openNotice(c.notice_id)">{{ c.title }}</div>
              <blockquote class="ai-snippet" @click="copySnippet(c.snippet)">{{ c.snippet }}</blockquote>
              <div class="ai-citation-meta">
                <span class="ai-cat">{{ c.category }}</span>
                <DeadlineBadge :deadline-date="c.deadline_date" />
                <span class="ai-grow" />
                <el-button link type="primary" size="small" @click="openNotice(c.notice_id)">
                  查看原文
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="ai-turn assistant">
          <div class="ai-bubble typing"><span /><span /><span /></div>
        </div>
      </div>

      <div class="ai-input">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          resize="none"
          maxlength="200"
          placeholder="例如：这周有什么比赛能报名？"
          @keydown.enter.exact.prevent="ask()"
        />
        <el-button type="primary" :loading="loading" :disabled="!input.trim()" @click="ask()">
          提问
        </el-button>
      </div>
      <p class="ai-disclaimer">回答由 AI 基于已采集的公开通知整理，仅供参考，请以原文为准。</p>
    </div>
  </el-drawer>
</template>

<style scoped>
.ai-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}
:deep(.el-drawer__body) {
  display: flex;
  padding: 16px 20px;
  overflow: hidden;
}
.ai-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ai-intro {
  padding: 6px 2px;
}
.ai-intro-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--zg-text);
}
.ai-intro-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--zg-text-secondary);
}
.ai-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-suggest-item {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--zg-text);
  background: var(--zg-bg-soft, #f5f7fa);
  border: 1px solid var(--zg-border, #e5e7eb);
  border-radius: 999px;
  cursor: pointer;
}
.ai-suggest-item:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
.ai-turn {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-turn.user {
  align-items: flex-end;
}
.ai-bubble {
  max-width: 92%;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--zg-bg-soft, #f5f7fa);
  border: 1px solid var(--zg-border, #e5e7eb);
}
.ai-turn.user .ai-bubble {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.ai-turn.user .ai-text {
  color: #fff;
}
.ai-bubble.error {
  background: #fef0f0;
  border-color: #fbc4c4;
}
.ai-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--zg-text);
  white-space: pre-wrap;
}
.ai-bubble.typing {
  display: flex;
  gap: 4px;
  align-items: center;
}
.ai-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--zg-text-secondary);
  animation: ai-blink 1.2s infinite ease-in-out;
}
.ai-bubble.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.ai-bubble.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes ai-blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
.ai-citations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-citations-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--zg-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-mode {
  font-weight: 400;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--zg-bg-soft, #f5f7fa);
}
.ai-citation {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--zg-border, #e5e7eb);
  background: var(--zg-card, #fff);
}
.ai-citation-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--zg-text);
  cursor: pointer;
}
.ai-citation-title:hover {
  color: var(--el-color-primary);
}
.ai-snippet {
  margin: 6px 0 8px;
  padding: 6px 10px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--zg-text-secondary);
  border-left: 3px solid var(--el-color-primary-light-5);
  background: var(--zg-bg-soft, #f5f7fa);
  cursor: copy;
}
.ai-citation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ai-cat {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--zg-bg-soft, #f5f7fa);
  color: var(--zg-text-secondary);
}
.ai-grow {
  flex: 1;
}
.ai-input {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.ai-disclaimer {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--zg-text-secondary);
}
</style>
