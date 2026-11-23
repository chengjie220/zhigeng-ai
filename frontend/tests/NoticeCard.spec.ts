import { describe, expect, it } from 'vitest'
import { RouterLinkStub, mount } from '@vue/test-utils'
import NoticeCard from '@/components/NoticeCard.vue'
import type { NoticeItem } from '@/types/notice'

/** 用轻量桩替换 Element Plus 组件，避免在测试里挂载整个组件库 */
const stubs = {
  'el-tag': { template: '<span class="stub-tag"><slot /></span>' },
  // 不在这里转抛 click：Element Plus 的 click 监听会透传到根元素，重复转抛会触发两次
  'el-button': { template: '<button><slot /></button>' },
  'router-link': RouterLinkStub,
}

function makeNotice(over: Partial<NoticeItem> = {}): NoticeItem {
  return {
    id: 1,
    title: '关于举办第八届大学生创新创业大赛校内选拔赛的通知',
    source_id: 2,
    source_name: '创新创业学院',
    category: '竞赛',
    published_at: '2026-11-20',
    deadline_date: '2026-12-10',
    deadline_time: null,
    summary: '面向在校本科生和研究生的创新创业大赛校内选拔。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/1',
    ...over,
  }
}

function mountCard(notice: NoticeItem = makeNotice(), favorited = false) {
  return mount(NoticeCard, { props: { notice, favorited }, global: { stubs } })
}

describe('NoticeCard', () => {
  it('渲染标题、摘要、来源与截止徽标', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.card-title').text()).toContain('创新创业大赛')
    expect(wrapper.find('.card-summary').text()).toContain('校内选拔')
    expect(wrapper.text()).toContain('创新创业学院')
    expect(wrapper.find('.deadline-badge').exists()).toBe(true)
  })

  it('AI 处理中时展示占位文案，不显示原始摘要', () => {
    const wrapper = mountCard(makeNotice({ ai_status: 'pending', summary: '这段不应被展示' }))
    expect(wrapper.find('.card-summary').text()).toContain('信息整理中')
    expect(wrapper.text()).not.toContain('这段不应被展示')
  })

  it('AI 解析失败时给出提示与失败标签', () => {
    const wrapper = mountCard(makeNotice({ ai_status: 'failed' }))
    expect(wrapper.find('.card-summary').text()).toContain('解析失败')
    expect(wrapper.text()).toContain('解析失败')
  })

  it('没有截止日期时显示「截止待核实」', () => {
    const wrapper = mountCard(makeNotice({ deadline_date: null }))
    expect(wrapper.text()).toContain('截止待核实')
  })

  it('点击收藏按钮会抛出 toggleFavorite 事件并带 id', async () => {
    const wrapper = mountCard()
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('toggleFavorite')).toEqual([[1]])
  })

  it('已收藏状态下按钮文案变化', () => {
    expect(mountCard(makeNotice(), true).text()).toContain('已收藏')
    expect(mountCard(makeNotice(), false).text()).toContain('收藏')
  })

  it('标题链接指向详情路由', () => {
    const wrapper = mountCard()
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/notice/1')
  })
})
