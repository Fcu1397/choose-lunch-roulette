/**
 * Chrome Storage API 輔助工具
 * 統一管理擴充功能的資料存取
 */

export const storageHelper = {
    /**
     * 載入所有資料
     * @returns {Promise<Object>} 包含 restaurantList 和 lunchHistory
     */
    async loadData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['restaurantList', 'lunchHistory'], (result) => {
                // 確保資料格式正確
                let restaurantList = result.restaurantList || []
                let lunchHistory = result.lunchHistory || []
                let needsRepair = false

                // 驗證並修復 restaurantList 格式
                if (!Array.isArray(restaurantList)) {
                    console.warn('restaurantList 不是陣列，重置為空陣列', {
                        originalType: typeof restaurantList,
                        originalValue: restaurantList
                    })
                    restaurantList = []
                    needsRepair = true
                } else {
                    // 清理 restaurantList 中的無效項目
                    const originalLength = restaurantList.length
                    restaurantList = restaurantList.filter(item =>
                        typeof item === 'string' && item.trim()
                    ).map(item => item.trim())

                    if (restaurantList.length !== originalLength) {
                        console.log(`清理了 ${originalLength - restaurantList.length} 個無效的餐廳項目`)
                        needsRepair = true
                    }
                }

                // 驗證並修復 lunchHistory 格式
                if (!Array.isArray(lunchHistory)) {
                    console.warn('lunchHistory 不是陣列，重置為空陣列', {
                        originalType: typeof lunchHistory,
                        originalValue: lunchHistory
                    })
                    lunchHistory = []
                    needsRepair = true
                } else {
                    // 清理 lunchHistory 中的無效項目
                    const originalLength = lunchHistory.length
                    lunchHistory = lunchHistory.filter(record => {
                        return record &&
                               typeof record === 'object' &&
                               record.date &&
                               record.restaurant &&
                               typeof record.restaurant === 'string'
                    })

                    if (lunchHistory.length !== originalLength) {
                        console.log(`清理了 ${originalLength - lunchHistory.length} 個無效的歷史記錄`)
                        needsRepair = true
                    }
                }

                // 如果資料需要修復，自動儲存清理後的資料
                if (needsRepair) {
                    console.log('偵測到資料格式問題，正在自動修復...')
                    chrome.storage.sync.set({
                        restaurantList,
                        lunchHistory
                    }, () => {
                        console.log('✓ 資料修復完成')
                    })
                }

                resolve({
                    restaurantList,
                    lunchHistory
                })
            })
        })
    },

    /**
     * 儲存餐廳清單
     * @param {Array<string>} list - 餐廳名稱陣列
     * @returns {Promise<void>}
     */
    async saveRestaurantList(list) {
        // 驗證輸入格式
        if (!Array.isArray(list)) {
            throw new Error('餐廳清單必須是陣列格式')
        }

        // 過濾並清理資料
        const cleanList = list
            .filter(item => typeof item === 'string' && item.trim())
            .map(item => item.trim())

        return new Promise((resolve) => {
            chrome.storage.sync.set({ restaurantList: cleanList }, resolve)
        })
    },

    /**
     * 儲存用餐歷史
     * @param {Array<Object>} history - 用餐歷史紀錄陣列
     * @returns {Promise<void>}
     */
    async saveLunchHistory(history) {
        // 驗證輸入格式
        if (!Array.isArray(history)) {
            throw new Error('用餐歷史必須是陣列格式')
        }

        // 過濾並清理資料
        const cleanHistory = history.filter(record => {
            return record &&
                   typeof record === 'object' &&
                   record.date &&
                   record.restaurant &&
                   typeof record.restaurant === 'string'
        })

        return new Promise((resolve) => {
            chrome.storage.sync.set({ lunchHistory: cleanHistory }, resolve)
        })
    },

    /**
     * 儲存所有資料
     * @param {Object} data - 包含 restaurantList 和 lunchHistory
     * @returns {Promise<void>}
     */
    async saveAll(data) {
        // 驗證資料格式
        if (!data || typeof data !== 'object') {
            throw new Error('資料必須是物件格式')
        }

        const cleanData = {}

        // 處理 restaurantList
        if (data.restaurantList) {
            if (!Array.isArray(data.restaurantList)) {
                throw new Error('餐廳清單必須是陣列格式')
            }
            cleanData.restaurantList = data.restaurantList
                .filter(item => typeof item === 'string' && item.trim())
                .map(item => item.trim())
        }

        // 處理 lunchHistory
        if (data.lunchHistory) {
            if (!Array.isArray(data.lunchHistory)) {
                throw new Error('用餐歷史必須是陣列格式')
            }
            cleanData.lunchHistory = data.lunchHistory.filter(record => {
                return record &&
                       typeof record === 'object' &&
                       record.date &&
                       record.restaurant &&
                       typeof record.restaurant === 'string'
            })
        }

        return new Promise((resolve) => {
            chrome.storage.sync.set(cleanData, resolve)
        })
    }
}