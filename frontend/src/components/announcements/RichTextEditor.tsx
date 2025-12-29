/**
 * Rich Text Editor Component using Tiptap
 * Story 26.1: Teacher Announcement Creation & Management
 */

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import CharacterCount from "@tiptap/extension-character-count"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Underline as UnderlineIcon,
  Strikethrough,
  Smile,
  Code,
} from "lucide-react"
import { useState, useCallback } from "react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

// Common emojis for quick access
const EMOJI_LIST = [
  "😊", "👍", "❤️", "🎉", "✅", "⚠️", "📢", "📚", "✏️", "📝",
  "🌟", "💡", "🎯", "🏆", "🔔", "📅", "⏰", "✨", "👏", "🙌",
  "📖", "🎓", "💯", "🚀", "🎨", "🔥", "💪", "🤔", "😃", "😄",
]

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your announcement...",
  className = "",
}: RichTextEditorProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  // Track editor state changes to force toolbar re-renders
  const [, setEditorState] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      // Force toolbar re-render on content change
      setEditorState((prev) => prev + 1)
    },
    onSelectionUpdate: () => {
      // Force toolbar re-render on selection change (for active states)
      setEditorState((prev) => prev + 1)
    },
    onTransaction: () => {
      // Force toolbar re-render on any transaction
      setEditorState((prev) => prev + 1)
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] max-h-[400px] overflow-y-auto p-4 border border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-ring [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
      },
    },
  })

  const insertEmoji = useCallback((emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run()
      setEmojiPickerOpen(false)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  // Get character count
  const characterCount = editor.storage.characterCount?.characters?.() ?? editor.getText().length

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-3 border rounded-t-md bg-slate-50 dark:bg-slate-900">
        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Emoji Picker */}
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Insert Emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:bg-accent rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Character count */}
      <div className="text-xs text-muted-foreground p-2 border border-t-0 rounded-b-md">
        {characterCount} characters
      </div>
    </div>
  )
}
