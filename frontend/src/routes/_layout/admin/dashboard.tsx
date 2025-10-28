import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpen,
  Building,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Plus,
  School,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { adminDashboardData } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/admin/dashboard")({
  component: () => (
    <ErrorBoundary>
      <AdminDashboard />
    </ErrorBoundary>
  ),
})

function AdminDashboard() {
  const {
    stats,
    schools,
    publishers,
    teachers,
    activityFeed,
    userGrowth,
    activityByType,
  } = adminDashboardData

  const handleAddPublisher = () => {
    toast({
      title: "Add Publisher",
      description: "Publisher creation feature coming soon!",
    })
  }

  const handleAddSchool = () => {
    toast({
      title: "Add School",
      description: "School creation feature coming soon!",
    })
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          System overview and recent activity
        </p>
      </div>

      {/* Stats Cards - Comprehensive Overview */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          System Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Users"
            value={stats.totalUsers}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Publishers"
            value={stats.totalPublishers}
          />
          <StatCard
            icon={<UserCheck className="w-6 h-6" />}
            label="Teachers"
            value={stats.totalTeachers}
          />
          <StatCard
            icon={<GraduationCap className="w-6 h-6" />}
            label="Students"
            value={stats.totalStudents}
          />
        </div>
      </div>

      {/* Secondary Stats */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Content & Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={<School className="w-6 h-6" />}
            label="Active Schools"
            value={stats.activeSchools}
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Books"
            value={stats.totalBooks}
          />
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Total Assignments"
            value={stats.totalAssignments}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAddPublisher}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Publisher
            </Button>
            <Button
              onClick={handleAddSchool}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
            >
              <Building className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">User Growth</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#14B8A6"
                  strokeWidth={3}
                  dot={{ fill: "#14B8A6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity by Type Chart */}
        <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="text-xl">Activity by Type</CardTitle>
            <p className="text-sm text-muted-foreground">Current statistics</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityByType}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#06B6D4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Schools Overview */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <School className="w-5 h-5 text-teal-500" />
                Schools Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Active schools in the system
              </p>
            </div>
            <Button
              onClick={handleAddSchool}
              size="sm"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Teachers</TableHead>
                <TableHead className="text-center">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="text-sm">{school.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{school.teacherCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{school.studentCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Publishers Overview */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-500" />
                Publishers Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Content publishers in the system
              </p>
            </div>
            <Button
              onClick={handleAddPublisher}
              size="sm"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Publisher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Publisher Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Books</TableHead>
                <TableHead className="text-center">Schools Served</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishers.map((publisher) => (
                <TableRow key={publisher.id}>
                  <TableCell className="font-medium">
                    {publisher.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="text-sm">{publisher.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{publisher.booksPublished}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{publisher.schoolsServed}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(publisher.joinedDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Teachers Overview */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-500" />
            Top Teachers
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Most active teachers in the system
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-center">Classes</TableHead>
                <TableHead className="text-center">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="text-sm">{teacher.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{teacher.school}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{teacher.classCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{teacher.studentCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl">Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest actions across the platform
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityFeed.map((activity) => (
              <ActivityFeedItem
                key={activity.id}
                user={activity.user}
                avatar={activity.avatar}
                action={activity.action}
                timestamp={activity.timestamp}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
