<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import { createSource, getSources, probeSourceUrl, searchSourceSites } from '@/api/sources'
import type {
  SourceItem,
  SourceProbeResult,
  SourceSearchResult,
} from '@/types/notice'
import { getSelectedSourceIds, isSourceSubscribed, toggleSourceId } from '@/utils/sourcePrefs'

const loading = ref(true)
const error = ref('')
const sources = ref<SourceItem[]>([])
/** 订阅状态映射，驱动开关显示 */
const subscribedMap = ref<Record<number, boolean>>({})

/** 添加信息源弹窗 */
const dialogVisible = ref(false)
const activeTab = ref<'search' | 'url'>('search')
const keyword = ref('')
const searchResults = ref<SourceSearchResult[]>([])
const searching = ref(false)
const searched = ref(false)
const urlInput = ref('')
const probing = ref(false)
const probeResult = ref<SourceProbeResult | null>(null)
const formName = ref('')
const formUrl = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    sources.value = await getSources()
    const map: Record<number, boolean> = {}
    for (const s of sources.value) map[s.id] = isSourceSubscribed(s.id)
    subscribedMap.value = map
  } catch {
    error.value = '信息源加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onToggle(id: number, val: boolean) {
  // 传入全部来源 ID：首次操作时才能正确地把「全部订阅」展开成显式列表
  const nowOn = toggleSourceId(
    id,
    sources.value.map((s) => s.id),
  )
  subscribedMap.value = { ...subscribedMap.value, [id]: nowOn }
  const ids = getSelectedSourceIds()
  ElMessage.success(nowOn ? '已订阅，首页将展示该来源' : '已取消订阅')
  if (ids && ids.length === 0) {
    ElMessage.warning('已取消全部订阅，首页将没有内容可展示')
  }
  void val
}

function openAdd() {
  dialogVisible.value = true
  activeTab.value = 'search'
  keyword.value = ''
  searchResults.value = []
  searched.value = false
  urlInput.value = ''
  probeResult.value = null
  formName.value = ''
  formUrl.value = ''
}

async function runSearch() {
  if (!keyword.value.trim()) return
  searching.value = true
  searched.value = true
  try {
    searchResults.value = await searchSourceSites(keyword.value)
    if (!searchResults.value.length) ElMessage.info('没有搜到匹配站点，试试直接粘贴网址')
  } catch {
    searchResults.value = []
    ElMessage.warning('联网搜索暂时不可用，可以直接粘贴网址添加')
  } finally {
    searching.value = false
  }
}

function chooseResult(item: SourceSearchResult) {
  formUrl.value = item.url
  formName.value = item.title
  urlInput.value = item.url
  void runProbe(item.url)
}

async function runProbe(url = urlInput.value) {
  if (!url.trim()) {
    ElMessage.warning('请先填写网址')
    return
  }
  probing.value = true
  try {
    const result = await probeSourceUrl(url.trim())
    probeResult.value = result
    formUrl.value = url.trim()
    if (!formName.value) formName.value = result.name
  } catch {
    ElMessage.warning('探测失败，仍可尝试添加后再同步验证')
  } finally {
    probing.value = false
  }
}

