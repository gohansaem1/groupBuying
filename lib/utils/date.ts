import { Timestamp } from 'firebase/firestore'

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param date Date 객체 또는 Timestamp
 * @returns "2024년 1월 15일 (월)" 형식의 문자열
 */
export function formatDate(date: Date | Timestamp | null | undefined): string {
  if (!date) return '미정'
  
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  const weekday = weekdays[dateObj.getDay()]
  
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 * @param date Date 객체 또는 Timestamp
 * @returns "2024년 1월 15일 (월) 14:30" 형식의 문자열
 */
export function formatDateTime(date: Date | Timestamp | null | undefined): string {
  if (!date) return '미정'
  
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  const weekday = weekdays[dateObj.getDay()]
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')
  
  return `${year}년 ${month}월 ${day}일 (${weekday}) ${hours}:${minutes}`
}

/**
 * 날짜 간 차이 계산 (일 단위)
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 두 날짜 사이의 일수 차이
 */
export function daysBetween(
  date1: Date | Timestamp | null | undefined,
  date2: Date | Timestamp | null | undefined
): number {
  if (!date1 || !date2) return 0
  
  const d1 = date1 instanceof Timestamp ? date1.toDate() : date1
  const d2 = date2 instanceof Timestamp ? date2.toDate() : date2
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 첫 번째 날짜가 두 번째 날짜보다 이전인지 확인
 */
export function isBefore(
  date1: Date | Timestamp | null | undefined,
  date2: Date | Timestamp | null | undefined
): boolean {
  if (!date1 || !date2) return false
  
  const d1 = date1 instanceof Timestamp ? date1.toDate() : date1
  const d2 = date2 instanceof Timestamp ? date2.toDate() : date2
  
  return d1.getTime() < d2.getTime()
}

/**
 * 첫 번째 날짜가 두 번째 날짜보다 이후인지 확인
 */
export function isAfter(
  date1: Date | Timestamp | null | undefined,
  date2: Date | Timestamp | null | undefined
): boolean {
  if (!date1 || !date2) return false
  
  const d1 = date1 instanceof Timestamp ? date1.toDate() : date1
  const d2 = date2 instanceof Timestamp ? date2.toDate() : date2
  
  return d1.getTime() > d2.getTime()
}

/**
 * 남은 시간을 포맷팅 (카운트다운용)
 * @param targetDate 목표 날짜
 * @returns "3일 5시간 30분" 형식의 문자열 또는 "마감됨"
 */
export function formatTimeRemaining(targetDate: Date | Timestamp | null | undefined): string {
  if (!targetDate) return '미정'
  
  const target = targetDate instanceof Timestamp ? targetDate.toDate() : targetDate
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  
  if (diff <= 0) return '마감됨'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}일 ${hours}시간`
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  } else {
    return `${minutes}분`
  }
}

/**
 * 날짜가 임박했는지 확인 (지정된 일수 이내)
 * @param targetDate 목표 날짜
 * @param daysBefore 며칠 전부터 임박으로 간주할지
 * @returns 임박 여부
 */
export function isApproaching(
  targetDate: Date | Timestamp | null | undefined,
  daysBefore: number = 3
): boolean {
  if (!targetDate) return false
  
  const target = targetDate instanceof Timestamp ? targetDate.toDate() : targetDate
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  return days >= 0 && days <= daysBefore
}

/**
 * 영업일 기준으로 날짜 계산 (월화수목금만 영업일)
 * @param startDate 시작 날짜
 * @param businessDays 추가할 영업일 수
 * @returns 계산된 날짜
 */
export function addBusinessDays(
  startDate: Date | Timestamp,
  businessDays: number
): Date {
  const date = startDate instanceof Timestamp ? startDate.toDate() : new Date(startDate)
  let daysAdded = 0
  let currentDate = new Date(date)
  
  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dayOfWeek = currentDate.getDay() // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 월요일(1) ~ 금요일(5)만 영업일로 간주
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      daysAdded++
    }
  }
  
  return currentDate
}

/**
 * 마감일 이후 영업일 기준 2일 후 수령일 계산 (마감일 다음날, 그 다음날 제외)
 * @param endDate 마감일
 * @returns 수령 가능일
 */
export function calculateDeliveryDate(endDate: Date | Timestamp): Date {
  const date = endDate instanceof Timestamp ? endDate.toDate() : new Date(endDate)
  // 마감일 다음날, 그 다음날을 제외하고 영업일 기준 2일 후 계산
  // 즉, 마감일 + 3일부터 시작하여 영업일 기준 2일 후
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const dayAfterNext = new Date(date)
  dayAfterNext.setDate(dayAfterNext.getDate() + 2)
  
  // 마감일 + 3일부터 시작
  let currentDate = new Date(date)
  currentDate.setDate(currentDate.getDate() + 3)
  
  // 영업일 기준 2일 후까지 계산
  let businessDaysAdded = 0
  while (businessDaysAdded < 2) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDaysAdded++
    }
    if (businessDaysAdded < 2) {
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }
  
  return currentDate
}

/**
 * 수령일이 유효한지 확인 (마감일 다음날, 그 다음날은 선택 불가)
 * @param endDate 마감일
 * @param deliveryDate 수령일
 * @returns 유효 여부
 */
export function isValidDeliveryDate(endDate: Date | Timestamp, deliveryDate: Date | Timestamp): boolean {
  const end = endDate instanceof Timestamp ? endDate.toDate() : new Date(endDate)
  const delivery = deliveryDate instanceof Timestamp ? deliveryDate.toDate() : new Date(deliveryDate)
  
  // 마감일 다음날과 그 다음날
  const nextDay = new Date(end)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  
  const dayAfterNext = new Date(end)
  dayAfterNext.setDate(dayAfterNext.getDate() + 2)
  dayAfterNext.setHours(0, 0, 0, 0)
  
  const deliveryDateOnly = new Date(delivery)
  deliveryDateOnly.setHours(0, 0, 0, 0)
  
  // 마감일 다음날이나 그 다음날이면 선택 불가
  if (deliveryDateOnly.getTime() === nextDay.getTime() || deliveryDateOnly.getTime() === dayAfterNext.getTime()) {
    return false
  }
  
  // 최소 수령일 (마감일 + 3일 이후)
  const minDeliveryDate = new Date(end)
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 3)
  minDeliveryDate.setHours(0, 0, 0, 0)
  
  return deliveryDateOnly.getTime() >= minDeliveryDate.getTime()
}

/**
 * 날짜가 영업일인지 확인 (월화수목금만 영업일)
 * @param date 확인할 날짜
 * @returns 영업일 여부
 */
export function isBusinessDay(date: Date | Timestamp): boolean {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date)
  const dayOfWeek = d.getDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5 // 월요일 ~ 금요일
}

