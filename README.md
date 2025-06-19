<iframe src="https://www.loom.com/embed/0e280b104f0f4cef84d8508d8f37d3d0?sid=3ac3effd-6833-4e65-b6d8-ea4eb5371dc9" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>

# Student Progress Management System

A comprehensive web application for tracking and managing student progress on Codeforces with automated data synchronization, inactivity detection, and email reminders.

## 🚀 Features

### Student Management

- **Student Table View**: Complete CRUD operations for student management
- **Student Information**: Name, email, phone number, Codeforces handle, ratings
- **CSV Export**: Download complete student dataset
- **Search & Filter**: Find students by name, email, or handle
- **Status Tracking**: Active/inactive status with last sync timestamps

### Student Profile View

- **Contest History**:
  - Rating change graphs
  - Contest performance with ranks and problem counts
  - Filterable by 30, 90, or 365 days
- **Problem Solving Data**:
  - Most difficult problem solved
  - Total problems solved
  - Average rating and problems per day
  - Rating distribution charts
  - Recent submissions list
  - Filterable by 7, 30, or 90 days

### Automated Data Sync

- **Scheduled Sync**: Automated Codeforces data fetching via cron jobs
- **Real-time Updates**: Immediate sync when handle is updated
- **Configurable Schedule**: Customizable sync frequency (hourly to daily)
- **Manual Sync**: On-demand data synchronization
- **Error Handling**: Robust error handling and retry mechanisms

### Inactivity Detection & Email Reminders

- **Automatic Detection**: Identifies students inactive for 7+ days
- **Email Notifications**: Automated reminder emails to inactive students
- **Reminder Tracking**: View history of sent reminders
- **Individual Control**: Enable/disable reminders per student
- **Email Management**: Toggle reminder system on/off

### Professional UI/UX

- **Responsive Design**: Mobile and tablet optimized
- **Dark/Light Mode**: Built-in theme support
- **Modern Interface**: Clean, professional design with Tailwind CSS
- **Interactive Charts**: Visual data representation with Recharts
- **Loading States**: Smooth user experience with loading indicators

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite with Prisma ORM
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Email**: Nodemailer
- **CSV Export**: csv-writer

## 📋 Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Codeforces API access (public, no authentication required)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd assignment-tle
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="file:./dev.db"
   CRON_SECRET="your-secret-key-here"

   # Email configuration (optional, for inactivity reminders)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="noreply@example.com"
   ```

4. **Set up the database**

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

The application uses the following database models:

- **Student**: Basic student information and ratings
- **Contest**: Contest participation and performance data
- **Problem**: Codeforces problems with ratings and tags
- **Submission**: Individual problem submissions
- **Reminder**: Email reminder history
- **SyncSettings**: Automated sync configuration

## 🔧 Configuration

### Email Setup (Optional)

To enable inactivity email reminders:

1. **Gmail Setup**:

   - Enable 2-factor authentication
   - Generate an App Password
   - Use the App Password in `SMTP_PASS`

2. **Other SMTP Providers**:
   - Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - Ensure SMTP credentials are correct

### Cron Job Setup

For production deployment, set up a cron job to call the sync endpoint:

```bash
# Example: Run every day at 2 AM
0 2 * * * curl -X POST https://your-domain.com/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret"
```

## 📱 Usage Guide

### Adding Students

1. Click "Add Student" on the main page
2. Fill in required fields:
   - Name
   - Email
   - Codeforces Handle
   - Phone Number (optional)
3. Click "Add Student"

### Managing Student Data

1. **View Details**: Click the eye icon to view detailed student profile
2. **Edit Student**: Click the edit icon to modify student information
3. **Delete Student**: Click the trash icon to remove a student
4. **Sync Data**: Use "Sync Data" button to fetch latest Codeforces data

### Student Profile Features

1. **Contest History**:

   - View rating changes over time
   - See contest performance and rankings
   - Filter by different time periods

2. **Problem Solving Data**:

   - Track solved problems and ratings
   - View submission statistics
   - Analyze problem-solving patterns

3. **Email Reminders**:
   - Toggle reminder system on/off
   - View reminder history
   - Monitor inactivity status

### Settings Management

1. **Access Settings**: Click "Settings" in the main header
2. **Configure Sync**:
   - Set sync frequency (hourly to daily)
   - Enable/disable automatic sync
   - Run manual sync
3. **Monitor Status**: View last sync time and next scheduled sync

## 🔒 Security Considerations

- **Cron Secret**: Use a strong secret for cron job authentication
- **Email Security**: Use App Passwords for email services
- **Database**: Ensure proper database access controls
- **Environment Variables**: Never commit sensitive data to version control

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables
3. **Database**: Use Vercel Postgres or external database
4. **Cron Jobs**: Set up Vercel Cron for automated sync

### Other Platforms

- **Railway**: Supports Node.js and PostgreSQL
- **Render**: Free tier available with PostgreSQL
- **Heroku**: Requires paid plan for cron jobs

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**:

   - Ensure DATABASE_URL is correct
   - Run `pnpm prisma db push` to sync schema

2. **Email Not Sending**:

   - Verify SMTP credentials
   - Check firewall/network restrictions
   - Use App Passwords for Gmail

3. **Codeforces API Errors**:

   - Verify handle exists and is public
   - Check API rate limits
   - Ensure network connectivity

4. **Cron Job Issues**:
   - Verify CRON_SECRET is set correctly
   - Check cron job syntax
   - Monitor application logs

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
```

## 📈 Performance Optimization

- **Database Indexing**: Prisma automatically creates indexes
- **Caching**: Consider Redis for frequently accessed data
- **Rate Limiting**: Respect Codeforces API limits
- **Batch Processing**: Process multiple students efficiently

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Codeforces**: For providing the public API
- **Next.js**: For the excellent React framework
- **Prisma**: For the powerful ORM
- **Tailwind CSS**: For the utility-first CSS framework
- **Recharts**: For the beautiful chart components

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

---

**Built with ❤️ for competitive programming education**
