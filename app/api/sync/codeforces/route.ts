import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

/**
 * POST /api/sync/codeforces
 * Sync Codeforces data for all students or a specific student
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, forceSync = false } = body

    if (studentId) {
      // Sync for specific student
      const result = await syncStudentData(studentId, forceSync)
      return NextResponse.json(result)
    } else {
      // Sync for all active students
      const students = await prisma.student.findMany({
        where: { isActive: true }
      })

      const results = []
      for (const student of students) {
        try {
          const result = await syncStudentData(student.id, forceSync)
          results.push({ studentId: student.id, ...result })
        } catch (error) {
          results.push({ 
            studentId: student.id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      return NextResponse.json({ results })
    }
  } catch (error) {
    console.error('Error syncing Codeforces data:', error)
    return NextResponse.json(
      { error: 'Failed to sync Codeforces data' },
      { status: 500 }
    )
  }
}

/**
 * Sync Codeforces data for a specific student
 */
async function syncStudentData(studentId: string, forceSync: boolean = false) {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  })

  if (!student) {
    throw new Error('Student not found')
  }

  // Check if we need to sync (unless forced)
  if (!forceSync && student.lastDataSync) {
    const hoursSinceLastSync = (Date.now() - student.lastDataSync.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastSync < 24) {
      return { success: true, message: 'Data recently synced, skipping' }
    }
  }

  try {
    // Fetch user info
    const userInfoResponse = await fetch(
      `https://codeforces.com/api/user.info?handles=${student.codeforcesHandle}`
    )
    const userInfo = await userInfoResponse.json()

    if (userInfo.status !== 'OK') {
      throw new Error(`Failed to fetch user info: ${userInfo.comment}`)
    }

    const user = userInfo.result[0]
    const currentRating = user.rating || 0
    const maxRating = user.maxRating || 0

    // Fetch user submissions
    const submissionsResponse = await fetch(
      `https://codeforces.com/api/user.status?handle=${student.codeforcesHandle}&count=1000`
    )
    const submissionsData = await submissionsResponse.json()

    if (submissionsData.status !== 'OK') {
      throw new Error(`Failed to fetch submissions: ${submissionsData.comment}`)
    }

    const submissions = submissionsData.result

    // Fetch user rating history
    const ratingResponse = await fetch(
      `https://codeforces.com/api/user.rating?handle=${student.codeforcesHandle}`
    )
    const ratingData = await ratingResponse.json()

    if (ratingData.status !== 'OK') {
      throw new Error(`Failed to fetch rating history: ${ratingData.comment}`)
    }

    const ratingHistory = ratingData.result

    // Start transaction to update all data
    await prisma.$transaction(async (tx) => {
      // Update student rating
      await tx.student.update({
        where: { id: studentId },
        data: {
          currentRating,
          maxRating,
          lastDataSync: new Date()
        }
      })

      // Clear existing contests and submissions for this student
      await tx.contest.deleteMany({
        where: { studentId }
      })

      await tx.submission.deleteMany({
        where: { studentId }
      })

      // Process rating history (contests)
      for (const contest of ratingHistory) {
        // Create or find problem records for this contest
        const contestProblems = submissions.filter(
          sub => sub.contestId === contest.contestId
        )

        for (const submission of contestProblems) {
          const problemId = submission.problem.index + submission.problem.name
          
          // Create problem if it doesn't exist
          await tx.problem.upsert({
            where: { problemId },
            update: {},
            create: {
              problemId,
              name: submission.problem.name,
              rating: submission.problem.rating,
              tags: JSON.stringify(submission.problem.tags || []),
              contestId: submission.contestId
            }
          })
        }

        // Create contest record
        await tx.contest.create({
          data: {
            contestId: contest.contestId,
            name: contest.contestName,
            startTime: new Date(contest.ratingUpdateTimeSeconds * 1000),
            duration: 0, // We don't have this info from rating API
            type: 'CF',
            studentId,
            rank: contest.rank,
            ratingChange: contest.newRating - contest.oldRating,
            problemsSolved: contestProblems.filter(sub => sub.verdict === 'OK').length,
            problemsAttempted: contestProblems.length
          }
        })
      }

      // Process submissions
      for (const submission of submissions) {
        const problemId = submission.problem.index + submission.problem.name
        
        // Create problem if it doesn't exist
        await tx.problem.upsert({
          where: { problemId },
          update: {},
          create: {
            problemId,
            name: submission.problem.name,
            rating: submission.problem.rating,
            tags: JSON.stringify(submission.problem.tags || []),
            contestId: submission.contestId
          }
        })

        // Create submission record
        await tx.submission.create({
          data: {
            submissionId: submission.id,
            problemId,
            verdict: submission.verdict,
            language: submission.programmingLanguage,
            submissionTime: new Date(submission.creationTimeSeconds * 1000),
            executionTime: submission.timeConsumedMillis,
            memoryConsumed: submission.memoryConsumedBytes / 1024, // Convert to KB
            studentId
          }
        })
      }
    })

    return { 
      success: true, 
      message: 'Data synced successfully',
      contestsProcessed: ratingHistory.length,
      submissionsProcessed: submissions.length
    }

  } catch (error) {
    console.error(`Error syncing data for student ${student.codeforcesHandle}:`, error)
    throw error
  }
} 