async function submitAdd() {
  if (!formName.value.trim() || !formUrl.value.trim()) {
    ElMessage.warning('请填写信息源名称和网址')
    return
  }
  submitting.value = true
  try {
    const created = await createSource({
      name: formName.value.trim(),
      url: formUrl.value.trim(),
      content_types: '自定义来源',
    })
    sources.value = [...sources.value, created]
    subscribedMap.value = { ...subscribedMap.value, [created.id]: true }
    dialogVisible.value = false
    ElMessage.success('已添加，下一次同步后开始采集这个网站')
  } catch (e) {
    const message = e instanceof Error ? e.message : '添加失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="zg-container sources-page">
    <div class="page-head source-page-head">
      <div>
        <h1>信息源管理</h1>
        <p>先选你关注的来源，也可以联网搜索新网站并添加</p>
      </div>
      <el-button type="primary" @click="openAdd">+ 添加信息源</el-button>
    </div>

    <div v-if="loading" class="source-grid">
      <div v-for="i in 3" :key="i" class="zg-card source-card">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 50%; height: 22px" />
            <el-skeleton-item variant="text" style="width: 90%; height: 16px" />
            <el-skeleton-item variant="text" style="width: 60%; height: 16px" />
          </template>
        </el-skeleton>
      </div>
    </div>

    <EmptyState v-else-if="error" title="信息源加载失败" :description="error">
      <el-button type="primary" @click="load">重新加载</el-button>
    </EmptyState>

    <EmptyState
      v-else-if="sources.length === 0"
      title="暂无信息源"
      description="点击右上角「添加信息源」搜索或粘贴一个网站"
    />

    <template v-else>
      <div class="source-grid">
        <div v-for="s in sources" :key="s.id" class="zg-card source-card">
          <div class="source-head">
            <div class="source-name">
              {{ s.name }}
              <el-tag v-if="s.is_custom" size="small" type="success" effect="plain">自定义</el-tag>
            </div>
            <div class="source-toggle">
              <span class="toggle-label">{{ subscribedMap[s.id] ? '已订阅' : '未订阅' }}</span>
              <el-switch
                :model-value="subscribedMap[s.id] ?? false"
                @change="(val: string | number | boolean) => onToggle(s.id, Boolean(val))"
              />
            </div>
          </div>
          <div class="source-types">{{ s.content_types }}</div>
          <a class="source-url" :href="s.url" target="_blank" rel="noopener">{{ s.url }} ↗</a>
          <div class="source-sync">最近同步：{{ s.last_synced_at ?? '暂未同步' }}</div>
        </div>
      </div>

      <el-alert
        class="tip"
        type="info"
        :closable="false"
        title="订阅偏好仅保存在当前浏览器；自定义信息源会写入服务端，下一次定时同步后开始采集。"
      />
    </template>

    <el-dialog v-model="dialogVisible" title="添加信息源" width="720px" class="add-dialog">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="关键词搜索" name="search">
          <p class="dialog-hint">像搜索引擎一样输入关键词，找到学校站点后一键填入并探测。</p>
          <el-input
            v-model="keyword"
            placeholder="例如：成都大学 教务处 通知、奖学金公示、就业信息"
            clearable
            @keyup.enter="runSearch"
          >
            <template #append>
              <el-button :loading="searching" @click="runSearch">搜索网站</el-button>
            </template>
          </el-input>

          <div v-if="searching" class="result-list">
            <el-skeleton v-for="i in 3" :key="i" :rows="2" animated class="result-skeleton" />
          </div>
          <div v-else-if="searched && !searchResults.length" class="dialog-empty">
            没有找到候选站点。切换到「粘贴网址」直接添加。
          </div>
          <div v-else class="result-list">
            <button
              v-for="item in searchResults"
              :key="item.url"
              type="button"
              class="result-item"
              :class="{ selected: formUrl === item.url }"
              @click="chooseResult(item)"
            >
              <span class="result-title">{{ item.title }}</span>
              <span class="result-url">{{ item.domain }}</span>
              <span class="result-snippet">{{ item.snippet }}</span>
            </button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="粘贴网址" name="url">
          <p class="dialog-hint">已有通知列表页地址？粘贴后先探测能否采集，再确认添加。</p>
          <el-input v-model="urlInput" placeholder="https://example.edu.cn/index/tzgg.htm" clearable>
            <template #append>
              <el-button :loading="probing" @click="runProbe()">探测网址</el-button>
            </template>
          </el-input>
          <div v-if="probeResult" class="probe-panel" :class="{ bad: !probeResult.ok }">
            <strong>{{ probeResult.ok ? '可以采集' : '需要确认' }}</strong>
            <p>{{ probeResult.reason }}</p>
            <ul v-if="probeResult.samples.length">
              <li v-for="(sample, i) in probeResult.samples" :key="i">{{ sample }}</li>
            </ul>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="add-form">
        <div class="form-row">
          <label>信息源名称</label>
          <el-input v-model="formName" placeholder="例如：教务处 · 通知公告" />
        </div>
        <div class="form-row">
          <label>列表页网址</label>
          <el-input v-model="formUrl" placeholder="https://..." />
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAdd">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sources-page {
  padding-bottom: 40px;
}
.source-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.source-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.source-name {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.source-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.toggle-label {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.source-types {
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.source-url {
  font-size: 13px;
  word-break: break-all;
}
.source-sync {
  font-size: 12.5px;
  color: var(--zg-text-secondary);
}
.tip {
  border-radius: 10px;
}
.dialog-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 240px;
  overflow-y: auto;
}
.result-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--zg-border);
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: var(--zg-text);
}
.result-item:hover,
.result-item.selected {
  border-color: var(--zg-primary);
  background: var(--zg-primary-light);
}
.result-title {
  font-size: 14px;
  font-weight: 600;
}
.result-url {
  font-size: 12px;
  color: var(--zg-primary);
}
.result-snippet {
  font-size: 12px;
  color: var(--zg-text-secondary);
  line-height: 1.5;
}
.dialog-empty {
  padding: 20px;
  text-align: center;
  color: var(--zg-text-secondary);
  font-size: 13px;
}
.probe-panel {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--zg-primary-light);
  color: var(--zg-primary);
}
.probe-panel.bad {
  background: #fff7e8;
  color: #8a5a12;
}
.probe-panel p {
  margin: 4px 0 0;
  font-size: 13px;
}
.probe-panel ul {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
}
.add-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--zg-border);
}
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.form-row label {
  flex: 0 0 90px;
  font-size: 13px;
  color: var(--zg-text-secondary);
}
.result-skeleton {
  padding: 8px;
}
@media (max-width: 720px) {
  .source-page-head {
    align-items: flex-start;
  }
  .source-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
}
</style>
