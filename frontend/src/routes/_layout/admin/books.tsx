import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Plus, Search } from "lucide-react"
import { useState } from "react"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { mockBooks } from "@/lib/mockData"

export const Route = createFileRoute("/_layout/admin/books")({
  component: () => (
    <ErrorBoundary>
      <AdminBooks />
    </ErrorBoundary>
  ),
})

function AdminBooks() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleAddBook = () => {
    toast({
      title: "Add Book",
      description: "Book creation feature coming soon!",
    })
  }

  const filteredBooks = mockBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.grade.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Books</h1>
          <p className="text-muted-foreground">
            Manage educational books in the system
          </p>
        </div>
        <Button
          onClick={handleAddBook}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search books by title, publisher, or grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Books Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" />
            All Books ({filteredBooks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Publisher</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center">Activities</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell className="text-sm">{book.publisher}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{book.grade}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{book.activityCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {book.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
