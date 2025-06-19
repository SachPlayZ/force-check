"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Target,
  Clock,
  Award,
  Zap,
  RefreshCw,
  Mail,
  Bell,
  BellOff,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Student {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  codeforcesHandle: string;
  currentRating: number;
  maxRating: number;
  isActive: boolean;
  emailRemindersEnabled: boolean;
  lastDataSync?: string;
  contests: Contest[];
  submissions: Submission[];
  reminders: Reminder[];
  _count: {
    contests: number;
    submissions: number;
    reminders: number;
  };
}

interface Contest {
  id: string;
  contestId: number;
  name: string;
  startTime: string;
  rank?: number;
  ratingChange?: number;
  problemsSolved: number;
  problemsAttempted: number;
}

interface Submission {
  id: string;
  submissionId: number;
  problemId: string;
  verdict: string;
  language: string;
  submissionTime: string;
  executionTime?: number;
  memoryConsumed?: number;
  problem: {
    name: string;
    rating?: number;
    tags: string;
  };
}

interface Reminder {
  id: string;
  type: string;
  sentAt: string;
  emailContent: string;
}

export default function StudentProfile() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [contestFilter, setContestFilter] = useState(30); // days
  const [problemFilter, setProblemFilter] = useState(30); // days

  useEffect(() => {
    if (params.id) {
      fetchStudent();
    }
  }, [params.id]);

  const fetchStudent = async () => {
    try {
      const response = await fetch(`/api/students/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync/codeforces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: params.id, forceSync: true }),
      });

      if (response.ok) {
        fetchStudent();
        alert("Data sync completed successfully!");
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error syncing data:", error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleEmailReminders = async () => {
    if (!student) return;

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailRemindersEnabled: !student.emailRemindersEnabled,
        }),
      });

      if (response.ok) {
        fetchStudent();
      }
    } catch (error) {
      console.error("Error toggling email reminders:", error);
    }
  };

  const handleSendTestMail = async () => {
    if (!student) return;
    try {
      const response = await fetch(`/api/students/${student.id}/testmail`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        alert("Test email sent successfully!");
      } else {
        alert(data.error || "Failed to send test email.");
      }
    } catch (error) {
      alert("Failed to send test email.");
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 2400) return "text-red-600 dark:text-red-400";
    if (rating >= 2100) return "text-orange-600 dark:text-orange-400";
    if (rating >= 1900) return "text-purple-600 dark:text-purple-400";
    if (rating >= 1600) return "text-blue-600 dark:text-blue-400";
    if (rating >= 1400) return "text-cyan-600 dark:text-cyan-400";
    if (rating >= 1200) return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getRatingChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict === "OK") return "text-green-600 dark:text-green-400";
    if (verdict === "WRONG_ANSWER") return "text-red-600 dark:text-red-400";
    if (verdict === "TIME_LIMIT_EXCEEDED")
      return "text-yellow-600 dark:text-yellow-400";
    if (verdict === "MEMORY_LIMIT_EXCEEDED")
      return "text-orange-600 dark:text-orange-400";
    return "text-gray-600 dark:text-gray-400";
  };

  // Filter contests by date range
  const filteredContests =
    student?.contests.filter((contest) => {
      const contestDate = new Date(contest.startTime);
      const cutoffDate = subDays(new Date(), contestFilter);
      return contestDate >= cutoffDate;
    }) || [];

  // Filter submissions by date range
  const filteredSubmissions =
    student?.submissions.filter((submission) => {
      const submissionDate = new Date(submission.submissionTime);
      const cutoffDate = subDays(new Date(), problemFilter);
      return submissionDate >= cutoffDate;
    }) || [];

  // Calculate problem solving statistics
  const solvedProblems = filteredSubmissions.filter(
    (sub) => sub.verdict === "OK"
  );
  const uniqueSolvedProblems = [
    ...new Set(solvedProblems.map((sub) => sub.problemId)),
  ];
  const totalProblems = filteredSubmissions.length;
  const averageRating =
    solvedProblems.length > 0
      ? Math.round(
          solvedProblems.reduce(
            (sum, sub) => sum + (sub.problem.rating || 0),
            0
          ) / solvedProblems.length
        )
      : 0;
  const mostDifficultProblem =
    solvedProblems.length > 0
      ? solvedProblems.reduce((max, sub) =>
          (sub.problem.rating || 0) > (max.problem.rating || 0) ? sub : max
        )
      : null;
  const averageProblemsPerDay =
    problemFilter > 0 ? uniqueSolvedProblems.length / problemFilter : 0;

  // Prepare rating chart data
  const ratingChartData = filteredContests.map((contest) => ({
    date: format(new Date(contest.startTime), "MMM dd"),
    rating: contest.ratingChange || 0,
    contest: contest.name,
  }));

  // Prepare problem rating distribution
  const ratingBuckets = [800, 1200, 1400, 1600, 1900, 2100, 2400, 3000];
  const ratingDistribution = ratingBuckets.map((rating, index) => {
    const minRating = index === 0 ? 0 : ratingBuckets[index - 1];
    const maxRating = rating;
    const count = solvedProblems.filter((sub) => {
      const problemRating = sub.problem.rating || 0;
      return problemRating >= minRating && problemRating < maxRating;
    }).length;
    return {
      range: `${minRating}-${maxRating}`,
      count,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Student not found
          </h2>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {student.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {student.codeforcesHandle} • {student.email}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleEmailReminders}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  student.emailRemindersEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {student.emailRemindersEnabled ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Reminders On
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Reminders Off
                  </>
                )}
              </button>

              <button
                onClick={handleSendTestMail}
                className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test Mail
              </button>

              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync Data"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Current Rating
                    </dt>
                    <dd
                      className={`text-lg font-medium ${getRatingColor(
                        student.currentRating
                      )}`}
                    >
                      {student.currentRating}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Max Rating
                    </dt>
                    <dd
                      className={`text-lg font-medium ${getRatingColor(
                        student.maxRating
                      )}`}
                    >
                      {student.maxRating}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Contests
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {student._count.contests}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Submissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {student._count.submissions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contest History */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Contest History
                </h3>
                <select
                  value={contestFilter}
                  onChange={(e) => setContestFilter(Number(e.target.value))}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last 365 days</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {filteredContests.length > 0 ? (
                <>
                  {/* Rating Chart */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Rating Changes
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ratingChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="rating"
                            stroke="#3B82F6"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Contest List */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Recent Contests
                    </h4>
                    <div className="space-y-3">
                      {filteredContests.slice(0, 10).map((contest) => (
                        <div
                          key={contest.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {contest.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {format(
                                new Date(contest.startTime),
                                "MMM dd, yyyy"
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-medium ${getRatingChangeColor(
                                contest.ratingChange || 0
                              )}`}
                            >
                              {contest.ratingChange
                                ? (contest.ratingChange > 0 ? "+" : "") +
                                  contest.ratingChange
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Rank: {contest.rank || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {contest.problemsSolved}/
                              {contest.problemsAttempted} solved
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No contests found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No contests in the selected time period.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Problem Solving Data */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Problem Solving Data
                </h3>
                <select
                  value={problemFilter}
                  onChange={(e) => setProblemFilter(Number(e.target.value))}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {filteredSubmissions.length > 0 ? (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {uniqueSolvedProblems.length}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Problems Solved
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {averageRating}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Avg Rating
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {averageProblemsPerDay.toFixed(1)}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        Problems/Day
                      </div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {mostDifficultProblem?.problem.rating || 0}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        Hardest Solved
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution Chart */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Problems by Rating
                    </h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Submissions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Recent Submissions
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredSubmissions.slice(0, 10).map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {submission.problem.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {submission.problem.rating
                                ? `Rating: ${submission.problem.rating}`
                                : "No rating"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-medium ${getVerdictColor(
                                submission.verdict
                              )}`}
                            >
                              {submission.verdict}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {format(
                                new Date(submission.submissionTime),
                                "MMM dd"
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No submissions found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No submissions in the selected time period.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reminders Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Email Reminders ({student._count.reminders})
            </h3>
          </div>
          <div className="p-6">
            {student.reminders.length > 0 ? (
              <div className="space-y-3">
                {student.reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {reminder.type} Reminder
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(
                          new Date(reminder.sentAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {reminder.emailContent.substring(0, 50)}...
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No reminders sent
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No email reminders have been sent to this student.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
