<template>
  <div class="options-container">
    <h1>午餐天選之輪 - 設定</h1>

    <!-- 新增餐廳區塊 -->
    <div class="section">
      <h2>新增餐廳</h2>
      <div class="add-restaurant">
        <input
            v-model="newRestaurant"
            @keyup.enter="addRestaurant"
            placeholder="輸入餐廳名稱"
            class="input-field"
        >
        <button @click="addRestaurant" class="btn btn-primary">
          新增
        </button>
      </div>
    </div>

    <!-- 口袋名單區塊 -->
    <div class="section">
      <h2>我的口袋名單 ({{ restaurantList.length }} 家)</h2>
      <div class="restaurant-list">
        <div
            v-for="(restaurant, index) in restaurantList"
            :key="index"
            class="restaurant-item"
        >
          <span class="restaurant-name">{{ restaurant }}</span>
          <button
              @click="deleteRestaurant(index)"
              class="btn btn-delete"
          >
            刪除
          </button>
        </div>
        <div v-if="restaurantList.length === 0" class="empty-message">
          尚未新增任何餐廳
        </div>
      </div>
    </div>

    <!-- 資料管理區塊 -->
    <div class="section">
      <h2>資料管理</h2>
      <div class="data-management">
        <button @click="exportData" class="btn btn-secondary">
          匯出資料
        </button>
        <button @click="triggerImport" class="btn btn-secondary">
          匯入資料
        </button>
        <input
            ref="fileInput"
            type="file"
            accept=".json"
            @change="handleFileImport"
            style="display: none"
        >
      </div>
    </div>

    <!-- 用餐歷史區塊 -->
    <div class="section">
      <h2>最近用餐歷史</h2>
      <div class="history-list">
        <div
            v-for="(record, index) in recentHistory"
            :key="index"
            class="history-item"
        >
          <span class="date">{{ formatDate(record.date) }}</span>
          <span class="restaurant">{{ record.restaurant }}</span>
        </div>
        <div v-if="recentHistory.length === 0" class="empty-message">
          尚無用餐紀錄
        </div>
      </div>
    </div>

    <!-- 提示訊息 -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storageHelper } from '../utils/storage.js'

// 響應式資料
const restaurantList = ref([])
const lunchHistory = ref([])
const newRestaurant = ref('')
const fileInput = ref(null)
const message = ref('')
const messageType = ref('info')

// 計算屬性：最近 7 天的用餐歷史
const recentHistory = computed(() => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return lunchHistory.value
      .filter(record => new Date(record.date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10) // 最多顯示 10 筆
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

    console.log('OptionsApp 載入資料成功:', {
      restaurantCount: restaurantList.value.length,
      historyCount: lunchHistory.value.length
    })
  } catch (error) {
    console.error('OptionsApp 載入資料失敗:', error)
    // 設定預設值
    restaurantList.value = []
    lunchHistory.value = []
  }
})

// 新增餐廳
const addRestaurant = async () => {
  const name = newRestaurant.value.trim()
  if (!name) {
    showMessage('請輸入餐廳名稱', 'error')
    return
  }

  if (restaurantList.value.includes(name)) {
    showMessage('此餐廳已存在', 'error')
    return
  }

  restaurantList.value.push(name)
  await storageHelper.saveRestaurantList(restaurantList.value)
  newRestaurant.value = ''
  showMessage('新增成功！', 'success')
}

// 刪除餐廳
const deleteRestaurant = async (index) => {
  const name = restaurantList.value[index]
  if (confirm(`確定要刪除「${name}」嗎？`)) {
    restaurantList.value.splice(index, 1)
    await storageHelper.saveRestaurantList(restaurantList.value)
    showMessage('刪除成功！', 'success')
  }
}

// 匯出資料
const exportData = () => {
  const data = {
    restaurantList: restaurantList.value,
    lunchHistory: lunchHistory.value,
    exportDate: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lunch-wheel-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showMessage('資料匯出成功！', 'success')
}

// 觸發檔案選擇
const triggerImport = () => {
  fileInput.value.click()
}

// 處理檔案匯入
const handleFileImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // 驗證資料格式
    if (!data.restaurantList || !Array.isArray(data.restaurantList)) {
      throw new Error('無效的資料格式')
    }

    // 詢問使用者要覆蓋還是合併
    const shouldMerge = confirm(
        '請選擇匯入方式：\n' +
        '確定 - 合併資料（保留現有資料並加入新資料）\n' +
        '取消 - 覆蓋資料（完全取代現有資料）'
    )

    if (shouldMerge) {
      // 合併邏輯
      const existingNames = new Set(restaurantList.value)
      const newRestaurants = data.restaurantList.filter(name => !existingNames.has(name))
      restaurantList.value = [...restaurantList.value, ...newRestaurants]

      // 合併歷史紀錄
      if (data.lunchHistory && Array.isArray(data.lunchHistory)) {
        lunchHistory.value = [...lunchHistory.value, ...data.lunchHistory]
        // 去除重複（根據日期和餐廳）
        const uniqueHistory = new Map()
        lunchHistory.value.forEach(record => {
          const key = `${record.date}-${record.restaurant}`
          uniqueHistory.set(key, record)
        })
        lunchHistory.value = Array.from(uniqueHistory.values())
      }

      showMessage(`合併成功！新增了 ${newRestaurants.length} 家餐廳`, 'success')
    } else {
      // 覆蓋邏輯
      restaurantList.value = data.restaurantList
      lunchHistory.value = data.lunchHistory || []
      showMessage('資料已完全覆蓋', 'success')
    }

    // 儲存到 storage
    await storageHelper.saveAll({
      restaurantList: restaurantList.value,
      lunchHistory: lunchHistory.value
    })

  } catch (error) {
    showMessage(`匯入失敗：${error.message}`, 'error')
  }

  // 清空檔案輸入
  event.target.value = ''
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

// 顯示提示訊息
const showMessage = (text, type = 'info') => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}
</script>