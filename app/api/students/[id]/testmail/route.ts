import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const RESEND_API_KEY = 're_6ggReWDb_8573Xd2UHtYXgRSQCQLEvh1V';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id }
    });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const emailContent = `
      Hello ${student.name},

      This is a test email from Student Progress Management System using Resend.

      If you received this, your email setup is working!

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
        subject: 'Test Email from Student Progress Management System',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>')
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Failed to send email via Resend: ${errorText}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 