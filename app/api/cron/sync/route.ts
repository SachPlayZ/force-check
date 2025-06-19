import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { subDays } from 'date-fns'

const RESEND_API_KEY = 're_6ggReWDb_8573Xd2UHtYXgRSQCQLEvh1V';

/**
 * POST /api/cron/sync
 * Automated cron job for data sync and inactivity detection
 * This should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      syncResults: [] as any[],
      inactivityResults: [] as any[],
      emailResults: [] as any[]
    }

    // Get all active students
    const students = await prisma.student.findMany({
      where: { isActive: true }
    })

    // Sync data for each student
    for (const student of students) {
      try {
        // Check if we need to sync (skip if synced recently)
        if (student.lastDataSync) {
          const hoursSinceLastSync = (Date.now() - student.lastDataSync.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastSync < 24) {
            results.syncResults.push({
              studentId: student.id,
              studentName: student.name,
              status: 'skipped',
              reason: 'Recently synced'
            })
            continue
          }
        }

        // Fetch user info
        const userInfoResponse = await fetch(
          `https://codeforces.com/api/user.info?handles=${student.codeforcesHandle}`
        )
        const userInfo = await userInfoResponse.json()

        if (userInfo.status !== 'OK') {
          results.syncResults.push({
            studentId: student.id,
            studentName: student.name,
            status: 'failed',
            error: `Failed to fetch user info: ${userInfo.comment}`
          })
          continue
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
          results.syncResults.push({
            studentId: student.id,
            studentName: student.name,
            status: 'failed',
            error: `Failed to fetch submissions: ${submissionsData.comment}`
          })
          continue
        }

        const submissions = submissionsData.result

        // Fetch user rating history
        const ratingResponse = await fetch(
          `https://codeforces.com/api/user.rating?handle=${student.codeforcesHandle}`
        )
        const ratingData = await ratingResponse.json()

        if (ratingData.status !== 'OK') {
          results.syncResults.push({
            studentId: student.id,
            studentName: student.name,
            status: 'failed',
            error: `Failed to fetch rating history: ${ratingData.comment}`
          })
          continue
        }

        const ratingHistory = ratingData.result

        // Update database
        await prisma.$transaction(async (tx) => {
          // Update student rating
          await tx.student.update({
            where: { id: student.id },
            data: {
              currentRating,
              maxRating,
              lastDataSync: new Date()
            }
          })

          // Clear existing contests and submissions for this student
          await tx.contest.deleteMany({
            where: { studentId: student.id }
          })

          await tx.submission.deleteMany({
            where: { studentId: student.id }
          })

          // Process rating history (contests)
          for (const contest of ratingHistory) {
            const contestProblems = submissions.filter((sub: any) =>
              sub.contestId === contest.contestId
            )

            for (const submission of contestProblems) {
              const problemId = submission.problem.index + submission.problem.name
              
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

            await tx.contest.create({
              data: {
                contestId: contest.contestId,
                name: contest.contestName,
                startTime: new Date(contest.ratingUpdateTimeSeconds * 1000),
                duration: 0,
                type: 'CF',
                studentId: student.id,
                rank: contest.rank,
                ratingChange: contest.newRating - contest.oldRating,
                problemsSolved: contestProblems.filter((sub: any) => sub.verdict === 'OK').length,
                problemsAttempted: contestProblems.length
              }
            })
          }

          // Process submissions
          for (const submission of submissions) {
            const problemId = submission.problem.index + submission.problem.name
            
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

            await tx.submission.upsert({
              where: { submissionId: submission.id },
              update: {
                verdict: submission.verdict,
                language: submission.programmingLanguage,
                submissionTime: new Date(submission.creationTimeSeconds * 1000),
                executionTime: submission.timeConsumedMillis,
                memoryConsumed: submission.memoryConsumedBytes / 1024,
                problemId,
                studentId: student.id
              },
              create: {
                submissionId: submission.id,
                problemId,
                verdict: submission.verdict,
                language: submission.programmingLanguage,
                submissionTime: new Date(submission.creationTimeSeconds * 1000),
                executionTime: submission.timeConsumedMillis,
                memoryConsumed: submission.memoryConsumedBytes / 1024,
                studentId: student.id
              }
            })
          }
        })

        results.syncResults.push({
          studentId: student.id,
          studentName: student.name,
          status: 'success',
          contestsProcessed: ratingHistory.length,
          submissionsProcessed: submissions.length
        })

        // Check for inactivity (no submissions in last 7 days)
        const sevenDaysAgo = subDays(new Date(), 7)
        const recentSubmissions = submissions.filter((sub: any) => 
          new Date(sub.creationTimeSeconds * 1000) >= sevenDaysAgo
        )

        if (recentSubmissions.length === 0 && student.emailRemindersEnabled) {
          results.inactivityResults.push({
            studentId: student.id,
            studentName: student.name,
            status: 'inactive',
            daysInactive: 7
          })

          // Send inactivity email
          try {
            await sendInactivityEmail(student)
            results.emailResults.push({
              studentId: student.id,
              studentName: student.name,
              status: 'sent',
              type: 'inactivity'
            })

            // Record the reminder
            await prisma.reminder.create({
              data: {
                type: 'inactivity',
                studentId: student.id,
                emailContent: `Inactivity reminder sent to ${student.name} (${student.email})`
              }
            })
          } catch (emailError) {
            results.emailResults.push({
              studentId: student.id,
              studentName: student.name,
              status: 'failed',
              error: emailError instanceof Error ? emailError.message : 'Unknown error'
            })
          }
        } else {
          results.inactivityResults.push({
            studentId: student.id,
            studentName: student.name,
            status: 'active',
            recentSubmissions: recentSubmissions.length
          })
        }

      } catch (error) {
        results.syncResults.push({
          studentId: student.id,
          studentName: student.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update sync settings
    await prisma.syncSettings.upsert({
      where: { id: 'default' },
      update: {
        lastSync: new Date(),
        nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next sync in 24 hours
      },
      create: {
        id: 'default',
        lastSync: new Date(),
        nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cron job completed successfully',
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Send inactivity reminder email to student using Resend
 */
async function sendInactivityEmail(student: any) {
  const emailContent = `
    Dear ${student.name},

    We noticed that you haven't made any submissions on Codeforces in the last 7 days. 
    Regular practice is key to improving your competitive programming skills!

    Your current rating: ${student.currentRating}
    Your max rating: ${student.maxRating}

    Keep up the great work and don't forget to practice regularly!

    Best regards,
    Student Progress Management System
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: student.email,
      subject: 'Reminder: Keep Practicing on Codeforces!',
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send email via Resend: ${errorText}`);
  }
} 