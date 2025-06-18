import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

/**
 * GET /api/students
 * Retrieve all students with their basic information
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
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
            reminders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/students
 * Create a new student
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phoneNumber, codeforcesHandle } = body

    // Validate required fields
    if (!name || !email || !codeforcesHandle) {
      return NextResponse.json(
        { error: 'Name, email, and Codeforces handle are required' },
        { status: 400 }
      )
    }

    // Check if email or handle already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { email },
          { codeforcesHandle }
        ]
      }
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student with this email or Codeforces handle already exists' },
        { status: 409 }
      )
    }

    const student = await prisma.student.create({
      data: {
        name,
        email,
        phoneNumber,
        codeforcesHandle
      }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
} 