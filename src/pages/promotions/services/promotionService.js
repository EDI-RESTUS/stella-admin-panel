// src/services/promotionService.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Validate environment variable
if (!API_BASE_URL) {
  console.error('[promotionService] Missing API_BASE_URL in environment variables')
}

/**
 * Centralized safe request handler
 */
async function safeRequest(promise) {
  try {
    const response = await promise
    return response.data
  } catch (err) {
    // Handle duplicate key error (Mongo specific)
    if (err.response?.data?.message?.includes('E11000')) {
      throw new Error('A promotion with this code already exists.')
    }

    throw err
  }
}

// Add global Axios interceptor (optional but helpful for debugging)
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err)
  },
)

/**
 * 1. Create Promotion
 */
export async function createPromotion(data) {
  console.log('[createPromotion] Payload:', JSON.stringify(data, null, 2))
  return safeRequest(axios.post(`${API_BASE_URL}/promotions`, data))
}

/**
 * 2. Update Promotion
 */
export async function updatePromotion(promotionId, data) {
  return safeRequest(axios.patch(`${API_BASE_URL}/promotions/${promotionId}`, data))
}

/**
 * 3. Delete Promotion
 */
export async function deletePromotion(id) {
  return safeRequest(
    axios.delete(`${API_BASE_URL}/promotions`, {
      params: { id },
    }),
  )
}

/**
 * 4. Get Promotions by Outlet
 */
export async function getPromotionsByOutlet(outletId) {
  return safeRequest(
    axios.get(`${API_BASE_URL}/promotions`, {
      params: { outletId },
    }),
  )
}

/**
 * 5. Get Promotion by ID
 */
export async function getPromotionById(id) {
  return safeRequest(axios.get(`${API_BASE_URL}/promotions/${id}`))
}

/**
 * 6. Validate Promotion Code
 */
export async function validatePromotion(data) {
  return safeRequest(axios.post(`${API_BASE_URL}/promotions/validate`, data))
}

/**
 * 7. Generate additional codes for a MULTI promotion
 */
export async function generatePromotionCodes(promotionId, { startFrom, endAt, codePrefix }) {
  return safeRequest(
    axios.post(`${API_BASE_URL}/promotions/${promotionId}/codes`, {
      startFrom,
      endAt,
      codePrefix,
    }),
  )
}

/**
 * 7. Get Menu Items by Outlet
 */
export async function getMenuItemsByOutlet(outletId) {
  return safeRequest(
    axios.get(`${API_BASE_URL}/menuItems`, {
      params: {
        outletId,
        sortKey: 'id',
        sortValue: 'asc',
        isDeleted: false,
      },
    }),
  )
}

export const getArticlesByOutlet = async (outletId) => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/articles-options`, {
      params: {
        outletId,
        limit: 1000000, // or pass dynamic limit if you paginate
        page: 1,
        sortKey: 'name', // valid sort field
        sortValue: 'asc',
      },
    })

    // The API wraps data in `result`, so extract it safely
    return Array.isArray(response.data.result) ? response.data.result : []
  } catch (error) {
    console.error('[getArticlesOptionsByOutlet] Error:', error)
    throw error
  }
}
