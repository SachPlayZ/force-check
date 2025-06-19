import { prisma } from '../app/lib/prisma';
import cron, { ScheduledTask } from 'node-cron';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

let currentTask: ScheduledTask | null = null;
let lastCronExpression: string | null = null;
let lastIsEnabled: boolean | null = null;

async function setupCron() {
  const settings = await prisma.syncSettings.findFirst({ where: { id: 'default' } });
  if (!settings || !settings.isEnabled) {
    if (currentTask) {
      currentTask.stop();
      currentTask = null;
      console.log('Cron stopped (disabled in settings)');
    }
    lastCronExpression = null;
    lastIsEnabled = false;
    return;
  }
  if (
    currentTask &&
    lastCronExpression === settings.cronExpression &&
    lastIsEnabled === settings.isEnabled
  ) {
    // No change
    return;
  }
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  currentTask = cron.schedule(settings.cronExpression, async () => {
    try {
      const res = await fetch('http://localhost:3000/api/cron/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      });
      if (res.ok) {
        console.log('Sync triggered at', new Date());
      } else {
        const err = await res.text();
        console.error('Sync failed:', err);
      }
    } catch (err) {
      console.error('Error triggering sync:', err);
    }
  });
  lastCronExpression = settings.cronExpression;
  lastIsEnabled = settings.isEnabled;
  console.log('Cron scheduled:', settings.cronExpression);
}

// Poll for changes to the cron settings every minute
setInterval(setupCron, 60 * 1000);
setupCron(); 