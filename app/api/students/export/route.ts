import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { createObjectCsvWriter } from 'csv-writer'

/**
 * GET /api/students/export
 * Export all students data to CSV
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        codeforcesHandle: true,
        currentRating: true,
        maxRating: true,
        isActive: true,
        lastDataSync: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            contests: true,
            submissions: true,
            reminders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format data for CSV
    const csvData = students.map(student => ({
      Name: student.name,
      Email: student.email,
      'Phone Number': student.phoneNumber || '',
      'Codeforces Handle': student.codeforcesHandle,
      'Current Rating': student.currentRating,
      'Max Rating': student.maxRating,
      'Is Active': student.isActive ? 'Yes' : 'No',
      'Last Data Sync': student.lastDataSync ? student.lastDataSync.toISOString() : 'Never',
      'Total Contests': student._count.contests,
      'Total Submissions': student._count.submissions,
      'Reminders Sent': student._count.reminders,
      'Created At': student.createdAt.toISOString(),
      'Updated At': student.updatedAt.toISOString()
    }))

    // Create CSV content
    const headers = [
      'Name', 'Email', 'Phone Number', 'Codeforces Handle', 'Current Rating',
      'Max Rating', 'Is Active', 'Last Data Sync', 'Total Contests',
      'Total Submissions', 'Reminders Sent', 'Created At', 'Updated At'
    ]

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="students-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting students:', error)
    return NextResponse.json(
      { error: 'Failed to export students' },
      { status: 500 }
    )
  }
} 