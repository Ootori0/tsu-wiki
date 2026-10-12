<script setup>
definePageMeta({ middleware: 'admin' })

const tabs = ['アカウント管理', '権限管理', 'タグ管理', '所属管理', '商品管理', 'カジノ設定', '所持金履歴']
</script>

<template>
  <ManagePanel title="管理者画面" :tabs="tabs" />
</template>
