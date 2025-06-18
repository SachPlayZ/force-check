import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

/**
 * GET /api/students/[id]
 * Retrieve a specific student with detailed information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        contests: {
          orderBy: { startTime: 'desc' }
        },
        submissions: {
          include: {
            problem: true
          },
          orderBy: { submissionTime: 'desc' }
        },
        reminders: {
          orderBy: { sentAt: 'desc' }
        },
        _count: {
          select: {
            contests: true,
            submissions: true,
            reminders: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/students/[id]
 * Update a student's information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phoneNumber, codeforcesHandle, isActive, emailRemindersEnabled } = body

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id }
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if email or handle conflicts with other students
    if (email || codeforcesHandle) {
      const conflictingStudent = await prisma.student.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(codeforcesHandle ? [{ codeforcesHandle }] : [])
          ],
          NOT: {
            id
          }
        }
      })

      if (conflictingStudent) {
        return NextResponse.json(
          { error: 'Email or Codeforces handle already exists' },
          { status: 409 }
        )
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(codeforcesHandle && { codeforcesHandle }),
        ...(isActive !== undefined && { isActive }),
        ...(emailRemindersEnabled !== undefined && { emailRemindersEnabled })
      }
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/students/[id]
 * Delete a student and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id }
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Delete student (cascade will handle related data)
    await prisma.student.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
} 