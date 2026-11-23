<script setup lang="ts">
// 关于页为静态说明页
</script>

<template>
  <div class="zg-container about-page">
    <div class="page-head">
      <h1>关于项目</h1>
      <p>知更 AI —— 成都大学校园机会雷达</p>
    </div>

    <section class="section zg-card">
      <h2>我们解决什么问题</h2>
      <p>
        成都大学的竞赛通知、实践活动、学术讲座等信息分散在官网、创新创业学院、校团委等多个网站。
        同学们需要逐个平台翻找，还要从长篇通知里找报名时间和参与条件。
      </p>
      <p>
        知更 AI 把分散的校园通知自动汇总为一份<strong>看得懂、查得快、能追踪</strong>的校园机会清单：
        选择信息来源 → 查看 AI 整理结果 → 快速了解时间与要求 → 收藏并盯住截止日期。
      </p>
    </section>

    <section class="section zg-card">
      <h2>当前支持的信息来源</h2>
      <ul>
        <li>成都大学官网 · 通知公告（校级通知、活动）</li>
        <li>创新创业学院（竞赛、创新创业）</li>
        <li>共青团成都大学委员会（实践、志愿服务）</li>
      </ul>
      <p class="muted">
        采集范围以人工确认可公开访问的页面为准；不访问需要登录或含个人信息的内部页面。
      </p>
    </section>

    <section class="section zg-card">
      <h2>AI 的作用与限制</h2>
      <p>
        AI 负责从通知原文中<strong>提取</strong>类别、日期、参与对象、报名要求等结构化信息，并保留原文证据片段。
      </p>
      <ul>
        <li>AI 不编造通知内容；没有明确依据的字段显示「待核实」。</li>
        <li>重要字段均附原文依据，可点击「查看原文」核对。</li>
        <li>AI 提取结果仅供参考，最终以来源官网原文为准。</li>
      </ul>
    </section>

    <section class="section zg-card">
      <h2>技术架构</h2>
      <ul>
        <li><strong>前端：</strong>Vue3 + Vite + TypeScript + Element Plus（响应式，支持电脑与手机浏览器）</li>
        <li><strong>后端：</strong>Python FastAPI + SQLAlchemy + SQLite</li>
        <li><strong>采集：</strong>HTTPX + BeautifulSoup / Trafilatura，定时任务同步公开通知</li>
        <li><strong>AI：</strong>支持结构化输出的大语言模型 API，输出经 Schema 校验</li>
      </ul>
    </section>

    <section class="section zg-card">
      <h2>团队分工</h2>
      <ul>
        <li><strong>成员 A：</strong>前端开发、交互设计、响应式适配、用户体验测试</li>
        <li><strong>成员 B：</strong>后端开发、数据采集、AI 解析模块、数据库与部署</li>
      </ul>
    </section>

    <section class="section zg-card">
      <h2>数据来源声明</h2>
      <p>
        本站为学生参赛作品（成都大学第八届网络创新大赛 · AI创作挑战赛），<strong>非成都大学官方平台</strong>。
        所有信息均采集自公开校园通知页面，著作权归原作者所有；如信息有误或涉及内容下架，请以来源官网为准并联系我们处理。
      </p>
      <p class="muted">
        当前开发/演示环境如处于示例数据（Mock）模式，页面顶部会有明确提示，展示内容为虚构示例、非真实校园通知。
      </p>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  padding-bottom: 40px;
  max-width: 820px;
}
.section {
  padding: 22px 24px;
  margin-bottom: 16px;
}
.section h2 {
  margin: 0 0 12px;
  font-size: 17px;
}
.section p {
  margin: 0 0 10px;
}
.section ul {
  margin: 0 0 10px;
  padding-left: 20px;
}
.section li {
  margin-bottom: 6px;
}
.muted {
  color: var(--zg-text-secondary);
  font-size: 13.5px;
}
@media (max-width: 720px) {
  .section {
    padding: 16px 14px;
  }
}
</style>
