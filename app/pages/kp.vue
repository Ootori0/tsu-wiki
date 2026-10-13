<script setup>
definePageMeta({ middleware: 'kp' })

// 管理者画面からアカウント管理・権限管理を除いたもの
const tabs = ['タグ管理', '所属管理', '商品管理', 'カジノ設定', '所持金履歴']
</script>

<template>
  <ManagePanel title="KP画面" :tabs="tabs" />
</template>
