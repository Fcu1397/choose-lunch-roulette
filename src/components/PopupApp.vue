<template>
  <div class="popup-container">
    <h1>午餐天選之輪</h1>

    <!-- 輪盤容器 -->
    <div class="wheel-container">
      <!-- 指針 -->
      <div class="pointer"></div>

      <!-- 輪盤 -->
      <div
          class="wheel"
          :style="{ transform: `rotate(${rotation}deg)` }"
          :class="{ 'spinning': isSpinning }"
      >
        <!-- 輪盤區塊 -->
        <div
            v-for="(restaurant, index) in displayList"
            :key="index"
            class="wheel-segment"
            :style="getSegmentStyle(index, displayList.length)"
        >
          <span class="segment-text">{{ restaurant }}</span>
        </div>

        <!-- 中央按鈕 -->
        <button
            class="spin-button"
            @click="spinWheel"
            :disabled="isSpinning || displayList.length === 0"
        >
          {{ isSpinning ? '轉動中...' : '轉！' }}
        </button>
      </div>
    </div>

    <!-- 結果顯示區 -->
    <div class="result-section" v-if="selectedRestaurant">
      <div class="result-text">{{ selectedRestaurant }}</div>
      <button
          class="confirm-button"
          @click="confirmSelection"
          v-if="!confirmed"
      >
        就是它了！
      </button>
      <div class="confirmed-message" v-else>
        ✅ 已記錄今天的午餐選擇
      </div>
    </div>

    <!-- 空清單提示 -->
    <div class="empty-message" v-if="restaurantList.length === 0">
      請先到設定頁面新增餐廳
    </div>

    <!-- 設定連結 -->
    <a href="#" @click="openOptions" class="settings-link">
      管理我的清單
    </a>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storageHelper } from '../utils/storage.js'

// 響應式資料
const restaurantList = ref([])
const lunchHistory = ref([])
const rotation = ref(0)
const isSpinning = ref(false)
const selectedRestaurant = ref('')
const confirmed = ref(false)

// 計算屬性：篩選後的餐廳清單
const displayList = computed(() => {
  if (restaurantList.value.length === 0) return []

  // 取得最近 3 天內吃過的餐廳
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  threeDaysAgo.setHours(0, 0, 0, 0)

  const recentRestaurants = lunchHistory.value
      .filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= threeDaysAgo
      })
      .map(record => record.restaurant)

  // 從完整清單中排除最近吃過的餐廳
  const filteredList = restaurantList.value.filter(
      restaurant => !recentRestaurants.includes(restaurant)
  )

  // 例外規則：如果篩選後少於 3 家，且原始清單 >= 3 家，則使用完整清單
  if ((filteredList.length < 3 || filteredList.length === 0) && restaurantList.value.length >= 3) {
    return restaurantList.value
  }

  // 如果篩選後為 0，使用完整清單
  if (filteredList.length === 0) {
    return restaurantList.value
  }

  return filteredList
})

// 初始化：載入資料
onMounted(async () => {
  try {
    const data = await storageHelper.loadData()

    // 額外驗證確保資料格式正確
    if (Array.isArray(data.restaurantList)) {
      restaurantList.value = data.restaurantList.filter(item =>
        typeof item === 'string' && item.trim()
      )
    } else {
      console.error('載入的 restaurantList 不是陣列:', data.restaurantList)
      restaurantList.value = []
    }

    if (Array.isArray(data.lunchHistory)) {
      lunchHistory.value = data.lunchHistory.filter(record =>
        record && record.date && record.restaurant
      )
    } else {
      console.error('載入的 lunchHistory 不是陣列:', data.lunchHistory)
      lunchHistory.value = []
    }

    console.log('PopupApp 載入資料成功:', {
      restaurantCount: restaurantList.value.length,
      historyCount: lunchHistory.value.length
    })
  } catch (error) {
    console.error('PopupApp 載入資料失敗:', error)
    // 設定預設值
    restaurantList.value = []
    lunchHistory.value = []
  }
})

// 計算每個區塊的樣式
const getSegmentStyle = (index, total) => {
  const angle = 360 / total
  const rotation = angle * index
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ]

  return {
    transform: `rotate(${rotation}deg)`,
    background: colors[index % colors.length],
    '--segment-angle': `${angle}deg`
  }
}

// 轉動輪盤
const spinWheel = () => {
  if (displayList.value.length === 0) {
    alert('請先到設定頁面新增餐廳')
    return
  }

  // 重置狀態
  confirmed.value = false
  selectedRestaurant.value = ''
  isSpinning.value = true

  // 計算隨機旋轉角度
  const segmentAngle = 360 / displayList.value.length
  const randomIndex = Math.floor(Math.random() * displayList.value.length)
  const baseRotation = 360 * 5 // 基礎旋轉 5 圈
  const targetAngle = randomIndex * segmentAngle
  const finalRotation = baseRotation + (360 - targetAngle)

  // 執行旋轉動畫
  rotation.value += finalRotation

  // 4 秒後停止並顯示結果
  setTimeout(() => {
    isSpinning.value = false
    selectedRestaurant.value = displayList.value[randomIndex]
  }, 4000)
}

// 確認選擇
const confirmSelection = async () => {
  if (!selectedRestaurant.value) return

  // 記錄到歷史
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD 格式
  const newRecord = {
    date: today,
    restaurant: selectedRestaurant.value
  }

  lunchHistory.value.push(newRecord)

  // 儲存到 chrome.storage.sync
  await storageHelper.saveLunchHistory(lunchHistory.value)

  confirmed.value = true
}

// 開啟設定頁面
const openOptions = () => {
  chrome.runtime.openOptionsPage()
}
</script>