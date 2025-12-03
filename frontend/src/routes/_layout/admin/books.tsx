import { createFileRoute } from "@tanstack/react-router"
import axios from "axios"
import { BookOpen, Plus, RefreshCw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { OpenAPI } from "@/client"
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
import { booksApi } from "@/services/booksApi"
import type { Book } from "@/types/book"

export const Route = createFileRoute("/_layout/admin/books")({
  component: () => (
    <ErrorBoundary>
      <AdminBooks />
    </ErrorBoundary>
  ),
})

function AdminBooks() {
  const [searchQuery, setSearchQuery] = useState("")
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await booksApi.getBooks({ limit: 100 })
      setBooks(response.items)
    } catch (error) {
      console.error("Failed to fetch books:", error)
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch books on mount
  useEffect(() => {
    fetchBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSync = async () => {
    try {
      setSyncing(true)

      // Get token
      const token = OpenAPI.TOKEN
      const tokenValue =
        typeof token === "function"
          ? await token({
              method: "POST",
              url: `${OpenAPI.BASE}/api/v1/books/sync`,
            })
          : token

      // Call sync endpoint
      await axios.post(
        `${OpenAPI.BASE}/api/v1/books/sync`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokenValue}`,
          },
        },
      )

      toast({
        title: "Sync Started",
        description:
          "Book synchronization has been queued. This may take a few moments.",
      })

      // Refresh books after a delay
      setTimeout(() => {
        fetchBooks()
      }, 3000)
    } catch (error) {
      console.error("Failed to sync books:", error)
      toast({
        title: "Error",
        description: "Failed to start book sync",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleAddBook = () => {
    toast({
      title: "Add Book",
      description: "Book creation feature coming soon!",
    })
  }

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.publisher_name.toLowerCase().includes(searchQuery.toLowerCase()),
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
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Books"}
          </Button>
          <Button
            onClick={handleAddBook}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Book
          </Button>
        </div>
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
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto text-teal-500 animate-spin mb-4" />
              <p className="text-muted-foreground">Loading books...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
                {searchQuery ? "No books found" : "No books yet"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Click 'Sync Books' to import books from Dream Central Storage"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  variant="outline"
                  className="border-teal-500 text-teal-600"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Syncing..." : "Sync Books Now"}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead className="text-center">Activities</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="text-sm">
                      {book.publisher_name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{book.activity_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {book.description || "No description"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
