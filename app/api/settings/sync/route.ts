import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

/**
 * GET /api/settings/sync
 * Retrieve sync settings
 */
export async function GET() {
  try {
    const settings = await prisma.syncSettings.findFirst({
      where: { id: 'default' }
    })

    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await prisma.syncSettings.create({
        data: {
          id: 'default',
          cronExpression: '0 2 * * *', // Daily at 2 AM
          isEnabled: true
        }
      })
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/sync
 * Update sync settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cronExpression, isEnabled } = body

    // Validate cron expression
    if (cronExpression && !isValidCronExpression(cronExpression)) {
      return NextResponse.json(
        { error: 'Invalid cron expression' },
        { status: 400 }
      )
    }

    const settings = await prisma.syncSettings.upsert({
      where: { id: 'default' },
      update: {
        cronExpression: cronExpression || '0 2 * * *',
        isEnabled: isEnabled !== undefined ? isEnabled : true
      },
      create: {
        id: 'default',
        cronExpression: cronExpression || '0 2 * * *',
        isEnabled: isEnabled !== undefined ? isEnabled : true
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    )
  }
}

/**
 * Validate cron expression format
 */
function isValidCronExpression(cronExpression: string): boolean {
  const parts = cronExpression.split(' ')
  if (parts.length !== 5) return false

  const [minute, hour, day, month, weekday] = parts

  // Basic validation - check if parts are valid cron format
  const isValidPart = (part: string, min: number, max: number): boolean => {
    if (part === '*') return true
    if (part.includes('/')) {
      const [range, step] = part.split('/')
      if (range === '*') return parseInt(step) > 0
      return false
    }
    if (part.includes('-')) {
      const [start, end] = part.split('-')
      return parseInt(start) >= min && parseInt(end) <= max && parseInt(start) <= parseInt(end)
    }
    if (part.includes(',')) {
      return part.split(',').every(p => parseInt(p) >= min && parseInt(p) <= max)
    }
    const num = parseInt(part)
    return !isNaN(num) && num >= min && num <= max
  }

  return (
    isValidPart(minute, 0, 59) &&
    isValidPart(hour, 0, 23) &&
    isValidPart(day, 1, 31) &&
    isValidPart(month, 1, 12) &&
    isValidPart(weekday, 0, 6)
  )
} 