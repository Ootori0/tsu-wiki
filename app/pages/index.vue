<script setup>
const pages = [
  { to: '/association', label: '協会', desc: '各協会の概略・所属NPC/PCなど' },
  { to: '/pc', label: 'PC', desc: 'キャラクターシートまとめ' },
  { to: '/magic', label: '魔法', desc: '魔法の総覧' },
  { to: '/magic/tool', label: '魔道具', desc: '魔道具の総覧' },
  { to: '/magic/other', label: '魔術、その他', desc: 'その他の術式など' },
  { to: '/magic-guide', label: '魔法作成のすゝめ', desc: 'オリジナル魔法の作り方' },
  { to: '/faq', label: 'よくある質問,裁定', desc: 'Q&A形式のルール裁定集' },
]
</script>

<template>
  <div class="cover">
    <!-- タイトル -->
    <header class="title-block">
      <div class="title-frame">
        <h1 class="title">ツラトゥストラはかく語りき</h1>
      </div>
    </header>

    <!-- シナリオ概要 -->
    <section class="summary-block">
      <h2 class="block-heading">シナリオ概要</h2>
      <p class="summary-text">1940年、第二次世界大戦真っ只中が舞台である。<br>
<br>
貴方達は魔法協会に所属する魔法使いだ。フリーではなく普通にお仕事として過ごしている。<br>
望みがあればどこかに所属している事務所を建てて貰っても構わない。複数人でそこに所属しても面白いかもね<br>
また、複数人のチームと一人のチームでは戦力差が激しくなる為バランス調整で一人のとこは強くするカモ<br>
<br>
所属が異なれば争いになるのも必定。場合によってはPc同士敵対する可能性もある。逆に同盟を組む可能性もあるが…それは貴方達の選択次第だろう。<br>
<br>
メインシナリオは第二次世界大戦に参戦する魔法使いの話だが、参戦するかどうかは事務所によって決めてもらおうと考えている。具体的には勝てれば褒賞、負ければ死のギャンブル戦闘をしてもらう事になるだろう。<br>
<br>
事務所でこなす仕事に関してはサブストーリーとして単純なCoCシナリオのようなものをしたいと考えている。</p>
    </section>

    <!-- 各ページの概説 -->
    <section class="page-block">
      <h2 class="block-heading">目次</h2>
      <div class="page-list">
        <NuxtLink
          v-for="page in pages"
          :key="page.to"
          :to="page.to"
          class="page-item"
        >
          <span class="page-marker"></span>
          <span class="page-text">
            <span class="page-label">{{ page.label }}</span>
            <span class="page-desc">{{ page.desc }}</span>
          </span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cover {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 72px 16px 48px;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 36px;
  box-sizing: border-box;
}

/* タイトル */
.title-block {
  display: flex;
  justify-content: center;
}

.title-frame {
  width: 100%;
  border: 3px solid var(--color-text);
  outline: 6px solid var(--color-accent);
  outline-offset: -3px;
  padding: 24px 12px;
  display: flex;
  justify-content: center; /* 縦書きの列を中央配置 */
  background: var(--color-bg);
  min-height: 140px;
}

.title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 2rem;
  color: var(--color-text);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.3em;
  line-height: 1.4;
}

/* 共通見出し */
.block-heading {
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--color-text);
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 5px solid var(--color-accent);
}

/* 概要 */
.summary-block {
  background: var(--color-bg);
  border: 1px solid var(--color-text);
  padding: 16px;
}

.summary-text {
  margin: 0;
  line-height: 1.8;
  font-size: 0.95rem;
}

/* 目次 */
.page-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-text);
  border-left: 6px solid var(--color-accent);
  padding: 12px 14px;
  transition: background 0.15s ease;
}

.page-item:active {
  background: var(--color-accent);
}

.page-marker {
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border: 1px solid var(--color-text);
  flex-shrink: 0;
}

.page-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-label {
  font-size: 1rem;
  font-weight: bold;
}

.page-desc {
  font-size: 0.78rem;
  opacity: 0.7;
}
</style>