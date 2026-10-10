// ログイン中ユーザーのPCと、店・カジノで選択中のPC
export const useMyPcs = async () => {
  const { user } = useAuth()
  const selectedPcId = useState('selected-pc-id', () => null)

  const { data: myPcs, refresh: refreshMyPcs } = await useCachedFetch('/api/pcs/mine', {
    key: 'my-pcs-list',
    immediate: !!user.value,
  })

  const selectedPc = computed(() =>
    (myPcs.value ?? []).find((pc) => pc.id === selectedPcId.value) ?? null
  )

  // 未選択なら先頭のPCを選ぶ
  watchEffect(() => {
    if (!selectedPc.value && myPcs.value?.length) {
      selectedPcId.value = myPcs.value[0].id
    }
  })

  return { user, myPcs, refreshMyPcs, selectedPcId, selectedPc }
}
